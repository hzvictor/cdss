export type RiskLevel = "high" | "medium" | "low";

export type RuleHit = {
  ruleId: string;
  ruleVersion: string;
  ruleName: string;
  severity: RiskLevel;
  matchedKeywords: string[];
  matchedText: string;
  adviceTemplate: string;
};

export type RiskEvaluation = {
  riskLevel: RiskLevel;
  shouldContactTeam: boolean;
  hits: RuleHit[];
  ruleVersion: string;
};
