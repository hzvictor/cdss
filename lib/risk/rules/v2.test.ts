import { describe, expect, it } from "vitest";
import { RULES_V2, RULE_VERSION } from "./v2";

const CATEGORIES = [
  "BCS",
  "HEM",
  "CAR",
  "RES",
  "GAS",
  "NEU",
  "DER",
  "REN",
  "HEP",
  "END",
  "GEN",
  "PSY",
  "PAI",
  "CON",
  "INF",
  "MET",
] as const;

describe("rules v2 — library meta", () => {
  it("contains exactly 162 rules", () => {
    expect(RULES_V2.length).toBe(162);
  });

  it("declares its version as v2", () => {
    expect(RULE_VERSION).toBe("v2");
  });

  it("has unique rule IDs", () => {
    const ids = RULES_V2.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses CAT-NNN format for every id", () => {
    for (const r of RULES_V2) {
      expect(r.id).toMatch(/^[A-Z]{3}-\d{3}$/);
    }
  });

  it("uses only allowed category prefixes", () => {
    const allowed = new Set<string>(CATEGORIES);
    for (const r of RULES_V2) {
      const prefix = r.id.split("-")[0];
      expect(allowed.has(prefix)).toBe(true);
    }
  });

  it("has exactly 15 BCS rules (breast-cancer specific)", () => {
    const bcs = RULES_V2.filter((r) => r.id.startsWith("BCS-"));
    expect(bcs.length).toBe(15);
  });

  it("uses only valid severity values", () => {
    const valid = new Set(["high", "medium", "low"]);
    for (const r of RULES_V2) {
      expect(valid.has(r.severity)).toBe(true);
    }
  });

  it("requires at least one keyword per rule", () => {
    for (const r of RULES_V2) {
      expect(r.keywords.length).toBeGreaterThan(0);
      for (const k of r.keywords) {
        expect(k.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("requires non-empty name + description + adviceTemplate", () => {
    for (const r of RULES_V2) {
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.description.length).toBeGreaterThan(0);
      expect(r.adviceTemplate.length).toBeGreaterThan(0);
    }
  });

  it("covers every declared category at least once", () => {
    for (const cat of CATEGORIES) {
      const count = RULES_V2.filter((r) => r.id.startsWith(`${cat}-`)).length;
      expect(count, `category ${cat} missing rules`).toBeGreaterThan(0);
    }
  });

  it("does not declare duplicate keywords within the same rule", () => {
    for (const r of RULES_V2) {
      expect(new Set(r.keywords).size).toBe(r.keywords.length);
    }
  });

  it("has at least one high-severity rule per safety-critical category", () => {
    const critical = ["BCS", "HEM", "CAR", "RES", "NEU", "INF"];
    for (const cat of critical) {
      const hasHigh = RULES_V2.some(
        (r) => r.id.startsWith(`${cat}-`) && r.severity === "high"
      );
      expect(hasHigh, `${cat} should expose at least one high rule`).toBe(true);
    }
  });
});
