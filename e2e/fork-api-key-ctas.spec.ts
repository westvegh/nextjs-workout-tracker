import { test, expect } from "@playwright/test";

/**
 * Nav CTAs should be present on every demo page (Fork on GitHub + Get API key).
 * On the demo pages (/workouts, /exercises) a sticky footer should also link
 * to exerciseapi.dev.
 */

const GITHUB_URL = "https://github.com/westvegh/nextjs-workout-tracker";
const API_URL = "https://exerciseapi.dev";

const PAGES = ["/", "/exercises", "/workouts", "/workouts/new"];

test.describe("Fork + API key nav CTAs on every demo page", () => {
  for (const path of PAGES) {
    test(`nav CTAs present on ${path}`, async ({ page }) => {
      await page.goto(path);

      // Fork on GitHub link (nav version — hidden on mobile but we run desktop).
      const fork = page
        .getByRole("link", { name: /Fork on GitHub/i })
        .first();
      await expect(fork).toBeVisible();
      await expect(fork).toHaveAttribute("href", GITHUB_URL);

      // Get API key link in the nav.
      const apiKey = page
        .getByRole("link", { name: /Get API key/i })
        .first();
      await expect(apiKey).toBeVisible();
      await expect(apiKey).toHaveAttribute("href", API_URL);
    });
  }
});

test.describe("Sticky demo footer on demo pages", () => {
  const demoPages = ["/workouts", "/exercises"];
  for (const path of demoPages) {
    test(`demo footer present on ${path}`, async ({ page }) => {
      await page.goto(path);

      // The footer uses the phrase "Built with exerciseapi.dev".
      const footerLink = page.getByRole("link", { name: /exerciseapi\.dev/i });
      await expect(footerLink.first()).toBeVisible();
      await expect(
        page.getByText(/Built with exerciseapi\.dev/i)
      ).toBeVisible();
    });
  }
});
