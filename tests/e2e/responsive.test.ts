import { expect, test } from "@playwright/test";

/**
 * Regression tests for the layout bug found during the responsive review:
 * an absolute-positioned Greeting was overlapping the SuggestedActions row
 * on shorter viewports. The fix moved Greeting into document flow (see
 * components/chat/messages.tsx). These tests pin both the visual fix and
 * the heading scale across breakpoints.
 */

test.describe("Responsive layout regressions", () => {
  test("375x812 (iPhone): Greeting bottom never overlaps suggestions", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    await page.waitForSelector("[data-testid='multimodal-input']");

    const heading = page.getByRole("heading", { level: 1 });
    const suggestions = page.getByTestId("suggested-actions");

    if ((await suggestions.count()) === 0) {
      test.skip(true, "no suggestions rendered; nothing to overlap");
      return;
    }

    // Wait for framer-motion to finish animating heading to opacity:1
    // (its initial state is opacity:0). This is a deterministic readiness
    // signal — no fixed sleep.
    await heading.waitFor({ state: "visible" });
    await expect
      .poll(
        async () =>
          await heading.evaluate(
            (el) => Number.parseFloat(getComputedStyle(el).opacity) >= 0.99
          ),
        { timeout: 10_000 }
      )
      .toBe(true);

    const headingBox = await heading.boundingBox();
    const suggestionsBox = await suggestions.boundingBox();
    expect(headingBox).not.toBeNull();
    expect(suggestionsBox).not.toBeNull();
    if (!(headingBox && suggestionsBox)) {
      return;
    }

    expect(headingBox.y + headingBox.height).toBeLessThan(suggestionsBox.y);
  });

  test("heading scales 28→44→56px across sm/md breakpoints", async ({
    page,
  }) => {
    const sizes = [
      { width: 375, expected: 28 },
      { width: 700, expected: 44 },
      { width: 1280, expected: 56 },
    ];

    for (const { width, expected } of sizes) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      await page.waitForSelector("[data-testid='multimodal-input']");
      const fontSize = await page
        .getByRole("heading", { level: 1 })
        .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize));
      expect(fontSize).toBe(expected);
    }
  });

  test("input row never overflows the viewport (no horizontal scroll)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForSelector("[data-testid='multimodal-input']");
    // Wait for layout to settle: heading opacity is animated; once it's at
    // 1.0 we know the page reached its rendered state.
    await expect
      .poll(
        async () =>
          await page
            .getByRole("heading", { level: 1 })
            .evaluate(
              (el) => Number.parseFloat(getComputedStyle(el).opacity) >= 0.99
            ),
        { timeout: 10_000 }
      )
      .toBe(true);

    const overflow = await page.evaluate(() => ({
      docW: document.documentElement.scrollWidth,
      vpW: window.innerWidth,
    }));
    expect(overflow.docW).toBeLessThanOrEqual(overflow.vpW + 1); // sub-px slack
  });

  test("desktop: SCOPE grid renders 2 columns ≥ sm breakpoint", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.waitForSelector("[data-testid='multimodal-input']");
    const dl = page.locator("dl").first();
    await expect(dl).toBeVisible();
    const cols = await dl.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns
    );
    expect(cols.split(" ").length).toBeGreaterThanOrEqual(2);
  });
});
