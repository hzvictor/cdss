import { expect, test } from "@playwright/test";
import { generateRandomTestUser } from "../helpers";

const REQUIRED_EVENTS = [
  "assessment_started",
  "assessment_submitted",
  "contact_team_clicked",
  "result_viewed",
] as const;

test.describe("Admin pages — public read-only views", () => {
  test.describe.configure({ mode: "serial" });

  const user = generateRandomTestUser();
  let highId = "";
  let lowId = "";

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/register");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign Up" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/register"));

    // Seed two assessments + one contact request.
    const high = await page.request.post("/api/assessment", {
      data: { inputText: "化疗后高烧 39 度，呼吸困难" },
    });
    expect(high.status()).toBe(201);
    highId = ((await high.json()) as { assessmentId: string }).assessmentId;

    const low = await page.request.post("/api/assessment", {
      data: { inputText: "最近脱发明显" },
    });
    expect(low.status()).toBe(201);
    lowId = ((await low.json()) as { assessmentId: string }).assessmentId;

    await page.request.post("/api/contact-request", {
      data: { assessmentId: highId, channel: "team" },
    });

    // Open the AssessmentCard so that the **client-side** track() call for
    // result_viewed is sent. We synchronously wait for the /api/events
    // response to land before closing the page so the row is committed.
    const eventDone = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/events") &&
        r.request().method() === "POST" &&
        r.status() === 204,
      { timeout: 15_000 }
    );
    await page.goto(`/assess/${highId}`);
    await page.getByTestId("assessment-card").waitFor();
    await eventDone;

    await page.close();
  });

  test("/admin → redirects to /admin/assessments", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/admin\/assessments/);
  });

  test("/admin/assessments lists both seeded rows by id + risk", async ({
    page,
  }) => {
    await page.goto("/admin/assessments");
    await expect(page.getByText("管理后台")).toBeVisible();

    const highRow = page.locator(
      `[data-testid="admin-assessment-row"][data-assessment-id="${highId}"]`
    );
    const lowRow = page.locator(
      `[data-testid="admin-assessment-row"][data-assessment-id="${lowId}"]`
    );
    await expect(highRow).toHaveAttribute("data-risk", "high");
    await expect(lowRow).toHaveAttribute("data-risk", "low");
  });

  test("/admin/contact-requests shows the team request for the high assessment", async ({
    page,
  }) => {
    await page.goto("/admin/contact-requests");
    const row = page.locator(
      `[data-testid="admin-contact-row"][data-assessment-id="${highId}"]`
    );
    await expect(row).toBeVisible();
    await expect(row).toHaveAttribute("data-channel", "team");
    // status was upserted to "created" since contact-request endpoint always
    // sets status="created" on insert.
    await expect(row).toHaveAttribute("data-status", "created");
  });

  test("/admin/rules surfaces the rule library + at least one BCS id", async ({
    page,
  }) => {
    await page.goto("/admin/rules");
    await expect(page.getByText(/数据源/)).toBeVisible();
    // BCS rules prove breast-cancer specificity is loaded.
    await expect(page.getByText(/BCS-\d{3}/).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("/admin/events shows all 4 reliable mandatory event names", async ({
    page,
  }) => {
    // Poll: admin/events reads from DB; client telemetry is async so we
    // tolerate up to ~10s for rows to land. Each iteration reloads the page.
    let observed = new Set<string>();
    for (let attempt = 0; attempt < 5; attempt++) {
      await page.goto("/admin/events");
      observed = new Set(
        await page
          .locator("[data-testid='admin-event-row']")
          .evaluateAll((els) =>
            els
              .map((el) => el.getAttribute("data-event-name"))
              .filter((v): v is string => Boolean(v))
          )
      );
      const allFound = REQUIRED_EVENTS.every((n) => observed.has(n));
      if (allFound) {
        break;
      }
      await page.waitForTimeout(2000);
    }
    for (const name of REQUIRED_EVENTS) {
      expect(observed, `expected ${name} in event log`).toContain(name);
    }
  });
});
