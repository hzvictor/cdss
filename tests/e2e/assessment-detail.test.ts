import { expect, test } from "@playwright/test";
import { generateRandomTestUser } from "../helpers";

const UUID_REGEX = /^[0-9a-f-]{36}$/;

test.describe("/api/assessment/[id] GET — security boundary", () => {
  test.describe.configure({ mode: "serial" });

  // We need TWO independent users for the cross-user 403 case. Each
  // owns one Playwright browser context so cookies don't bleed.
  const userA = generateRandomTestUser();
  const userB = generateRandomTestUser();
  let assessmentIdOwnedByA = "";

  test.beforeAll(async ({ browser }) => {
    // Each user needs its own context so session cookies do not bleed across.
    const ctxA = await browser.newContext();
    const a = await ctxA.newPage();
    await a.goto("/register");
    await a.getByLabel("Email").fill(userA.email);
    await a.getByLabel("Password").fill(userA.password);
    await a.getByRole("button", { name: "Sign Up" }).click();
    await a.waitForURL((u) => !u.pathname.startsWith("/register"));
    const res = await a.request.post("/api/assessment", {
      data: { inputText: "化疗后高烧 39 度" },
    });
    expect(res.status()).toBe(201);
    assessmentIdOwnedByA = ((await res.json()) as { assessmentId: string })
      .assessmentId;
    expect(assessmentIdOwnedByA).toMatch(UUID_REGEX);
    await ctxA.close();

    const ctxB = await browser.newContext();
    const b = await ctxB.newPage();
    await b.goto("/register");
    await b.getByLabel("Email").fill(userB.email);
    await b.getByLabel("Password").fill(userB.password);
    await b.getByRole("button", { name: "Sign Up" }).click();
    await b.waitForURL((u) => !u.pathname.startsWith("/register"));
    await ctxB.close();
  });

  async function loginAs(
    page: import("@playwright/test").Page,
    user: { email: string; password: string }
  ) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(user.email);
    await page.getByLabel("Password").fill(user.password);
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/login"));
  }

  test("owner A receives 200 with full bundle", async ({ page }) => {
    await loginAs(page, userA);
    const res = await page.request.get(
      `/api/assessment/${assessmentIdOwnedByA}`
    );
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      assessment: { id: string; userId: string; ruleVersion: string };
      advice: Array<{ priority: number }>;
      evidence: unknown[];
    };
    expect(body.assessment.id).toBe(assessmentIdOwnedByA);
    expect(body.assessment.ruleVersion).toBe("v2");
    // advice sorted ascending by priority
    const priorities = body.advice.map((a) => a.priority);
    const sorted = [...priorities].sort((x, y) => x - y);
    expect(priorities).toEqual(sorted);
  });

  test("foreign user B receives 403 (does NOT leak the bundle)", async ({
    page,
  }) => {
    await loginAs(page, userB);
    const res = await page.request.get(
      `/api/assessment/${assessmentIdOwnedByA}`
    );
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("forbidden");
    // body must not contain assessment data
    expect(JSON.stringify(body)).not.toContain("ruleVersion");
  });

  test("unknown id returns 404", async ({ page }) => {
    await loginAs(page, userA);
    const res = await page.request.get(
      "/api/assessment/00000000-0000-0000-0000-000000000000"
    );
    expect(res.status()).toBe(404);
  });

  test("/assess/[id] page redirects user B away from A's record", async ({
    page,
  }) => {
    await loginAs(page, userB);
    await page.goto(`/assess/${assessmentIdOwnedByA}`);
    // Per /assess/[id]/page.tsx:20: cross-user redirect to /history.
    await page.waitForURL((u) => u.pathname === "/history", {
      timeout: 15_000,
    });
    // Ensure no AssessmentCard data is visible.
    await expect(page.getByTestId("assessment-card")).toHaveCount(0);
  });
});
