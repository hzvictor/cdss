import "server-only";

import { generateText, Output } from "ai";
import { z } from "zod";

const PERCEIVE_MODEL = "mistral/mistral-small";

const Schema = z.object({
  symptoms: z
    .array(z.string().min(1).max(20))
    .max(20)
    .describe("从描述中提取的症状关键词，每项 2-6 字中文"),
});

/**
 * 感知阶段：用 LLM 把自由文本规整成结构化症状关键词列表。
 * 失败时降级返回空数组——下游规则引擎仍可对原文做关键词匹配。
 */
export async function perceive(input: string): Promise<{ symptoms: string[] }> {
  if (!input.trim()) return { symptoms: [] };

  try {
    const result = await generateText({
      model: PERCEIVE_MODEL,
      output: Output.object({ schema: Schema }),
      prompt: `从以下乳腺癌患者副作用描述中，提取症状关键词列表。每个关键词 2-6 个汉字，不要重复。\n\n描述：\n${input}`,
    });
    return result.output ?? { symptoms: [] };
  } catch {
    return { symptoms: [] };
  }
}

export const PERCEIVE_MODEL_ID = PERCEIVE_MODEL;
