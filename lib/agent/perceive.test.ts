import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  generateTextImpl: async (_args: unknown) => ({
    output: { symptoms: [] as string[] },
    text: "",
  }),
}));

vi.mock("server-only", () => ({}));

vi.mock("ai", () => ({
  generateText: (args: unknown) => state.generateTextImpl(args),
  Output: { object: (cfg: unknown) => cfg },
}));

const { perceive } = await import("./perceive");

beforeEach(() => {
  state.generateTextImpl = async () => ({ output: { symptoms: [] }, text: "" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("perceive — happy path", () => {
  it("returns symptoms parsed from the LLM output", async () => {
    state.generateTextImpl = async () => ({
      output: { symptoms: ["发热", "粒缺"] },
      text: "",
    });
    const r = await perceive("化疗后发烧");
    expect(r.symptoms).toEqual(["发热", "粒缺"]);
  });

  it("uses the configured model + prompt template", async () => {
    let captured: { model?: string; prompt?: string } = {};
    state.generateTextImpl = async (args) => {
      captured = args as typeof captured;
      return { output: { symptoms: [] }, text: "" };
    };

    await perceive("胸痛");
    expect(captured.model).toBe("mistral/mistral-small");
    expect(captured.prompt).toContain("胸痛");
  });
});

describe("perceive — fallbacks", () => {
  it("returns empty array when input is whitespace-only (no LLM call)", async () => {
    let called = 0;
    state.generateTextImpl = async () => {
      called++;
      return { output: { symptoms: ["x"] }, text: "" };
    };
    const r = await perceive("   ");
    expect(r.symptoms).toEqual([]);
    expect(called).toBe(0);
  });

  it("returns [] when the LLM throws", async () => {
    state.generateTextImpl = async () => {
      throw new Error("LLM down");
    };
    const r = await perceive("胸痛");
    expect(r.symptoms).toEqual([]);
  });

  it("returns [] when the LLM returns no output", async () => {
    state.generateTextImpl = async () =>
      ({ text: "", output: undefined } as unknown as {
        text: string;
        output: { symptoms: string[] };
      });
    const r = await perceive("胸痛");
    expect(r.symptoms).toEqual([]);
  });

  it("does not throw on Unicode / emoji input", async () => {
    state.generateTextImpl = async () => ({ output: { symptoms: [] }, text: "" });
    await expect(perceive("🩺 胸痛")).resolves.toEqual({ symptoms: [] });
  });
});
