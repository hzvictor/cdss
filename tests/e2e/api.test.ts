import { expect, test } from "@playwright/test";
import { generateRandomTestUser } from "../helpers";

const CHAT_URL_REGEX = /\/chat\/[\w-]+/;

// ─── /api/assessment ─────────────────────────────────────────────

test.describe("/api/assessment", () => {
  test.describe.configure({ mode: "serial" });

  const user = generateRandomTestUser();

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/register");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/register"), {
      timeout: 30_000,
    });
    await page.close();
  });

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  }

  // NOTE on auth: the 401 branch in /api/assessment is unreachable under the
  // current proxy middleware. Anonymous POST → 307 redirect to /api/auth/guest
  // → POST converts to GET on guest endpoint (only GET handler) → 405. So
  // anonymous POSTs cannot reach the route. We accept that and only test the
  // happy/validation paths from an authenticated session.
  test("anonymous POST is gated by middleware (cannot reach route)", async ({
    playwright,
  }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    });
    const res = await ctx.post("/api/assessment", {
      data: { inputText: "胸痛持续" },
    });
    // 405 from the guest auth handler is the observed behaviour. We assert
    // the route was NOT reached (i.e. did not respond 201) — any of
    // 307/405/401/302 is acceptable.
    expect([302, 307, 401, 405]).toContain(res.status());
    await ctx.dispose();
  });

  test("POST 400 on too-short input", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/assessment", {
      data: { inputText: "x" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST 400 on too-long input (> 4000 chars)", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/assessment", {
      data: { inputText: "胸".repeat(4001) },
    });
    expect(res.status()).toBe(400);
  });

  test("POST 201 returns full bundle including audit fields", async ({
    page,
  }) => {
    await login(page);
    const res = await page.request.post("/api/assessment", {
      data: { inputText: "化疗后高烧 39 度" },
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as {
      assessmentId: string;
      assessment: { ruleVersion: string; modelId: string };
      advice: unknown[];
      evidence: unknown[];
      totalRulesChecked: number;
    };
    expect(body.assessmentId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.assessment.ruleVersion).toBe("v2");
    expect(typeof body.assessment.modelId).toBe("string");
    expect(body.totalRulesChecked).toBe(162);
    expect(Array.isArray(body.advice)).toBe(true);
    expect(Array.isArray(body.evidence)).toBe(true);
  });
});

// ─── /api/rules ─────────────────────────────────────────────────
//
// IMPORTANT: although /api/rules has no auth check at the route handler level,
// the proxy middleware redirects every cookie-less request to /api/auth/guest
// and **drops query-strings** in the process (see proxy.ts: only pathname is
// preserved as redirectUrl). So `?since=` must be sent from a page context
// that already holds a guest/user session, otherwise the parameter is lost
// during the redirect dance and the route returns a full payload.

test.describe("/api/rules", () => {
  test("GET returns 162 rules + ETag", async ({ page }) => {
    await page.goto("/"); // primes the guest session cookie
    const res = await page.request.get("/api/rules");
    expect(res.status()).toBe(200);
    const etag = res.headers().etag;
    expect(etag).toBeTruthy();
    const body = (await res.json()) as { count: number; rules: unknown[] };
    expect(body.count).toBe(162);
    expect(body.rules.length).toBe(162);
  });

  test("If-None-Match → 304 short circuit", async ({ page }) => {
    await page.goto("/");
    const first = await page.request.get("/api/rules");
    const etag = first.headers().etag;
    const second = await page.request.get("/api/rules", {
      headers: { "if-none-match": etag },
    });
    expect(second.status()).toBe(304);
  });

  test("?since= future date → empty incremental delta", async ({ page }) => {
    await page.goto("/");
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const res = await page.request.get(`/api/rules?since=${future}`);
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { mode: string; rules: unknown[] };
    expect(body.mode).toBe("incremental");
    expect(body.rules.length).toBe(0);
  });

  test("?since= past date → full delta (every rule)", async ({ page }) => {
    await page.goto("/");
    const past = "1970-01-01T00:00:00.000Z";
    const res = await page.request.get(`/api/rules?since=${past}`);
    const body = (await res.json()) as { mode: string; count: number };
    expect(body.mode).toBe("incremental");
    expect(body.count).toBeGreaterThan(0);
  });
});

// ─── /api/contact-request ────────────────────────────────────────

test.describe("/api/contact-request", () => {
  test.describe.configure({ mode: "serial" });

  const user = generateRandomTestUser();
  let assessmentId = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/register");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/register"));
    const res = await page.request.post("/api/assessment", {
      data: { inputText: "化疗后高烧 39 度" },
    });
    assessmentId = ((await res.json()) as { assessmentId: string })
      .assessmentId;
    await page.close();
  });

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  }

  test("POST 400 on missing assessmentId", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/contact-request", { data: {} });
    expect(res.status()).toBe(400);
  });

  test("POST 400 on non-uuid assessmentId", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/contact-request", {
      data: { assessmentId: "not-a-uuid" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST 404 when assessmentId does not exist", async ({ page }) => {
    await login(page);
    const res = await page.request.post("/api/contact-request", {
      data: { assessmentId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status()).toBe(404);
  });

  test("POST 201 creates a row, second POST upserts (idempotent)", async ({
    page,
  }) => {
    await login(page);
    const first = await page.request.post("/api/contact-request", {
      data: { assessmentId, channel: "team" },
    });
    expect(first.status()).toBe(201);

    const second = await page.request.post("/api/contact-request", {
      data: { assessmentId, channel: "team", note: "follow-up" },
    });
    expect(second.status()).toBe(201);
    const body = (await second.json()) as {
      contactRequest: { note?: string; status: string };
    };
    expect(body.contactRequest.note).toBe("follow-up");
    expect(body.contactRequest.status).toBe("created");
  });
});

// ─── /api/events (telemetry sink) ────────────────────────────────
//
// Same middleware caveat as /api/rules — POSTs need an established guest/user
// session, otherwise they get redirected and converted GET → 405.

test.describe("/api/events", () => {
  test("rejects unknown event names with 400", async ({ page }) => {
    await page.goto("/");
    const res = await page.request.post("/api/events", {
      data: { name: "definitely_not_real", payload: { foo: "bar" } },
    });
    expect(res.status()).toBe(400);
  });

  test("rejects malformed payload (zod schema)", async ({ page }) => {
    await page.goto("/");
    const res = await page.request.post("/api/events", {
      // valid name but wrong payload shape (assessmentId missing)
      data: { name: "result_viewed", payload: {} },
    });
    expect(res.status()).toBe(400);
  });

  test("accepts valid event with 204", async ({ page }) => {
    await page.goto("/");
    const res = await page.request.post("/api/events", {
      data: {
        name: "result_viewed",
        payload: { assessmentId: "11111111-1111-1111-1111-111111111111" },
      },
    });
    expect(res.status()).toBe(204);
  });

  test("rejects malformed JSON body with 400", async ({ page }) => {
    await page.goto("/");
    const res = await page.request.post("/api/events", {
      data: "{not-json",
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });
});

// ─── Generic chat API smoke (kept lightweight) ───────────────────

test.describe("Chat API smoke", () => {
  test("input clears after sending", async ({ page }) => {
    await page.goto("/");
    const input = page.getByTestId("multimodal-input");
    await input.fill("hi");
    await page.getByTestId("send-button").click();
    await expect(input).toHaveValue("");
  });

  test("redirects to /chat/:id after send", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("multimodal-input").fill("hi");
    await page.getByTestId("send-button").click();
    await expect(page).toHaveURL(CHAT_URL_REGEX, { timeout: 15_000 });
  });

  test("does not crash when /api/chat returns 500", async ({ page }) => {
    await page.route("**/api/chat", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "internal_error" }),
      })
    );
    await page.goto("/");
    await page.getByTestId("multimodal-input").fill("kaboom");
    await page.getByTestId("send-button").click();
    // The chat composer surfaces failures via toast OR by re-enabling the
    // input; we just assert the input area is still usable (no full crash)
    // and that no AssessmentCard slipped through on a 500.
    await expect(page.getByTestId("multimodal-input")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("assessment-card")).toHaveCount(0);
  });
});
