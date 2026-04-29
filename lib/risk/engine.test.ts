import { describe, expect, it } from "vitest";
import { evaluate, getActiveRules } from "./engine";
import { RULE_VERSION } from "./rules";

// -- Severity classification ----------------------------------------

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

  it("escalates to high when high+medium+low coexist", () => {
    const r = evaluate("胸痛伴持续呕吐，最近脱发明显");
    expect(r.riskLevel).toBe("high");
    expect(r.hits.length).toBeGreaterThanOrEqual(2);
    const severities = new Set(r.hits.map((h) => h.severity));
    expect(severities.has("high")).toBe(true);
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

  it("does not escalate medium-only inputs to high", () => {
    const r = evaluate("化疗后手足麻木持续不缓解");
    expect(r.riskLevel).toBe("medium");
    expect(r.hits.every((h) => h.severity !== "high")).toBe(true);
  });
});

describe("risk engine — low / no risk", () => {
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

  it("returns low for empty input", () => {
    const r = evaluate("");
    expect(r.riskLevel).toBe("low");
    expect(r.hits).toHaveLength(0);
  });

  it("returns low for whitespace-only input", () => {
    const r = evaluate("   \n\t  ");
    expect(r.riskLevel).toBe("low");
    expect(r.hits).toHaveLength(0);
  });
});

// -- Whitespace + case normalisation -------------------------------

describe("risk engine — input normalisation", () => {
  it("matches keywords across embedded whitespace ('39 度' === '39度')", () => {
    const a = evaluate("发热到 39 度");
    const b = evaluate("发热到39度");
    expect(a.riskLevel).toBe(b.riskLevel);
    expect(a.hits.map((h) => h.ruleId).sort()).toEqual(
      b.hits.map((h) => h.ruleId).sort()
    );
  });

  it("matches across full-width and half-width whitespace + tabs", () => {
    const r = evaluate("发\t热　39  度");
    expect(r.riskLevel).toBe("high");
  });

  it("is case-insensitive on ASCII tokens (ac-t / AC-T)", () => {
    const upper = evaluate("AC-T 后第 3 天发烧");
    const lower = evaluate("ac-t 后第 3 天发烧");
    expect(upper.hits.map((h) => h.ruleId).sort()).toEqual(
      lower.hits.map((h) => h.ruleId).sort()
    );
  });

  it("preserves original casing in matchedText excerpt", () => {
    const r = evaluate("化疗 AC-T 后高烧 39 度");
    const fever = r.hits.find((h) => h.ruleId === "HEM-001");
    expect(fever).toBeDefined();
    expect(fever?.matchedText).toMatch(/AC-T|39 度|高烧/);
  });
});

// -- Hit dedup + multi-keyword behaviour ---------------------------

describe("risk engine — hit aggregation", () => {
  it("collects multiple matched keywords on the same rule", () => {
    const r = evaluate("脱发严重，掉头发，头发掉得厉害");
    const hairRule = r.hits.find((h) => h.ruleId === "DER-007");
    expect(hairRule).toBeDefined();
    expect(hairRule?.matchedKeywords.length).toBeGreaterThan(0);
  });

  it("does not double-list the same keyword if it appears repeatedly", () => {
    const r = evaluate("胸痛胸痛胸痛胸痛胸痛");
    const car = r.hits.find((h) => h.ruleId === "CAR-001");
    expect(car).toBeDefined();
    // Each keyword string should appear at most once per rule
    const set = new Set(car?.matchedKeywords ?? []);
    expect(set.size).toBe(car?.matchedKeywords.length);
  });

  it("counts each rule at most once even when multi-hit", () => {
    const r = evaluate("呼吸困难、胸闷、气短同时发作");
    const ruleIds = r.hits.map((h) => h.ruleId);
    expect(ruleIds.length).toBe(new Set(ruleIds).size);
  });
});

// -- Audit fields --------------------------------------------------

describe("risk engine — audit fields", () => {
  it("attaches current ruleVersion to top-level result", () => {
    const r = evaluate("剧烈头痛");
    expect(r.ruleVersion).toBe(RULE_VERSION);
  });

  it("attaches current ruleVersion to every hit", () => {
    const r = evaluate("剧烈头痛");
    for (const hit of r.hits) {
      expect(hit.ruleVersion).toBe(RULE_VERSION);
      expect(hit.matchedKeywords.length).toBeGreaterThan(0);
      expect(hit.matchedText.length).toBeGreaterThan(0);
    }
  });

  it("populates matchedText with a context window around the keyword", () => {
    const r = evaluate("化疗后第三天突然剧烈头痛伴恶心");
    const hit = r.hits[0];
    expect(hit?.matchedText.length).toBeLessThanOrEqual(40);
    expect(hit?.matchedText.length).toBeGreaterThan(0);
  });
});

// -- Breast-cancer specific (BCS-001..015) -------------------------

describe("risk engine — BCS (breast-cancer specific)", () => {
  const cases: Array<{ input: string; expected: string }> = [
    { input: "腋窝清扫后患侧上肢肿，皮肤发硬", expected: "BCS-001" },
    { input: "患侧手肿，上肢有点坠胀", expected: "BCS-002" },
    { input: "化疗后气短，最近用过表阿霉素", expected: "BCS-003" },
    { input: "曲妥珠单抗治疗后靶向心慌", expected: "BCS-004" },
    { input: "紫杉化疗后扣纽扣困难", expected: "BCS-005" },
    { input: "他莫昔芬后潮热严重，盗汗湿透", expected: "BCS-006" },
    { input: "AI 关节痛，全身关节痛", expected: "BCS-007" },
    { input: "骨密度下降明显", expected: "BCS-008" },
    { input: "腰背痛持续，夜间骨痛", expected: "BCS-009" },
    { input: "锁骨上肿块新发", expected: "BCS-010" },
    { input: "切口裂开伤口渗液", expected: "BCS-011" },
    { input: "假体不对称疼痛", expected: "BCS-012" },
    { input: "化疗后闭经", expected: "BCS-013" },
    { input: "哌柏西利后白细胞下降", expected: "BCS-014" },
    { input: "奥拉帕利后明显乏力", expected: "BCS-015" },
  ];

  for (const c of cases) {
    it(`hits ${c.expected} for "${c.input}"`, () => {
      const r = evaluate(c.input);
      expect(r.hits.some((h) => h.ruleId === c.expected)).toBe(true);
    });
  }
});

// -- 16-category coverage smoke ------------------------------------

describe("risk engine — every category has at least one positive case", () => {
  const samples: Record<string, string> = {
    BCS: "他莫昔芬后潮热严重",
    HEM: "化疗后白细胞略低",
    CAR: "胸痛持续不缓解",
    RES: "呼吸困难胸闷",
    GAS: "持续呕吐喝不下水",
    NEU: "剧烈头痛",
    DER: "卡培他滨手足综合征",
    REN: "尿少 24 小时排不出",
    HEP: "肝功能异常",
    END: "甲减体重增加",
    GEN: "阴道出血最近",
    PSY: "焦虑失眠严重",
    PAI: "全身肌肉酸",
    CON: "持续高热不退",
    INF: "脓毒症征象意识不清",
    MET: "电解质紊乱",
  };
  for (const [cat, input] of Object.entries(samples)) {
    it(`${cat} category produces at least one hit`, () => {
      const r = evaluate(input);
      const hit = r.hits.find((h) => h.ruleId.startsWith(`${cat}-`));
      expect(
        hit,
        `expected at least one ${cat}-* hit for "${input}", got: ${r.hits
          .map((h) => h.ruleId)
          .join(", ") || "none"}`
      ).toBeDefined();
    });
  }
});

// -- Engine API surface --------------------------------------------

describe("getActiveRules", () => {
  it("returns the v2 active rule set unchanged", () => {
    const rules = getActiveRules();
    expect(rules.length).toBe(162);
    expect(rules.every((r) => /^[A-Z]{3}-\d{3}$/.test(r.id))).toBe(true);
  });
});

// -- Robustness ----------------------------------------------------

describe("risk engine — robustness", () => {
  it("handles 5KB input without error", () => {
    const long = "胸痛 ".repeat(1000);
    const r = evaluate(long);
    expect(r.riskLevel).toBe("high");
  });

  it("does not throw on Unicode edge cases", () => {
    expect(() => evaluate("🩺 胸痛 \u{1F600}")).not.toThrow();
  });
});
