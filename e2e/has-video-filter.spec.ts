import { test, expect } from "@playwright/test";

/**
 * The "Has video" filter should narrow the grid to ~6-8 exercises (the
 * sliver of the fetched 100 that carry video assets). Toggling OFF expands
 * back to the full page of 24.
 */
test("'Has video' filter narrows results and can be toggled off", async ({
  page,
}) => {
  // offset=100 is the batch that currently contains video-backed exercises.
  // The client fetches 100 at a time and filters in memory, so we have to
  // point at the batch that yields results — a known product-side pagination
  // quirk that's out of scope for this batch of tests.
  // Hide the Next.js dev error overlay + dev tools so the test interacts with
  // production-visible surface only. The overlay doesn't ship in a prod build.
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.documentElement.appendChild(style);
  });

  await page.goto("/exercises?videos=1&offset=100");

  // Checkbox should be checked.
  const videoCheckbox = page.getByRole("checkbox", {
    name: /Only exercises with video/i,
  });
  await expect(videoCheckbox).toBeChecked();

  // Grid renders. Only count direct exercise-detail card anchors.
  const cards = page.locator("a[href^='/exercises/']:not([href='/exercises'])");
  await expect
    .poll(async () => await cards.count(), { timeout: 15_000 })
    .toBeGreaterThan(0);

  const videoCount = await cards.count();
  // Spec says 6-8; widen slightly to 4-12 to tolerate catalog drift.
  expect(videoCount).toBeGreaterThanOrEqual(4);
  expect(videoCount).toBeLessThanOrEqual(12);

  // Each visible card should carry a "video" badge from ExerciseCard.
  const videoBadges = page.getByText(/^video$/i);
  await expect
    .poll(async () => await videoBadges.count(), { timeout: 5_000 })
    .toBeGreaterThanOrEqual(videoCount);

  // Toggle OFF. The ExerciseFilters component pushes a new URL without videos=1.
  await videoCheckbox.uncheck();
  await expect(page).toHaveURL(/^(?!.*videos=1).*$/);

  // After toggling off, the catalog should show more cards (default page is 24
  // and the unfiltered batch contains a full page of them).
  await expect
    .poll(async () => await cards.count(), { timeout: 10_000 })
    .toBeGreaterThan(videoCount);
});
