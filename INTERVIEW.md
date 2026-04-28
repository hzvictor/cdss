# 乳腺癌副作用评估 Agent · 系统设计

> 面试 take-home 项目。在线 demo: https://cdss-eight.vercel.app · 仓库: https://github.com/hzvictor/cdss

---

## 1. 系统架构图

```
┌────────────────────────────────────────────────────────────────────┐
│                       Next.js 16 App Router                         │
│                                                                     │
│  /assess        /assess/[id]      /history       /admin/*          │
│  输入页          结果页            历史页          管理后台          │
│  (RSC + CC)     (RSC + CC)        (RSC)          (RSC, admin gate) │
└──────┬──────────────┬─────────────────┬─────────────┬──────────────┘
       │              │                 │             │
       ▼              ▼                 ▼             ▼
┌────────────────────────────────────────────────────────────────────┐
│                        API Route Handlers                           │
│  POST /api/assessment       — 提交评估                              │
│  GET  /api/assessment/[id]  — 获取结果                              │
│  GET  /api/assessments      — 历史列表                              │
│  POST /api/contact-request  — 创建协同请求                          │
│  POST /api/events           — 客户端打点                            │
└──────────────────────┬─────────────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Agent Orchestrator                             │
│  lib/agent/orchestrator.ts                                          │
│                                                                     │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌────────────────┐  │
│   │ 感知    │──▶│ 决策    │──▶│ 执行    │──▶│ 学习            │  │
│   │ Perceive│    │ Decide  │    │ Execute │    │ Learn           │  │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────────┬───────┘  │
│        │              │              │                  │           │
│   AI SDK v6      规则引擎       事务写入 +          反馈闭环       │
│   structured     纯函数         降级容错             event_log     │
│   output         可单测         + 自动建议                         │
└────────┬──────────────┬──────────────┬──────────────────┬──────────┘
         ▼              ▼              ▼                  ▼
   ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌──────────────┐
   │ Vercel   │  │ Rule     │  │  Postgres    │  │ event_log    │
   │ AI       │  │ Engine   │  │  (Neon       │  │ + OTel       │
   │ Gateway  │  │ rules/v1 │  │  Serverless) │  │ (双写)        │
   │ (OIDC)   │  │ + DB 同步│  │  Drizzle ORM │  │              │
   └──────────┘  └──────────┘  └──────────────┘  └──────────────┘
```

### 数据流（一次评估的全程，9 步）

```
①  用户在 /assess 输入文本                        → 触发 assessment_started (client)
②  POST /api/assessment                            → 服务端 logEvent assessment_started
③  Orchestrator.perceive()                         → AI SDK v6 generateText + Output.object
                                                      LLM 失败 → 降级空数组（不阻塞）
④  Orchestrator.decide() = ruleEngine.evaluate()  → 纯函数关键词匹配 → RuleHit[] + 风险等级
⑤  Orchestrator.summarize()                        → LLM 生成关心语气一句话
                                                      LLM 失败 → 降级模板
⑥  DB 事务：assessment + evidence + advice         → 一致性保证
   高风险时自动 contact_request status=suggested
⑦  服务端 logEvent assessment_submitted            → event_log
⑧  前端跳转 /assess/[id]                           → result_viewed (client, useRef 去重)
⑨  用户操作：
    点"联系团队"  → POST /api/contact-request → contact_team_clicked (server)
    页面关闭    → navigator.sendBeacon /api/events → assessment_closed
```

### 数据库（6 张表，对齐题目要求）

| 表 | 职责 | 关键字段 |
|---|---|---|
| `Assessment` | 评估主表 | riskLevel, summary, shouldContactTeam, **ruleVersion**, **modelId**, **modelVersion**, createdAt |
| `Advice` | 建议明细（一对多） | type(immediate_care/contact_team/monitor/record), priority |
| `Evidence` | 命中规则记录（审计核心） | ruleId, **ruleVersion**, matchedKeywords, matchedText, severity, source(rule/llm) |
| `RuleSource` | 规则字典 | (id, version) 复合主键，永久保留历史版本 |
| `ContactRequest` | 协同请求 | channel(team/emergency), status(suggested/created/accepted/closed) |
| `EventLog` | 可观测性 | eventName, payload(json), userId, ipHash(隐私) |

**审计三件套**（题目硬性要求）落在 `assessment.ruleVersion + modelId + modelVersion + createdAt` 和 `evidence.ruleId + ruleVersion`。结果页 `🔍 审计信息` 区块直接展示。

---

## 2. 感知-决策-执行-学习 闭环

### 感知 Perceive — `lib/agent/perceive.ts`

| 项 | 实现 |
|---|---|
| **目标** | 将自由文本规整为结构化症状关键词列表，提高规则引擎召回率 |
| **技术** | AI SDK v6 · `generateText({ output: Output.object({ schema }) })` + Zod schema 校验 |
| **模型** | `mistral/mistral-small`（轻量、便宜，适合抽取） |
| **降级** | LLM 失败/超时 → 返回空数组，规则引擎仍可在原文上跑 |
| **隐私** | 不在 prompt 中混入用户身份信息，只把症状描述传给 LLM |

### 决策 Decide — `lib/risk/engine.ts` + `lib/risk/rules/v1.ts`

| 项 | 实现 |
|---|---|
| **目标** | 从输入文本得到风险等级（high/medium/low）+ 命中规则列表 |
| **技术** | TypeScript **纯函数**，无副作用，可单测可复现 |
| **规则形式** | 版本化 TS 数组（`RULES_V1`），同步进 `RuleSource` 表（`pnpm db:seed`） |
| **聚合策略** | 多规则命中时取最高严重度 |
| **可演进性** | 升级到 `RULES_V2` 时，`v1` 规则继续保留在 DB，老评估永远能查到当时依据 |
| **测试覆盖** | 9 个 vitest 单测覆盖三层 + 多规则聚合 + 关键词去重（`pnpm test:unit`） |

> 把"决策"做成纯函数，是这套方案的**关键设计选择**：医学顾问可 review 规则字典；规则引擎和 LLM 解耦，LLM 挂掉系统仍可用；规则迭代可灰度（v1/v2 并存）。

### 执行 Execute — `lib/agent/orchestrator.ts`

| 项 | 实现 |
|---|---|
| **持久化** | Drizzle 事务：`assessment + evidence + advice + contact_request` 一次提交 |
| **LLM 总结** | `summarize()` 用 Kimi K2.5 生成温和语气一句话；失败降级到 `FALLBACK_BY_RISK` 模板 |
| **自动协同** | 风险=high 时自动插入 `contactRequest{status: suggested}`，UI 可一键升级为 `created` |
| **审计写入** | `ruleVersion / modelId / modelVersion` 与本次评估永久绑定 |

### 学习 Learn — `lib/telemetry/*` + `event_log`

5 个题目要求事件 + 完整链路：

| 事件 | 触发位置 | 实现 |
|---|---|---|
| `assessment_started` | 服务端 + 客户端 | 进入输入页 + API 收到请求 |
| `assessment_submitted` | 服务端 | DB 事务提交后 |
| `result_viewed` | 客户端 | `useRef` 防 strict mode 双触发 |
| `contact_team_clicked` | 服务端 | 通过 contact-request API 间接落库 |
| `assessment_closed` | 客户端 | `pagehide` + `navigator.sendBeacon`，浏览器关闭也送达 |

**学习闭环的体现**：
- 短期：所有行为入 `event_log`，admin 后台 `/admin/events` 可视化
- 中期：高风险案例的转化漏斗（started→submitted→viewed→clicked）可统计
- 长期：根据 evidence 命中频率与人工反馈，规则字典升级到 v2，老记录永久保留 v1 关联

---

## 3. 为什么这样设计（关键 Trade-off）

| 决策 | 选择 | 理由 |
|---|---|---|
| 规则 vs LLM | **规则为主，LLM 增强** | 医疗场景**可解释性 > 智能**。规则 100% 可审计，LLM 提供语义抽取与人话翻译 |
| LLM 调用失败 | **全链路降级** | 任意 LLM 失败都能回退到纯规则结果，可用性 > 答案质量 |
| 规则存储 | **TS 文件 + DB 同步** | TS 文件作为"代码即真相"，DB 用于审计追溯和 admin 后台展示 |
| 规则版本 | **永久保留旧版本** | 评估永久绑定 `(ruleId, ruleVersion)`，规则升级不影响历史可追溯 |
| 隐私 | **payload 只存 ID，不存原文** | event_log 不包含症状文本；IP 只存 sha256 hash |
| 鉴权 | **guest 自动登录 + admin email 白名单** | 患者场景对注册不友好；admin 用 env var 控制 |
| 后台只读 | **admin 不可改数据** | 防止误操作污染审计链 |

---

## 4. 技术栈

| 层 | 技术 |
|---|---|
| 框架 | Next.js 16 (App Router) + React 19 |
| 语言 | TypeScript 5.8（全栈） |
| 数据库 | Neon Serverless Postgres + Drizzle ORM |
| AI | Vercel AI Gateway (OIDC) + Kimi K2.5 / Mistral Small |
| 鉴权 | Auth.js v5 (NextAuth) |
| UI | shadcn/ui + Tailwind v4 |
| 单测 | Vitest |
| e2e | Playwright |
| 部署 | Vercel + Vercel Blob + Upstash Redis |
| 可观测性 | event_log 表 + OpenTelemetry (`@vercel/otel`) |

---

## 5. 本地运行

```bash
pnpm install
pnpm db:migrate          # 应用 schema
pnpm db:seed             # 写入 v1 规则
pnpm test:unit           # 9 个规则引擎单测
pnpm test:e2e            # Playwright 端到端
pnpm dev                 # http://localhost:3000
```

需要 `.env.local` 的关键变量：`POSTGRES_URL` / `BLOB_READ_WRITE_TOKEN` / `REDIS_URL` / `AUTH_SECRET` / `VERCEL_OIDC_TOKEN`（或 `AI_GATEWAY_API_KEY`） / `ADMIN_EMAILS`。

---

## 6. 后续可扩展方向

1. **规则编辑器**：admin 后台可视化新增/禁用规则，自动 bump version
2. **多模态**：支持上传化验单图片，OCR + LLM 抽数值（潜在已有的 Vercel Blob 上传）
3. **流式 Agent 思考链**：SSE 把 perceive→decide→execute 各阶段推到前端实时展示（"产品交互界面" 加分项）
4. **规则反馈机制**：在 `result_viewed` 后加 👍/👎，统计规则准确率
5. **预警通道**：高风险评估真接入企业微信/钉钉机器人通知
