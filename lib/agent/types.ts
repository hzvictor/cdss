import type { RiskEvaluation } from "@/lib/risk/types";

export type AgentState =
  | { phase: "perceive"; input: string }
  | { phase: "decide"; symptoms: string[]; input: string }
  | { phase: "execute"; evaluation: RiskEvaluation }
  | { phase: "done"; assessmentId: string };

export type AgentTrace = {
  symptoms: string[];
  evaluation: RiskEvaluation;
  summary: string;
  modelId: string;
  modelVersion: string;
};
