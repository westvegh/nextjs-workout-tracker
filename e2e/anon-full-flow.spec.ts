import { test, expect } from "@playwright/test";

/**
 * Anon visitor can walk the full demo without signing in:
 * land → workouts list → open example → start logging → finish → completed badge.
 */
test("anon can complete an example workout end-to-end", async ({ page }) => {
  // 1. Landing
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "A workout tracker you can fork in 30 minutes.",
    })
  ).toBeVisible();

  // 2. Go to workouts via nav
  await page.getByRole("link", { name: "Workouts", exact: true }).first().click();
  await expect(page).toHaveURL(/\/workouts$/);

  // 3. Dismiss the first-visit tutorial (3 steps)
  const tutorial = page.getByRole("dialog", { name: "Welcome tutorial" });
  if (await tutorial.isVisible().catch(() => false)) {
    await tutorial.getByRole("button", { name: "Next" }).click();
    await tutorial.getByRole("button", { name: "Next" }).click();
    await tutorial.getByRole("button", { name: "Got it" }).click();
    await expect(tutorial).toBeHidden();
  }

  // 4. Dismiss the guest banner if present — do not block.
  const bannerDismiss = page
    .locator("div", { hasText: "Browsing as a guest" })
    .first()
    .getByRole("button", { name: "Dismiss" });
  if (await bannerDismiss.isVisible().catch(() => false)) {
    await bannerDismiss.click();
  }

  // 5. Assert the three seeded example workouts are visible.
  await expect(page.getByText("Upper-body push", { exact: false })).toBeVisible();
  await expect(
    page.getByText("Lower-body strength", { exact: false })
  ).toBeVisible();
  await expect(
    page.getByText("Mobility + warm-up", { exact: false })
  ).toBeVisible();

  // 6. Click Upper-body push -> detail page
  await page.getByRole("link", { name: /Upper-body push/ }).first().click();
  await expect(page).toHaveURL(/\/workouts\/[^/]+$/);

  // 7. Workout name + at least one exercise visible
  await expect(
    page.getByRole("heading", { name: "Upper-body push" })
  ).toBeVisible();
  await expect(
    page.getByText("Barbell Bench Press (Medium Grip)", { exact: false })
  ).toBeVisible();

  // 8. Click Start workout
  await page.getByRole("button", { name: /Start workout/ }).click();
  await expect(page).toHaveURL(/\/workouts\/[^/]+\/log$/);

  // 9. Enter weight + reps on the first set and mark completed.
  const firstWeight = page.getByPlaceholder("Weight").first();
  const firstReps = page.getByPlaceholder("Reps").first();
  await firstWeight.fill("135");
  await firstReps.fill("10");

  // The completed toggle is an icon button with aria-label "Mark done".
  await page.getByRole("button", { name: "Mark done" }).first().click();

  // 10. Finish workout.
  await page.getByRole("button", { name: /Finish workout/ }).click();

  // 11. Redirected to detail with status "completed".
  await expect(page).toHaveURL(/\/workouts\/[^/]+$/);
  await expect(page.getByText(/completed/i).first()).toBeVisible();

  // 12. Back on /workouts the badge shows completed.
  await page.goto("/workouts");
  await expect(page.getByText(/completed/i).first()).toBeVisible();
});
