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

test("word search supports pointer drag and keyboard navigation", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles" }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  const start = page.locator('[data-word-cell="2,0"]');
  const end = page.locator('[data-word-cell="6,4"]');
  await start.dragTo(end);
  await expect(page.getByText("Found").first()).toBeVisible();
  await start.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-word-cell="3,0"]')).toBeFocused();
});

test("settings restore a WTrack JSON backup", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings" }).click();
  page.on("dialog", (dialog) => dialog.accept());
  await page.locator('input[name="backup"]').setInputFiles({
    name: "wtrack-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      format: "wtrack-backup",
      exportedAt: "2026-10-13T00:00:00.000Z",
      data: { version: 1, preferences: { theme: "light", showTimer: false, checkAsYouType: true }, progress: {}, deletedProgress: {}, activePuzzleId: null, settingsUpdatedAt: 1, catalogueVersion: "2026.10.1" },
    })),
  });
  await page.getByRole("button", { name: "Restore backup" }).click();
  await expect(page.getByRole("status")).toContainText("Backup restored");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
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
