import "server-only";

import { db } from "@/lib/db/client";
import {
  advice,
  assessment,
  contactRequest,
  evidence,
} from "@/lib/db/schema";
import { evaluate } from "@/lib/risk/engine";
import type { RiskLevel } from "@/lib/risk/types";
import { logEventServer } from "@/lib/telemetry/server";
import { perceive } from "./perceive";
import { summarize } from "./summarize";

type RunInput = {
  userId: string;
  inputText: string;
};

type RunResult = {
  assessmentId: string;
  riskLevel: RiskLevel;
  shouldContactTeam: boolean;
};

/**
 * 完整的 Agent 闭环：感知 → 决策 → 执行（持久化 + 反馈）。
 * 学习环节由 event_log 在调用方完成（前端打点 + 服务端打点）。
 */
export async function runAssessment({
  userId,
  inputText,
}: RunInput): Promise<RunResult> {
  const startedAt = Date.now();

  await logEventServer({
    name: "assessment_started",
    payload: { hasInput: inputText.trim().length > 0, inputLength: inputText.length },
    userId,
  });

  // 1. 感知（LLM 抽取症状；失败降级为空数组，不阻塞流程）
  const { symptoms } = await perceive(inputText);

  // 2. 决策（纯函数规则引擎；同时输入原文 + LLM 抽取的症状关键词，提高召回率）
  const expanded = symptoms.length
    ? `${inputText}\n${symptoms.join(" ")}`
    : inputText;
  const evaluation = evaluate(expanded);

  // 3. 总结（LLM 生成关心语气的一句话；失败降级为模板）
  const { summary, modelId, modelVersion } = await summarize(
    inputText,
    evaluation
  );

  // 4. 执行（事务写入 assessment + evidence + advice + contact_request）
  const assessmentId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(assessment)
      .values({
        userId,
        inputText,
        riskLevel: evaluation.riskLevel,
        summary,
        shouldContactTeam: evaluation.shouldContactTeam,
        ruleVersion: evaluation.ruleVersion,
        modelId,
        modelVersion,
      })
      .returning({ id: assessment.id });

    if (evaluation.hits.length > 0) {
      await tx.insert(evidence).values(
        evaluation.hits.map((h) => ({
          assessmentId: row.id,
          ruleId: h.ruleId,
          ruleVersion: h.ruleVersion,
          matchedText: h.matchedText,
          matchedKeywords: h.matchedKeywords,
          severity: h.severity,
          source: "rule" as const,
        }))
      );
    }

    await tx.insert(advice).values(buildAdvice(row.id, evaluation));

    if (evaluation.riskLevel === "high") {
      await tx.insert(contactRequest).values({
        assessmentId: row.id,
        userId,
        channel: "team",
        status: "suggested",
      });
    }

    return row.id;
  });

  await logEventServer({
    name: "assessment_submitted",
    payload: {
      assessmentId,
      riskLevel: evaluation.riskLevel,
      durationMs: Date.now() - startedAt,
    },
    userId,
    assessmentId,
  });

  return {
    assessmentId,
    riskLevel: evaluation.riskLevel,
    shouldContactTeam: evaluation.shouldContactTeam,
  };
}

function buildAdvice(
  assessmentId: string,
  evaluation: ReturnType<typeof evaluate>
) {
  const rows: {
    assessmentId: string;
    type: "immediate_care" | "contact_team" | "monitor" | "record";
    title: string;
    description: string;
    priority: number;
  }[] = [];

  if (evaluation.riskLevel === "high") {
    rows.push({
      assessmentId,
      type: "immediate_care",
      title: "立即就医",
      description: "高风险症状，请立即前往最近的急诊科或拨打 120。",
      priority: 0,
    });
    rows.push({
      assessmentId,
      type: "contact_team",
      title: "24 小时内联系医疗团队",
      description: "向您的主治医生或责任护士说明当前症状与发生时间。",
      priority: 1,
    });
  } else if (evaluation.riskLevel === "medium") {
    rows.push({
      assessmentId,
      type: "contact_team",
      title: "联系医疗团队",
      description: "建议在 24-48 小时内与医疗团队沟通处置方案。",
      priority: 0,
    });
    rows.push({
      assessmentId,
      type: "monitor",
      title: "密切观察",
      description: "记录症状频率、强度与触发因素，为团队评估提供依据。",
      priority: 1,
    });
  } else {
    rows.push({
      assessmentId,
      type: "monitor",
      title: "继续观察",
      description: "目前症状暂未触发高/中风险规则，可继续记录并随访。",
      priority: 0,
    });
    rows.push({
      assessmentId,
      type: "record",
      title: "记录变化",
      description: "如症状加重或出现新症状，请重新进行评估。",
      priority: 1,
    });
  }

  // 把命中规则的 adviceTemplate 作为补充建议
  evaluation.hits.slice(0, 3).forEach((hit, i) => {
    rows.push({
      assessmentId,
      type: "monitor",
      title: hit.ruleName,
      description: hit.adviceTemplate,
      priority: 10 + i,
    });
  });

  return rows;
}
