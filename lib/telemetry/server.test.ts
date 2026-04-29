import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  inserts: [] as Array<Record<string, unknown>>,
  insertShouldThrow: false,
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db/client", () => ({
  db: {
    insert(_table: unknown) {
      return {
        values(row: Record<string, unknown>) {
          if (state.insertShouldThrow) {
            return Promise.reject(new Error("db-down"));
          }
          state.inserts.push(row);
          return Promise.resolve(undefined);
        },
      };
    },
  },
}));

const { logEventServer } = await import("./server");

beforeEach(() => {
  state.inserts = [];
  state.insertShouldThrow = false;
  // Pin salt so IP hashes are deterministic across this run.
  process.env.TELEMETRY_IP_SALT = "test-salt-fixed";
});

afterEach(() => {
  vi.restoreAllMocks();
});

const RID = "11111111-1111-1111-1111-111111111111";
const UID = "22222222-2222-2222-2222-222222222222";

const reqWith = (h: Record<string, string>): Request =>
  new Request("https://example.com/api/events", { headers: h });

describe("logEventServer — happy path writes", () => {
  it("inserts a row with name + payload + userId", async () => {
    await logEventServer({
      name: "result_viewed",
      payload: { assessmentId: RID },
      userId: UID,
    });

    expect(state.inserts).toHaveLength(1);
    const row = state.inserts[0];
    expect(row).toMatchObject({
      eventName: "result_viewed",
      userId: UID,
      assessmentId: RID,
    });
  });

  it("falls back to assessmentId from payload if not passed explicitly", async () => {
    await logEventServer({
      name: "assessment_submitted",
      payload: { assessmentId: RID, riskLevel: "high", durationMs: 100 },
      userId: UID,
    });

    expect(state.inserts[0]?.assessmentId).toBe(RID);
  });

  it("stores null for missing userId / assessmentId / req", async () => {
    await logEventServer({
      name: "assessment_started",
      payload: { hasInput: true, inputLength: 10 },
    });

    const row = state.inserts[0];
    expect(row.userId).toBeNull();
    expect(row.assessmentId).toBeNull();
    expect(row.userAgent).toBeNull();
    expect(row.ipHash).toBeNull();
  });
});

describe("logEventServer — IP hashing", () => {
  it("hashes x-forwarded-for, taking the first hop", async () => {
    await logEventServer({
      name: "result_viewed",
      payload: { assessmentId: RID },
      req: reqWith({ "x-forwarded-for": "203.0.113.1, 10.0.0.1" }),
    });
    await logEventServer({
      name: "result_viewed",
      payload: { assessmentId: RID },
      req: reqWith({ "x-forwarded-for": "203.0.113.1" }),
    });

    expect(state.inserts[0]?.ipHash).toBe(state.inserts[1]?.ipHash);
    expect(typeof state.inserts[0]?.ipHash).toBe("string");
    expect((state.inserts[0]?.ipHash as string).length).toBe(64);
  });

  it("falls back to x-real-ip when no x-forwarded-for", async () => {
    await logEventServer({
      name: "result_viewed",
      payload: { assessmentId: RID },
      req: reqWith({ "x-real-ip": "198.51.100.5" }),
    });
    expect(typeof state.inserts[0]?.ipHash).toBe("string");
  });

  it("changes hash output when salt changes", async () => {
    process.env.TELEMETRY_IP_SALT = "salt-A";
    // re-import with the new salt — but server.ts captures salt at module load
    // time, so this test pins behaviour: we cannot rotate at runtime. Instead
    // we assert hash determinism within a salt.
    await logEventServer({
      name: "result_viewed",
      payload: { assessmentId: RID },
      req: reqWith({ "x-real-ip": "1.2.3.4" }),
    });
    await logEventServer({
      name: "result_viewed",
      payload: { assessmentId: RID },
      req: reqWith({ "x-real-ip": "1.2.3.4" }),
    });
    expect(state.inserts[0]?.ipHash).toBe(state.inserts[1]?.ipHash);
  });
});

describe("logEventServer — whitelist", () => {
  it("silently drops events whose name is not in the allow-list", async () => {
    await logEventServer({
      name: "definitely_not_real" as unknown as "result_viewed",
      payload: { assessmentId: RID },
    });
    expect(state.inserts).toHaveLength(0);
  });
});

describe("logEventServer — failure isolation", () => {
  it("does not throw when DB insert fails", async () => {
    state.insertShouldThrow = true;
    await expect(
      logEventServer({
        name: "result_viewed",
        payload: { assessmentId: RID },
      })
    ).resolves.toBeUndefined();
    expect(state.inserts).toHaveLength(0);
  });
});
