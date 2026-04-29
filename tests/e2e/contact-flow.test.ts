import { expect, test } from "@playwright/test";
import { generateRandomTestUser } from "../helpers";

test.describe("Contact-team CTA flow", () => {
  test.describe.configure({ mode: "serial" });

  const user = generateRandomTestUser();
  let highRiskAssessmentId = "";
  let lowRiskAssessmentId = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/register");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/register"), {
      timeout: 30_000,
    });

    // Seed two assessments — one high (CTA visible) + one low (CTA absent).
    const high = await page.request.post("/api/assessment", {
      data: { inputText: "化疗后高烧 39 度，呼吸困难" },
    });
    expect(high.status()).toBe(201);
    highRiskAssessmentId = ((await high.json()) as { assessmentId: string })
      .assessmentId;

    const low = await page.request.post("/api/assessment", {
      data: { inputText: "最近脱发明显" },
    });
    expect(low.status()).toBe(201);
    lowRiskAssessmentId = ((await low.json()) as { assessmentId: string })
      .assessmentId;

    await page.close();
  });

  async function login(page: import("@playwright/test").Page) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 30_000,
    });
  }

  test("low-risk assessment never shows the contact-team button", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/assess/${lowRiskAssessmentId}`);
    await expect(page.getByTestId("assessment-card")).toBeVisible();
    await expect(page.getByTestId("contact-team-btn")).toHaveCount(0);
  });

  test("high-risk: idle → loading → created on successful POST", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/assess/${highRiskAssessmentId}`);
    await expect(page.getByTestId("contact-team-btn")).toBeVisible();

    // Slow down POST so we can observe the loading state.
    await page.route("**/api/contact-request", async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });

    const btn = page.getByTestId("contact-team-btn");
    await expect(btn).toHaveText(/联系团队/);
    await btn.click();
    await expect(btn).toHaveText(/通知中/);

    await expect(page.getByText(/已通知团队/)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("contact-team-btn")).toHaveCount(0);
  });

  test("high-risk: server 5xx surfaces the failure copy", async ({ page }) => {
    await login(page);
    await page.goto(`/assess/${highRiskAssessmentId}`);
    await expect(page.getByTestId("contact-team-btn")).toBeVisible();

    await page.route("**/api/contact-request", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "internal_error" }),
      })
    );

    await page.getByTestId("contact-team-btn").click();
    await expect(page.getByText(/通知失败/)).toBeVisible({ timeout: 10_000 });
  });

  test("clicking emits contact_team_clicked telemetry", async ({ page }) => {
    await login(page);

    const eventBodies: unknown[] = [];
    await page.route("**/api/events", async (route) => {
      try {
        const body = route.request().postDataJSON?.();
        if (body) {
          eventBodies.push(body);
        }
      } catch {
        /* noop */
      }
      await route.fulfill({ status: 204, body: "" });
    });

    await page.goto(`/assess/${highRiskAssessmentId}`);
    await page.getByTestId("contact-team-btn").click();
    await expect(page.getByText(/已通知团队|通知失败/)).toBeVisible({
      timeout: 10_000,
    });

    const names = eventBodies.map(
      (e) => (e as { name?: string }).name ?? "unknown"
    );
    expect(names).toContain("contact_team_clicked");
  });
});
