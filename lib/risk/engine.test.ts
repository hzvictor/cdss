import { describe, expect, it } from "vitest";
import { evaluate } from "./engine";
import { RULE_VERSION } from "./rules";

describe("risk engine — high risk", () => {
  it("identifies dyspnea as high risk", () => {
    const r = evaluate("我最近呼吸困难，胸闷得厉害");
    expect(r.riskLevel).toBe("high");
    expect(r.shouldContactTeam).toBe(true);
    expect(r.hits.find((h) => h.ruleId === "RES-001")).toBeDefined();
  });

  it("identifies high fever as high risk", () => {
    const r = evaluate("化疗后高烧到 39 度");
    expect(r.riskLevel).toBe("high");
    expect(r.hits.some((h) => h.severity === "high")).toBe(true);
  });

  it("uppercases the highest severity when multiple rules hit", () => {
    const r = evaluate("我有点疲劳，而且胸痛");
    expect(r.riskLevel).toBe("high");
    expect(r.hits.length).toBeGreaterThanOrEqual(2);
  });
});

describe("risk engine — medium risk", () => {
  it("identifies persistent vomiting as medium", () => {
    const r = evaluate("这两天持续呕吐，水都喝不下");
    expect(r.riskLevel).toBe("medium");
    expect(r.shouldContactTeam).toBe(true);
  });

  it("identifies neuropathy as medium", () => {
    const r = evaluate("化疗后手足麻木一直不缓解");
    expect(r.riskLevel).toBe("medium");
  });
});

describe("risk engine — low risk", () => {
  it("identifies hair loss as low", () => {
    const r = evaluate("最近脱发明显");
    expect(r.riskLevel).toBe("low");
    expect(r.shouldContactTeam).toBe(false);
  });

  it("returns low when no keywords match", () => {
    const r = evaluate("今天天气不错");
    expect(r.riskLevel).toBe("low");
    expect(r.hits).toHaveLength(0);
  });
});

describe("risk engine — audit fields", () => {
  it("attaches current version to every hit", () => {
    const r = evaluate("剧烈头痛，视物模糊");
    expect(r.ruleVersion).toBe(RULE_VERSION);
    for (const hit of r.hits) {
      expect(hit.ruleVersion).toBe(RULE_VERSION);
      expect(hit.matchedKeywords.length).toBeGreaterThan(0);
      expect(hit.matchedText.length).toBeGreaterThan(0);
    }
  });

  it("collects multiple matched keywords on the same rule once", () => {
    const r = evaluate("脱发严重，掉头发，头发掉得厉害");
    const hairRule = r.hits.find((h) => h.ruleId === "DER-007");
    expect(hairRule).toBeDefined();
    expect(hairRule?.matchedKeywords.length).toBeGreaterThan(1);
  });
});
