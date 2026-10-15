import { expect, test } from "@playwright/test";

test("the shared home exposes both complete game families", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "What would you like to play?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Sudoku/ })).toHaveAttribute("href", "/brain-games/sudoku/");
  await expect(page.getByRole("link", { name: /Open Word Games/ })).toHaveAttribute("href", "/brain-games/words/");
  await expect(page.getByText(/do not imply cognitive or health benefits/)).toBeVisible();

  await page.getByRole("link", { name: /Open Sudoku/ }).click();
  await expect(page.getByRole("button", { name: "STrack home" })).toBeVisible();
  await page.goto("/brain-games/words/");
  await expect(page.getByRole("button", { name: "WTrack home" })).toBeVisible();
});

test("the shared home fits a phone viewport without horizontal scrolling", async ({ page }) => {
  await page.goto("./");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("link", { name: /Open Sudoku/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Word Games/ })).toBeVisible();
});
