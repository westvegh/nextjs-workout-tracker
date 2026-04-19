import { test, expect } from "@playwright/test";

/**
 * Regression for the silent search bug: querying `search=bench` must return
 * only bench-related exercises. Pre-fix the API got `search=` (wrong param)
 * and returned the full unfiltered catalog.
 */
test("searching for 'bench' returns only bench-related exercises", async ({
  page,
}) => {
  // Hide the Next.js dev error overlay + dev tools portal so the test only
  // exercises production-visible surface. (The overlay doesn't ship in a
  // production build.)
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.documentElement.appendChild(style);
  });

  // Start with videos filter off so we browse the full catalog.
  await page.goto("/exercises?videos=0");

  // If the first-visit flag defaulted videos on, turn it off by unchecking.
  const videoCheckbox = page.getByRole("checkbox", {
    name: /Only exercises with video/i,
  });
  if (await videoCheckbox.isChecked().catch(() => false)) {
    await videoCheckbox.uncheck();
  }

  // Type into the search box and submit.
  const searchInput = page.getByPlaceholder("Search exercises");
  await searchInput.fill("bench");
  await searchInput.press("Enter");

  // URL should reflect the query.
  await expect(page).toHaveURL(/[?&]search=bench/);

  // Wait for the grid to re-render with filtered results.
  const cards = page.locator("a[href^='/exercises/']").filter({
    has: page.locator(":scope"),
  });
  // Allow the list to populate.
  await expect
    .poll(async () => await cards.count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(3);

  // Collect card text and assert every one mentions "bench".
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(3);

  const names: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = (await cards.nth(i).innerText()).toLowerCase();
    names.push(text);
    expect(text, `card ${i} should include "bench"`).toContain("bench");
  }

  // And definitely no unrelated results like the old regression bug.
  for (const n of names) {
    expect(n).not.toMatch(/1\.5 rep squat/i);
  }
});
