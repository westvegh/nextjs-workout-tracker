import { test, expect } from "@playwright/test";

/**
 * The first-visit tutorial appears on the first /workouts view, dismisses
 * on completion, and never returns (localStorage flag wt_tutorial_seen_v1).
 */
test.use({ storageState: { cookies: [], origins: [] } });

test("first-visit tutorial shows once, then never again", async ({ page }) => {
  await page.goto("/workouts");

  const tutorial = page.getByRole("dialog", { name: "Welcome tutorial" });
  await expect(tutorial).toBeVisible();

  // Step through all 3 steps.
  await expect(tutorial).toContainText("Step 1 of 3");
  await tutorial.getByRole("button", { name: "Next" }).click();
  await expect(tutorial).toContainText("Step 2 of 3");
  await tutorial.getByRole("button", { name: "Next" }).click();
  await expect(tutorial).toContainText("Step 3 of 3");
  await tutorial.getByRole("button", { name: "Got it" }).click();

  // Tutorial hidden.
  await expect(tutorial).toBeHidden();

  // LocalStorage flag set.
  const flag = await page.evaluate(() =>
    window.localStorage.getItem("wt_tutorial_seen_v1")
  );
  expect(flag).toBe("1");

  // Navigate away and back.
  await page.goto("/");
  await page.goto("/workouts");

  // Tutorial should NOT reappear on second visit.
  await expect(tutorial).toBeHidden();
});
