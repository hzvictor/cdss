import "server-only";

import { generateText } from "ai";
import type { RiskEvaluation } from "@/lib/risk/types";

const SUMMARIZE_MODEL = "moonshotai/kimi-k2.5";

const FALLBACK_BY_RISK = {
  high: "您的描述提示存在高风险症状，建议立即线下就医或在 24 小时内联系医疗团队。",
  medium: "您的描述提示存在中等风险症状，建议联系医疗团队或密切观察。",
  low: "目前症状未触发高/中风险规则，建议继续观察并记录变化。",
} as const;

/**
 * 用 LLM 把规则结果翻译成关心语气的一句话总结。
 * LLM 不可用时降级到模板。
 */
export async function summarize(
  input: string,
  evaluation: RiskEvaluation
): Promise<{ summary: string; modelId: string; modelVersion: string }> {
  const fallback = FALLBACK_BY_RISK[evaluation.riskLevel];

  if (evaluation.hits.length === 0 && evaluation.riskLevel === "low") {
    return { summary: fallback, modelId: "rule-only", modelVersion: "v1" };
  }

  const ruleSummary = evaluation.hits
    .map((h) => `${h.ruleName}（${h.severity}）`)
    .join("、");

  try {
    const { text } = await generateText({
      model: SUMMARIZE_MODEL,
      prompt: `你是一位有耐心的乳腺癌副作用咨询助手。请根据下面信息，用一句温和、关心、不超过 60 字的中文回应患者，明确告知风险等级与下一步动作。不要使用医学术语堆砌，不要添加免责声明。

患者描述：${input}

命中规则：${ruleSummary || "无明确高/中风险规则"}
风险等级：${evaluation.riskLevel}
是否建议联系团队：${evaluation.shouldContactTeam ? "是" : "否"}`,
    });
    return {
      summary: text.trim() || fallback,
      modelId: SUMMARIZE_MODEL,
      modelVersion: "live",
    };
  } catch {
    return { summary: fallback, modelId: "rule-only", modelVersion: "v1" };
  }
}

export const SUMMARIZE_MODEL_ID = SUMMARIZE_MODEL;
