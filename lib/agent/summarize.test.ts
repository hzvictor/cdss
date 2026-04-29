import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RiskEvaluation } from "@/lib/risk/types";

const state = vi.hoisted(() => ({
  generateTextImpl: async (_args: unknown) => ({ text: "ok" }),
}));

vi.mock("server-only", () => ({}));

vi.mock("ai", () => ({
  generateText: (args: unknown) => state.generateTextImpl(args),
}));

const { summarize } = await import("./summarize");

beforeEach(() => {
  state.generateTextImpl = async () => ({ text: "ok" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const evHigh: RiskEvaluation = {
  riskLevel: "high",
  shouldContactTeam: true,
  ruleVersion: "v2",
  hits: [
    {
      ruleId: "HEM-001",
      ruleVersion: "v2",
      ruleName: "粒缺伴发热",
      severity: "high",
      matchedKeywords: ["发热"],
      matchedText: "发热",
      adviceTemplate: "立即就医",
    },
  ],
};

const evLowEmpty: RiskEvaluation = {
  riskLevel: "low",
  shouldContactTeam: false,
  ruleVersion: "v2",
  hits: [],
};

const evLowWithHit: RiskEvaluation = {
  riskLevel: "low",
  shouldContactTeam: false,
  ruleVersion: "v2",
  hits: [
    {
      ruleId: "DER-007",
      ruleVersion: "v2",
      ruleName: "脱发",
      severity: "low",
      matchedKeywords: ["脱发"],
      matchedText: "脱发",
      adviceTemplate: "继续观察",
    },
  ],
};

describe("summarize — low-risk no-hit shortcut", () => {
  it("skips the LLM and returns rule-only fallback", async () => {
    let called = 0;
    state.generateTextImpl = async () => {
      called++;
      return { text: "should not be called" };
    };

    const r = await summarize("天气真好", evLowEmpty);

    expect(called).toBe(0);
    expect(r.modelId).toBe("rule-only");
    expect(r.modelVersion).toBe("v1");
    expect(r.summary).toContain("继续观察");
  });
});

describe("summarize — happy path", () => {
  it("uses LLM output when text is non-empty", async () => {
    state.generateTextImpl = async () => ({ text: "请立即就医，注意补水。" });
    const r = await summarize("发烧 39 度", evHigh);
    expect(r.summary).toBe("请立即就医，注意补水。");
    expect(r.modelId).toBe("moonshotai/kimi-k2.5");
    expect(r.modelVersion).toBe("live");
  });

  it("calls LLM for low-risk if hits exist (escalation channel)", async () => {
    let called = 0;
    state.generateTextImpl = async () => {
      called++;
      return { text: "继续观察并记录变化。" };
    };
    const r = await summarize("脱发", evLowWithHit);
    expect(called).toBe(1);
    expect(r.modelId).toBe("moonshotai/kimi-k2.5");
    expect(r.summary).toBe("继续观察并记录变化。");
  });

  it("trims trailing whitespace from LLM output", async () => {
    state.generateTextImpl = async () => ({ text: "  你好  \n" });
    const r = await summarize("脱发", evLowWithHit);
    expect(r.summary).toBe("你好");
  });
});

describe("summarize — fallbacks", () => {
  it("falls back to template when LLM returns empty text", async () => {
    state.generateTextImpl = async () => ({ text: "" });
    const r = await summarize("脱发", evLowWithHit);
    expect(r.summary).toContain("继续观察");
    // even on empty-text fallback, modelId still reflects the LLM was invoked
    expect(r.modelId).toBe("moonshotai/kimi-k2.5");
  });

  it("falls back to rule-only when LLM throws", async () => {
    state.generateTextImpl = async () => {
      throw new Error("LLM down");
    };
    const r = await summarize("胸痛", evHigh);
    expect(r.modelId).toBe("rule-only");
    expect(r.modelVersion).toBe("v1");
    expect(r.summary).toContain("高风险");
  });

  it("uses risk-appropriate fallback wording", async () => {
    state.generateTextImpl = async () => {
      throw new Error("down");
    };

    const high = await summarize("x", evHigh);
    expect(high.summary).toContain("高风险");

    const lowEmpty = await summarize("x", evLowEmpty);
    expect(lowEmpty.summary).toContain("继续观察");
  });
});
