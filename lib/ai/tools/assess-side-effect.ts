import { eq } from "drizzle-orm";
import type { Session } from "next-auth";
import { tool } from "ai";
import { z } from "zod";
import { runAssessment } from "@/lib/agent/orchestrator";
import { db } from "@/lib/db/client";
import { advice, assessment, evidence } from "@/lib/db/schema";
import { getActiveRules } from "@/lib/risk/engine";

type Props = {
  session: Session;
};

/**
 * Tool: assess a breast-cancer treatment side effect described by the user.
 *
 * The model should call this whenever the user describes physical symptoms
 * (fever, pain, vomiting, etc.) so we can trigger the rule engine + LLM
 * pipeline and stream a structured assessment back as a card.
 */
export const assessSideEffect = ({ session }: Props) =>
  tool({
    description:
      "评估乳腺癌治疗期间的副作用。当用户描述具体的身体症状（如发热、呕吐、疼痛、皮疹、出血、麻木等）时，必须调用此 tool。Tool 会运行规则引擎 + LLM 抽取，给出风险等级、建议、命中规则等结构化结果。**不要**在用户只是聊天或问问题时调用。",
    inputSchema: z.object({
      description: z
        .string()
        .min(2)
        .max(4000)
        .describe(
          "用户对副作用症状的完整中文描述。请直接传入用户原文，不要总结或改写。"
        ),
    }),
    execute: async ({ description }) => {
      if (!session.user?.id) {
        return { error: "unauthorized" } as const;
      }

      const { assessmentId } = await runAssessment({
        userId: session.user.id,
        inputText: description,
      });

      const [a] = await db
        .select()
        .from(assessment)
        .where(eq(assessment.id, assessmentId));

      const [adviceRows, evidenceRows] = await Promise.all([
        db.select().from(advice).where(eq(advice.assessmentId, assessmentId)),
        db
          .select()
          .from(evidence)
          .where(eq(evidence.assessmentId, assessmentId)),
      ]);

      return {
        assessment: a,
        advice: adviceRows.sort((x, y) => x.priority - y.priority),
        evidence: evidenceRows,
        totalRulesChecked: getActiveRules().length,
      };
    },
  });
