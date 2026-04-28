import { expect, test } from "@playwright/test";
import { generateRandomTestUser } from "../helpers";

test.describe("CDSS — full assessment flow", () => {
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
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });
  }

  test("renders the input page after login", async ({ page }) => {
    await login(page);
    await page.goto("/assess");
    await expect(
      page.getByRole("heading", { name: "副作用评估" })
    ).toBeVisible();
    await expect(page.getByLabel("副作用描述")).toBeVisible();
    await expect(page.getByTestId("assess-submit")).toBeDisabled();
  });

  test("high-risk input -> high badge + audit info", async ({ page }) => {
    await login(page);
    await page.goto("/assess");
    await page
      .getByLabel("副作用描述")
      .fill("化疗后第 3 天发热到 39 度，伴轻微咳嗽，呼吸困难");

    await page.getByTestId("assess-submit").click();
    await page.waitForURL(/\/assess\/[0-9a-f-]{36}/, { timeout: 60_000 });

    await expect(page.getByTestId("risk-badge")).toHaveAttribute(
      "data-risk",
      "high"
    );
    await expect(page.getByText(/规则版本/)).toBeVisible();
  });

  test("low-risk input -> no contact-team button", async ({ page }) => {
    await login(page);
    await page.goto("/assess");
    await page.getByLabel("副作用描述").fill("最近脱发明显，有一些疲劳");
    await page.getByTestId("assess-submit").click();
    await page.waitForURL(/\/assess\/[0-9a-f-]{36}/, { timeout: 60_000 });

    await expect(page.getByTestId("risk-badge")).toHaveAttribute(
      "data-risk",
      "low"
    );
    await expect(page.getByTestId("contact-team-btn")).toHaveCount(0);
  });

  test("history page shows newly created assessment", async ({ page }) => {
    await login(page);
    // Create a fresh assessment within this test to keep it self-contained.
    await page.goto("/assess");
    await page
      .getByLabel("副作用描述")
      .fill("最近一直呼吸困难，胸闷得很厉害");
    await page.getByTestId("assess-submit").click();
    await page.waitForURL(/\/assess\/[0-9a-f-]{36}/, { timeout: 60_000 });

    await page.goto("/history");
    await expect(
      page.getByRole("heading", { name: "历史记录" })
    ).toBeVisible();
    await expect(page.locator('a[href^="/assess/"]').first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("CDSS — auth gating", () => {
  test("guest auto-login can access /assess", async ({ page }) => {
    await page.goto("/assess");
    await page.waitForURL(/\/assess$/, { timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "副作用评估" })
    ).toBeVisible();
  });

  test("guest cannot access /admin (redirected away)", async ({ page }) => {
    await page.goto("/admin/assessments");
    await page.waitForURL((url) => !url.pathname.startsWith("/admin"), {
      timeout: 15_000,
    });
  });
});
