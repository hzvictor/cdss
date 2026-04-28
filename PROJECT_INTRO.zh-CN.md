# 乳腺癌副作用评估 CDSS

这是一个最小可运行的乳腺癌副作用评估原型。用户输入症状描述后，系统会返回风险等级、下一步建议、是否建议联系医疗团队，以及命中的规则依据。

项目已实现输入页、结果页、历史记录页、后台查看页，以及提交评估、获取结果、获取历史、创建协同请求和事件埋点接口。风险判断以规则引擎为主，LLM 只用于症状抽取和结果摘要，避免医疗场景完全依赖黑盒模型。

数据层包含 `Assessment`、`Advice`、`Evidence`、`RuleSource`、`ContactRequest`、`EventLog`，每次结果都能看到命中规则、生成时间和版本号，满足基本审计要求。

当前完成度：面试题核心要求基本完成，可以作为 take-home demo 提交。已通过规则引擎单测和 TypeScript 检查；完整生产化还需要补充临床规则审校、真实团队通知、权限收紧和更完整的 e2e 验证。

本地运行：

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

主要页面：

- `/assess`：提交副作用描述
- `/assess/[id]`：查看评估结果
- `/history`：查看历史记录
- `/admin/assessments`：查看后台数据
