import { test, expect, type Page } from "@playwright/test";

/**
 * "Has video" now maps to upstream ?hasVideo=true (exercise-api migration 030),
 * so /exercises?videos=1 returns ONLY video-backed exercises with an honest
 * total — no client-side post-filter or offset hack.
 *
 * Integration test: needs the live exerciseapi.dev (with the hasVideo filter)
 * and a local EXERCISEAPI_KEY.
 */
test("'Has video' filter shows only video exercises and can be toggled off", async ({
  page,
}) => {
  // Hide the Next.js dev error overlay so the test sees prod-visible surface only.
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "nextjs-portal { display: none !important; }";
    document.documentElement.appendChild(style);
  });

  await page.goto("/exercises?videos=1");

  // Filter checkbox is checked.
  const videoCheckbox = page.getByRole("checkbox", {
    name: /Only exercises with video/i,
  });
  await expect(videoCheckbox).toBeChecked();

  // Cards render (direct exercise-detail anchors).
  const cards = page.locator("a[href^='/exercises/']:not([href='/exercises'])");
  await expect
    .poll(async () => await cards.count(), { timeout: 15_000 })
    .toBeGreaterThan(0);

  // Defining invariant: EVERY visible card is video-backed. Video cards render a
  // "video" badge; non-video cards render "Video coming soon". With the filter
  // on there must be at least one badge and zero "coming soon" placeholders.
  await expect
    .poll(async () => await page.getByText(/^video$/i).count(), {
      timeout: 5_000,
    })
    .toBeGreaterThan(0);
  await expect(page.getByText(/Video coming soon/i)).toHaveCount(0);

  // Total reflects the (small) video set, not the full catalog.
  const filteredTotal = await readTotal(page);
  expect(filteredTotal).not.toBeNull();
  expect(filteredTotal as number).toBeLessThan(200);

  // Toggle OFF → URL drops videos=1 and the total jumps to the full catalog,
  // which also brings back "Video coming soon" placeholders.
  await videoCheckbox.uncheck();
  await expect(page).toHaveURL(/^(?!.*videos=1).*$/);
  await expect
    .poll(async () => await readTotal(page), { timeout: 10_000 })
    .toBeGreaterThan(1000);
});

// Reads the "N total" line ExerciseBrowser renders (e.g. "24 total", "2,198 total").
async function readTotal(page: Page): Promise<number | null> {
  const text = await page
    .getByText(/[\d,]+\s*total/i)
    .first()
    .textContent();
  if (!text) return null;
  const m = text.replace(/,/g, "").match(/(\d+)\s*total/i);
  return m ? Number(m[1]) : null;
}
