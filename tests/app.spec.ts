import { expect, test } from "@playwright/test";

test("home and catalogue expose both puzzle types", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Find the pattern/ })).toBeVisible();
  await page.getByRole("button", { name: "Puzzles" }).click();
  await expect(page.getByText("Word craft")).toBeVisible();
  await expect(page.getByText("Puzzle desk")).toBeVisible();
});

test("word-search progress survives reload", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles" }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  await page.locator('[data-word-cell="2,0"]').click();
  await page.locator('[data-word-cell="6,4"]').click();
  await expect(page.getByText("Found").first()).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Puzzles" }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  await expect(page.getByText("Found").first()).toBeVisible();
});

test("crossword accepts keyboard input", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles" }).click();
  await page.locator('[data-open="cw-puzzle-desk-001"]').click();
  const first = page.locator('[data-crossword-cell="5"]');
  await first.fill("p");
  await expect(first).toHaveValue("P");
});

test("mobile layout keeps primary navigation usable", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only assertion");
  await page.goto("./");
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Create", exact: true })).toBeVisible();
});
