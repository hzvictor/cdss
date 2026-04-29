import { type APIRequestContext, expect, test } from "@playwright/test";
import { generateRandomTestUser } from "../helpers";

const ASSESSMENT_URL_REGEX = /\/assess\/[0-9a-f-]{36}/;

test.describe("CDSS — assessment card via direct API", () => {
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

  async function loginAndCreate(
    request: APIRequestContext,
    page: import("@playwright/test").Page,
    inputText: string
  ): Promise<string> {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    });

    // Reuse the browser context's cookies for the API call.
    const cookies = await page.context().cookies();
    const apiContext = await request.storageState();
    const res = await page.request.post("/api/assessment", {
      data: { inputText },
    });
    expect(res.status(), await res.text()).toBe(201);
    const body = (await res.json()) as { assessmentId: string };
    void cookies; // keep TS happy with unused captures
    void apiContext;
    return body.assessmentId;
  }

  test("high-risk input renders AssessmentCard with high badge + audit info", async ({
    page,
    request,
  }) => {
    const id = await loginAndCreate(
      request,
      page,
      "化疗后第 3 天发热到 39 度，伴呼吸困难"
    );
    await page.goto(`/assess/${id}`);

    const card = page.getByTestId("assessment-card");
    await expect(card).toBeVisible();
    await expect(page.getByTestId("risk-badge")).toHaveAttribute(
      "data-risk",
      "high"
    );
    // Original input echoed (per UX rule). The evidence section also shows
    // matchedText excerpts that include the same substring — use .first()
    // to pin the assertion to the input-echo paragraph.
    await expect(card.getByText("您的描述 · 原文")).toBeVisible();
    await expect(
      card.getByText("化疗后第 3 天发热到 39 度，伴呼吸困难").first()
    ).toBeVisible();
    // Audit footer fields
    await expect(card.getByText("规则版本")).toBeVisible();
    await expect(card.getByText("评估 ID")).toBeVisible();
    await expect(card.getByText("模型").first()).toBeVisible();
  });

  test("high-risk shows contact-team button + advice", async ({
    page,
    request,
  }) => {
    const id = await loginAndCreate(
      request,
      page,
      "化疗后高烧 39 度，呼吸困难，胸闷"
    );
    await page.goto(`/assess/${id}`);

    const card = page.getByTestId("assessment-card");
    await expect(page.getByTestId("contact-team-btn")).toBeVisible();
    // "立即就医" appears as both an advice type pill and (potentially) inside
    // an advice description; use .first().
    await expect(card.getByText("立即就医").first()).toBeVisible();
    await expect(card.getByText("联系团队").first()).toBeVisible();
  });

  test("medium-risk shows medium badge, no immediate-care advice", async ({
    page,
    request,
  }) => {
    const id = await loginAndCreate(
      request,
      page,
      "化疗后手足麻木一直不缓解，夜里也疼"
    );
    await page.goto(`/assess/${id}`);

    await expect(page.getByTestId("risk-badge")).toHaveAttribute(
      "data-risk",
      "medium"
    );
    await expect(page.getByText("立即就医")).toHaveCount(0);
  });

  test("low-risk shows low badge, no contact-team button", async ({
    page,
    request,
  }) => {
    const id = await loginAndCreate(request, page, "最近脱发明显，有点疲劳");
    await page.goto(`/assess/${id}`);

    await expect(page.getByTestId("risk-badge")).toHaveAttribute(
      "data-risk",
      "low"
    );
    await expect(page.getByTestId("contact-team-btn")).toHaveCount(0);
  });

  test("zero-hit empty state preserves original input + tells user system did look", async ({
    page,
    request,
  }) => {
    const id = await loginAndCreate(
      request,
      page,
      "今天天气不错，没有什么不适。"
    );
    await page.goto(`/assess/${id}`);

    const card = page.getByTestId("assessment-card");
    // Empty-state copy
    await expect(card.getByText(/未匹配到高\/中风险条目/)).toBeVisible();
    // Original input still echoed (scope to card; sidebar history may also
    // contain the same string truncated)
    await expect(card.getByText("今天天气不错").first()).toBeVisible();
    // Total rules counter is visible — system was actually consulted
    await expect(card.getByText(/已对照 162 条/)).toBeVisible();
  });
});

test.describe("CDSS — auth gating + redirects", () => {
  test("guest auto-login can access the chat UI", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("multimodal-input")).toBeVisible();
  });

  test("/assess redirects to / for everyone (legacy entry retired)", async ({
    page,
  }) => {
    await page.goto("/assess");
    await page.waitForURL((url) => url.pathname === "/", { timeout: 15_000 });
  });

  test("/admin is publicly accessible (demo decision: no auth gate)", async ({
    page,
  }) => {
    await page.goto("/admin/assessments");
    await expect(page.getByText("管理后台")).toBeVisible();
    await expect(page.getByText("Public · Demo")).toBeVisible();
  });

  test("foreign user gets redirected from someone else's /assess/:id", async ({
    page,
  }) => {
    // As a guest, attempt to view a UUID we never created.
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await page.goto(`/assess/${fakeId}`);
    // Either notFound() (404) or redirect — both are valid auth-safe responses.
    expect([200, 302, 404]).toContain(res?.status() ?? 0);
    // Importantly, we never see an assessment card with someone else's data.
    await expect(page.getByTestId("assessment-card")).toHaveCount(0);
  });
});

test.describe("CDSS — chat-tool flow (smoke)", () => {
  test("AssessmentCard renders after chat tool call (live LLM)", async ({
    page,
  }) => {
    test.skip(
      !process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY,
      "live LLM not configured — skip end-to-end chat tool smoke"
    );
    await page.goto("/");
    await page
      .getByTestId("multimodal-input")
      .fill("化疗后第 3 天发热到 39 度，呼吸困难，胸闷");
    await page.getByTestId("send-button").click();

    await expect(page).toHaveURL(/\/chat\//, { timeout: 30_000 });
    await expect(page.getByTestId("assessment-card")).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByTestId("risk-badge")).toBeVisible();
  });
});
