import { expect, test } from "@playwright/test";
import { generateRandomTestUser } from "../helpers";

test.describe("/history page", () => {
  test.describe.configure({ mode: "serial" });

  const user = generateRandomTestUser();
  const ids: string[] = [];

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
      timeout: 30_000,
    });
  }

  test("empty state: no records yet → CTA links to chat root", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/history");
    await expect(page.getByRole("heading", { name: "历史记录" })).toBeVisible();
    await expect(page.getByText("还没有评估记录。")).toBeVisible();

    const cta = page.getByRole("link", { name: /开始第一次评估/ });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/");
  });

  test("populated: shows newest-first list with risk badge + summary", async ({
    page,
  }) => {
    await login(page);

    // Seed three assessments through the API (newest written last).
    for (const text of [
      "最近脱发明显", // low
      "化疗后手足麻木一直不缓解", // medium
      "化疗后高烧 39 度，呼吸困难", // high
    ]) {
      const res = await page.request.post("/api/assessment", {
        data: { inputText: text },
      });
      expect(res.status()).toBe(201);
      ids.push(((await res.json()) as { assessmentId: string }).assessmentId);
    }

    await page.goto("/history");
    await expect(
      page.getByRole("heading", { name: "历史记录" })
    ).toBeVisible();
    await expect(page.getByText(/共\s*3\s*条/)).toBeVisible();

    const links = page.locator('a[href^="/assess/"]');
    await expect(links).toHaveCount(3);

    // Newest first → first link points to the LAST id we created.
    await expect(links.first()).toHaveAttribute(
      "href",
      `/assess/${ids[2]}`
    );

    // Risk badges all present.
    for (const label of ["高 风险", "中 风险", "低 风险"]) {
      await expect(page.getByText(label)).toBeVisible();
    }
  });

  test("clicking a row opens the AssessmentCard for that record", async ({
    page,
  }) => {
    await login(page);
    await page.goto("/history");
    await page.locator(`a[href="/assess/${ids[0]}"]`).first().click();
    await page.waitForURL(`**/assess/${ids[0]}`);
    const card = page.getByTestId("assessment-card");
    await expect(card).toBeVisible();
    // Same text appears in card's input echo + matchedText excerpt — pin
    // to .first() so strict mode passes.
    await expect(card.getByText("最近脱发明显").first()).toBeVisible();
  });

  // The proxy middleware auto-issues a guest session before /history can
  // see "no session". So an anonymous visit lands on /history as a fresh
  // guest with zero records — it does NOT redirect to /login. (The
  // `if (!session?.user?.id) redirect("/login")` line in history/page.tsx
  // is therefore unreachable in practice.)
  test("anonymous user becomes a guest and sees the empty state on /history", async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/history");
    // Guest auto-login flow may briefly bounce through /api/auth/guest;
    // settle on /history.
    await page.waitForURL((u) => u.pathname === "/history", {
      timeout: 30_000,
    });
    await expect(page.getByRole("heading", { name: "历史记录" })).toBeVisible();
    await expect(page.getByText("还没有评估记录。")).toBeVisible();
    await ctx.close();
  });
});
