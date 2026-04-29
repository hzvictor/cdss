import type { Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  runAssessmentImpl: async (_input: { userId: string; inputText: string }) => ({
    assessmentId: "00000000-0000-0000-0000-000000000aaa",
    riskLevel: "high" as const,
    shouldContactTeam: true,
  }),
  selectFromQueue: [] as unknown[][],
  pushSelect(rows: unknown[]) {
    state.selectFromQueue.push(rows);
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/agent/orchestrator", () => ({
  runAssessment: (input: { userId: string; inputText: string }) =>
    state.runAssessmentImpl(input),
}));

vi.mock("@/lib/db/client", () => ({
  db: {
    select() {
      return {
        from(_table: unknown) {
          return {
            where(_cond: unknown) {
              const rows = state.selectFromQueue.shift() ?? [];
              return Promise.resolve(rows);
            },
          };
        },
      };
    },
  },
}));

const { assessSideEffect } = await import("./assess-side-effect");

const sessionWith = (uid?: string): Session => ({
  user: uid ? { id: uid, type: "regular" } : undefined,
  expires: new Date(Date.now() + 60_000).toISOString(),
}) as unknown as Session;

beforeEach(() => {
  state.selectFromQueue = [];
  state.runAssessmentImpl = async () => ({
    assessmentId: "00000000-0000-0000-0000-000000000aaa",
    riskLevel: "high",
    shouldContactTeam: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("assessSideEffect tool — schema", () => {
  const t = assessSideEffect({ session: sessionWith("u1") });

  // The tool's inputSchema is the zod schema we pass into ai.tool() — but
  // the runtime exposes it via `t.inputSchema` typed as a generic flexible
  // schema. We grab the original via Zod's parse APIs through a cast.
  const schema = t.inputSchema as unknown as {
    safeParse: (v: unknown) => { success: boolean };
  };

  it("rejects descriptions shorter than 2 chars", () => {
    expect(schema.safeParse({ description: "x" }).success).toBe(false);
  });

  it("rejects descriptions longer than 4000 chars", () => {
    expect(
      schema.safeParse({ description: "胸".repeat(4001) }).success
    ).toBe(false);
  });

  it("accepts valid descriptions", () => {
    expect(schema.safeParse({ description: "胸痛持续" }).success).toBe(true);
  });
});

describe("assessSideEffect tool — execute", () => {
  it("returns an error object when there is no user session", async () => {
    const t = assessSideEffect({ session: sessionWith(undefined) });
    if (!t.execute) {
      throw new Error("tool.execute should be defined");
    }
    const out = await t.execute(
      { description: "胸痛持续" },
      { messages: [], toolCallId: "x" }
    );
    expect(out).toEqual({ error: "unauthorized" });
  });

  it("forwards description into runAssessment with the session user id", async () => {
    let captured: { userId: string; inputText: string } | undefined;
    state.runAssessmentImpl = async (input) => {
      captured = input;
      return {
        assessmentId: "00000000-0000-0000-0000-000000000aaa",
        riskLevel: "high",
        shouldContactTeam: true,
      };
    };
    const fakeAssessment = { id: "00000000-0000-0000-0000-000000000aaa" };
    state.pushSelect([fakeAssessment]);
    state.pushSelect([]); // advice
    state.pushSelect([]); // evidence

    const t = assessSideEffect({ session: sessionWith("u1") });
    if (!t.execute) {
      throw new Error("tool.execute should be defined");
    }
    await t.execute(
      { description: "胸痛持续" },
      { messages: [], toolCallId: "x" }
    );

    expect(captured?.userId).toBe("u1");
    expect(captured?.inputText).toBe("胸痛持续");
  });

  it("returns assessment + sorted advice + evidence + totalRulesChecked", async () => {
    state.pushSelect([{ id: "a1", riskLevel: "high" }]);
    state.pushSelect([
      { id: "ad2", priority: 10, type: "monitor" },
      { id: "ad1", priority: 0, type: "immediate_care" },
      { id: "ad3", priority: 1, type: "contact_team" },
    ]);
    state.pushSelect([{ id: "ev1", ruleId: "HEM-001" }]);

    const t = assessSideEffect({ session: sessionWith("u1") });
    if (!t.execute) {
      throw new Error("tool.execute should be defined");
    }
    const out = (await t.execute(
      { description: "胸痛" },
      { messages: [], toolCallId: "x" }
    )) as {
      assessment: { id: string };
      advice: Array<{ id: string; priority: number }>;
      evidence: Array<{ id: string }>;
      totalRulesChecked: number;
    };

    expect(out.assessment.id).toBe("a1");
    expect(out.advice.map((a) => a.priority)).toEqual([0, 1, 10]);
    expect(out.evidence[0].id).toBe("ev1");
    expect(out.totalRulesChecked).toBe(162);
  });
});
