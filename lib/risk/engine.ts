import { CURRENT_RULES, RULE_VERSION, type RuleDef } from "./rules";
import type { RiskEvaluation, RiskLevel, RuleHit } from "./types";

const SEVERITY_RANK: Record<RiskLevel, number> = { low: 1, medium: 2, high: 3 };

function findMatch(
  normalized: string,
  original: string,
  keyword: string
): string | null {
  // Strip all whitespace + lowercase the keyword to align with `normalized`.
  const k = keyword.toLowerCase().replace(/\s+/g, "");
  const idx = normalized.indexOf(k);
  if (idx === -1) return null;
  // Map index back to original string approximately (use ratio heuristic).
  // For excerpt purposes this is good enough — we want a window of context.
  const ratio = original.length / Math.max(normalized.length, 1);
  const oIdx = Math.round(idx * ratio);
  const start = Math.max(0, oIdx - 12);
  const end = Math.min(original.length, oIdx + keyword.length + 12);
  return original.slice(start, end);
}

export function evaluate(input: string): RiskEvaluation {
  // Normalize: strip all whitespace + lowercase. Chinese has no word boundaries
  // so users freely mix "39 度" / "39度" / "39度". A pure substring match must
  // be whitespace-insensitive or it under-recalls aggressively.
  const normalized = input.toLowerCase().replace(/\s+/g, "");
  const hits: RuleHit[] = [];

  for (const rule of CURRENT_RULES) {
    const matchedKeywords: string[] = [];
    let matchedText = "";

    for (const keyword of rule.keywords) {
      const ctx = findMatch(normalized, input, keyword);
      if (ctx) {
        matchedKeywords.push(keyword);
        if (!matchedText) matchedText = ctx;
      }
    }

    if (matchedKeywords.length > 0) {
      hits.push({
        ruleId: rule.id,
        ruleVersion: RULE_VERSION,
        ruleName: rule.name,
        severity: rule.severity,
        matchedKeywords,
        matchedText,
        adviceTemplate: rule.adviceTemplate,
      });
    }
  }

  const riskLevel = aggregateRisk(hits);
  return {
    riskLevel,
    shouldContactTeam: riskLevel !== "low",
    hits,
    ruleVersion: RULE_VERSION,
  };
}

function aggregateRisk(hits: RuleHit[]): RiskLevel {
  if (hits.length === 0) return "low";
  return hits.reduce<RiskLevel>(
    (acc, hit) =>
      SEVERITY_RANK[hit.severity] > SEVERITY_RANK[acc] ? hit.severity : acc,
    "low"
  );
}

export function getActiveRules(): readonly RuleDef[] {
  return CURRENT_RULES;
}
