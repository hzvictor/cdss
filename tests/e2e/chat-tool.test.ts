import { expect, test } from "@playwright/test";
import { generateRandomTestUser } from "../helpers";
import {
  disposeDb,
  getUserIdByEmail,
  seedChatWithToolResult,
} from "../helpers/db-test";

/**
 * Verifies the chat → AssessmentCard render branch in
 * `components/chat/message.tsx` (the `tool-assessSideEffect` part with
 * `state: "output-available"`). We bypass the live LLM by seeding a chat
 * + user message + assistant message with the tool result already attached.
 */
test.describe("Chat-tool render path (DB-seeded)", () => {
  test.describe.configure({ mode: "serial" });

  const user = generateRandomTestUser();
  let userId = "";
  let highChatId = "";
  let zeroHitChatId = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/register");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/register"));

    // Use the real /api/assessment endpoint to obtain a fully-formed bundle
    // (assessment + advice + evidence) — same shape the LLM tool would emit.
    const high = await page.request.post("/api/assessment", {
      data: { inputText: "化疗后高烧 39 度，呼吸困难" },
    });
    expect(high.status()).toBe(201);
    const highBundle = (await high.json()) as {
      assessment: Record<string, unknown>;
      advice: Record<string, unknown>[];
      evidence: Record<string, unknown>[];
      totalRulesChecked: number;
    };

    const zero = await page.request.post("/api/assessment", {
      data: { inputText: "今天天气不错" },
    });
    expect(zero.status()).toBe(201);
    const zeroBundle = (await zero.json()) as typeof highBundle;
    await page.close();

    userId = await getUserIdByEmail(user.email);

    highChatId = await seedChatWithToolResult(
      userId,
      "化疗后高烧 39 度，呼吸困难",
      highBundle
    );
    zeroHitChatId = await seedChatWithToolResult(
      userId,
      "今天天气不错",
      zeroBundle
    );
  });

  test.afterAll(async () => {
    await disposeDb();
  });

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  }

  test("high-risk: AssessmentCard renders inline with risk badge + advice", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/chat/${highChatId}`);

    await expect(page.getByTestId("assessment-card")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("risk-badge")).toHaveAttribute(
      "data-risk",
      "high"
    );
    // User message rendered in the conversation thread (scope away from
    // the sidebar history list which contains a truncated copy).
    await expect(
      page
        .locator("[data-role='user']")
        .filter({ hasText: "化疗后高烧 39 度，呼吸困难" })
    ).toBeVisible();
    // Audit footer (also assert the original input echo inside the card).
    const card = page.getByTestId("assessment-card");
    await expect(card.getByText("规则版本")).toBeVisible();
    await expect(card.getByText("评估 ID")).toBeVisible();
    // The input echo lives in the "您的描述 · 原文" block. Scope to that
    // section so we don't collide with the matchedText snippets shown in
    // each evidence row.
    await expect(card.getByText("您的描述 · 原文")).toBeVisible();
    await expect(
      card.getByText("化疗后高烧 39 度，呼吸困难").first()
    ).toBeVisible();
    // Contact CTA exists for high
    await expect(page.getByTestId("contact-team-btn")).toBeVisible();
  });

  test("zero-hit: friendly empty-state message + original input echo", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/chat/${zeroHitChatId}`);

    await expect(page.getByTestId("assessment-card")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("risk-badge")).toHaveAttribute(
      "data-risk",
      "low"
    );
    const card = page.getByTestId("assessment-card");
    await expect(card.getByText(/未匹配到高\/中风险条目/)).toBeVisible();
    await expect(card.getByText("今天天气不错").first()).toBeVisible();
    // Low risk: no contact CTA
    await expect(page.getByTestId("contact-team-btn")).toHaveCount(0);
  });

  test("clicking contact-team in chat fires telemetry + posts to /api/contact-request", async ({
    page,
  }) => {
    await login(page);

    const events: unknown[] = [];
    await page.route("**/api/events", async (route) => {
      const body = route.request().postDataJSON?.();
      if (body) events.push(body);
      await route.fulfill({ status: 204, body: "" });
    });

    let contactPosted = false;
    await page.route("**/api/contact-request", async (route) => {
      contactPosted = true;
      await route.continue();
    });

    await page.goto(`/chat/${highChatId}`);
    await page.getByTestId("contact-team-btn").click();
    await expect(page.getByText(/已通知团队|通知失败/)).toBeVisible({
      timeout: 10_000,
    });
    expect(contactPosted).toBe(true);

    const names = events.map(
      (e) => (e as { name?: string }).name ?? "unknown"
    );
    expect(names).toContain("contact_team_clicked");
  });
});
