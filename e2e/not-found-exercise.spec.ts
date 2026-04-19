import { test, expect } from "@playwright/test";

/**
 * An invalid exercise id should render a clean not-found page with a link
 * back to the browser — not a server error.
 */
test("invalid exercise id shows clean not-found state", async ({ page }) => {
  const response = await page.goto(
    "/exercises/this-is-not-a-real-exercise-xyz123"
  );

  // Page itself should resolve (2xx or 404 from Next, but NOT 500).
  expect(response).not.toBeNull();
  const status = response!.status();
  expect(status, `expected <500 but got ${status}`).toBeLessThan(500);

  // Visible not-found copy.
  await expect(
    page.getByRole("heading", { name: /not found/i })
  ).toBeVisible();

  // Back link to the browser.
  const back = page.getByRole("link", { name: /back to browser/i });
  await expect(back).toBeVisible();

  await back.click();
  await expect(page).toHaveURL(/\/exercises$/);
});
