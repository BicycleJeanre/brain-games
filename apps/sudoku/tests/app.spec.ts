import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await page.waitForFunction(() => !("serviceWorker" in navigator) || Boolean(navigator.serviceWorker.controller));
  await page.waitForTimeout(100);
});

test("home, library and puzzle details expose the offline catalogue and SE provenance", async ({ page }) => {
  await expect(page.getByRole("heading", { name: /Good/ })).toBeVisible();
  await expect(page.getByText("See all 80")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Active puzzles" })).toBeVisible();
  await expect(page.getByText("0 of 4 today")).toBeVisible();
  await expect(page.getByText("0 of 4 this week")).toBeVisible();
  const activeTop = await page.getByRole("heading", { name: "Active puzzles" }).evaluate((element) => element.getBoundingClientRect().top);
  const chooseTop = await page.getByRole("heading", { name: "Choose your pace" }).evaluate((element) => element.getBoundingClientRect().top);
  expect(activeTop).toBeLessThan(chooseTop);
  await expect(page.getByRole("heading", { name: "Daily challenges" })).toBeVisible();
  await expect(page.locator("[data-challenge-puzzle]")).toHaveCount(4);
  await page.locator("[data-challenge-puzzle]").first().click();
  await expect(page.getByRole("grid", { name: "Sudoku board" })).toBeVisible();
  await page.getByRole("button", { name: "Sudoku home" }).click();
  await expect(page.locator(".active-section").getByText("Daily challenge")).toBeVisible();
  await page.getByRole("button", { name: "This week" }).click();
  await expect(page.getByRole("heading", { name: "Weekly challenges" })).toBeVisible();
  await expect(page.locator("[data-challenge-puzzle]")).toHaveCount(4);
  await page.getByRole("button", { name: "Puzzles" }).click();
  await expect(page.getByText("80 puzzles")).toBeVisible();
  await page.getByRole("button", { name: "Puzzle details" }).first().click();
  await expect(page.getByRole("dialog")).toContainText("SukakuExplainer");
  await expect(page.getByRole("dialog")).toContainText("Public domain");
  await expect(page.getByRole("dialog")).toContainText("not a universal or official difficulty scale");
});

test("a completed challenge continues to the next difficulty in the same period", async ({ page }) => {
  await page.locator("[data-challenge-puzzle]").first().click();
  const original = await page.evaluate(async () => {
    const request = indexedDB.open("strack-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction("state", "readwrite");
    const store = transaction.objectStore("state");
    const meta = await new Promise<any>((resolve, reject) => { const get = store.get("meta"); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const game = await new Promise<any>((resolve, reject) => { const get = store.get(`game:${meta.activeGameId}`); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const challenge = { ...game.challenge };
    game.values = [...game.puzzle.solution];
    game.completedAt = Date.now();
    game.updatedAt = game.completedAt;
    store.put(game, `game:${game.id}`);
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
    db.close();
    return challenge;
  });

  await page.reload();
  await page.getByRole("button", { name: /Review puzzle/ }).click();
  await expect(page.getByRole("button", { name: "Next: Medium" })).toBeVisible();
  await page.getByRole("button", { name: "Next: Medium" }).click();
  await expect(page.locator(".player-meta .difficulty")).toHaveText("Medium");
  const next = await page.evaluate(async () => {
    const request = indexedDB.open("strack-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction("state", "readonly");
    const store = transaction.objectStore("state");
    const meta = await new Promise<any>((resolve, reject) => { const get = store.get("meta"); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const game = await new Promise<any>((resolve, reject) => { const get = store.get(`game:${meta.activeGameId}`); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    db.close();
    return { challenge: game.challenge, difficulty: game.puzzle.difficulty };
  });
  expect(next).toEqual({ challenge: original, difficulty: "Medium" });
});

test("training teaches a pattern before revealing its deduction and retains completion", async ({ page }) => {
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Technique lessons" })).toBeVisible();
  await expect(page.locator("[data-training]")).toHaveCount(22);
  await page.getByRole("button", { name: /Fish & single-digit patterns/ }).click();
  await expect(page.getByRole("heading", { name: "Fish & single-digit patterns lessons" })).toBeVisible();
  await expect(page.locator(".lesson-card")).toHaveCount(6);
  await expect(page.getByRole("button", { name: /Fish & single-digit patterns/ })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Show all techniques" }).click();
  await expect(page.locator(".lesson-card")).toHaveCount(21);
  await page.getByRole("button", { name: /Naked single/ }).last().click();
  await expect(page.getByText("Step 1 · Worked example")).toBeVisible();
  const workedExample = await page.getByRole("grid", { name: "Training Sudoku grid" }).innerText();
  await page.getByRole("button", { name: "Practice with a new position" }).click();
  await expect(page.getByText(/Exercise 1 of 4/)).toBeVisible();
  await expect.poll(() => page.getByRole("grid", { name: "Training Sudoku grid" }).innerText()).not.toBe(workedExample);
  const firstPractice = await page.getByRole("grid", { name: "Training Sudoku grid" }).innerText();
  await page.getByRole("button", { name: "Show a clue" }).click();
  await expect(page.locator(".training-candidate.training-answer")).toHaveCount(0);
  await page.locator(".training-focus[data-training-select]").click();
  await page.getByRole("button", { name: "Check pattern" }).click();
  await expect(page.getByText("Step 3 · Make the deduction")).toBeVisible();
  await expect(page.locator(".training-candidate.training-answer")).toHaveCount(0);
  await page.getByRole("button", { name: "Show the answer" }).click();
  await page.locator(".training-candidate.training-answer").click();
  await expect(page.getByRole("heading", { name: "You used Naked single." })).toBeVisible();
  await page.getByRole("button", { name: "Practice another position" }).click();
  await expect(page.getByText(/Exercise 2 of 4/)).toBeVisible();
  await expect.poll(() => page.getByRole("grid", { name: "Training Sudoku grid" }).innerText()).not.toBe(firstPractice);
  await page.getByRole("button", { name: "← All training" }).click();
  await expect(page.getByRole("button", { name: /Naked single/ }).last()).toContainText("1 completed");
  await page.getByRole("button", { name: /X-Chain/ }).click();
  await expect(page.locator(".training-links .strong")).toHaveCount(3);
  await expect(page.locator(".training-links .weak")).toHaveCount(2);
  await expect(page.getByRole("link", { name: /HoDoKu reglib-1.3 · X_CHAIN/ })).toBeVisible();
});

test("training has the same value and candidate highlighting tools as the puzzle player", async ({ page }) => {
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await page.getByRole("button", { name: /Naked single/ }).last().click();
  await expect(page.locator("[data-training-highlight-digit]")).toHaveCount(9);

  const placed = page.locator("[data-training-value-cell]").first();
  const placedDigit = await placed.locator(".cell-value").textContent();
  expect(placedDigit).toMatch(/^[1-9]$/);
  await placed.click();
  await expect(placed).toHaveClass(/training-highlight-anchor/);
  await expect(page.locator(`[data-training-highlight-digit="${placedDigit}"]`)).toHaveClass(/active-digit/);
  expect(await page.locator(".training-cell.match").count()).toBeGreaterThan(0);
  expect(await page.locator(".training-cell.peer").count()).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Clear highlights" }).click();
  await expect(page.locator(".training-cell.match")).toHaveCount(0);
  await expect(page.locator(".training-cell.peer")).toHaveCount(0);

  const candidatePair = await page.locator(".training-cell").evaluateAll((cells) => {
    for (let cell = 0; cell < cells.length; cell++) {
      const digits = [...cells[cell].querySelectorAll<HTMLElement>(".training-candidates i, .training-candidate")].map((item) => item.textContent?.trim() || "").filter(Boolean);
      if (digits.length >= 2) return { cell, digits: digits.slice(0, 2) };
    }
    return null;
  });
  expect(candidatePair).not.toBeNull();
  for (const digit of candidatePair!.digits) await page.locator(`[data-training-highlight-digit="${digit}"]`).click();
  for (const digit of candidatePair!.digits) await expect(page.locator(`[data-training-highlight-digit="${digit}"]`)).toHaveClass(/active-digit/);
  await page.getByRole("button", { name: "All digits · AND" }).click();
  await expect(page.locator(".training-cell").nth(candidatePair!.cell)).toHaveClass(/note-match-cell/);
  await expect(page.locator(".training-cell").nth(candidatePair!.cell).locator(".note-match")).toHaveCount(2);

  await page.keyboard.press("Escape");
  await expect(page.locator(".training-cell.note-match-cell")).toHaveCount(0);
  await page.keyboard.press(candidatePair!.digits[0]);
  await expect(page.locator(`[data-training-highlight-digit="${candidatePair!.digits[0]}"]`)).toHaveClass(/active-digit/);
  await page.getByRole("heading", { name: "Naked single training" }).click();
  await expect(page.locator(".training-cell.note-match-cell")).toHaveCount(0);
});

test("Skyscraper training explains the shown strong links and eliminations in plain language", async ({ page }) => {
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await page.locator('[data-training="skyscraper"]').last().click();
  const explanation = page.locator(".lesson-explanation");
  await expect(explanation).toContainText("Column 6");
  await expect(explanation).toContainText("R3C6 or R5C6");
  await expect(explanation).toContainText("Column 9");
  await expect(explanation).toContainText("R3C9 or R6C9");
  await expect(explanation).toContainText("at least one roof is 6");
  await expect(explanation).toContainText("Remove 6 from R5C7, R5C8, R6C4 and R6C5");
  await expect(explanation).not.toContainText("r5c6,r6c9");
});

test("W-Wing training defines the rule and labels both wings and both strong-link ends", async ({ page }) => {
  await page.getByRole("button", { name: "Train", exact: true }).click();
  await page.locator('[data-training="w-wing"]').last().click();
  const explanation = page.locator(".lesson-explanation");
  await expect(explanation).toContainText("Rule in plain language:");
  await expect(explanation).toContainText("A W-Wing has no pivot");
  await expect(explanation).toContainText("Wing A");
  await expect(explanation).toContainText("R1C9 · candidates 1/4");
  await expect(explanation).toContainText("Wing B");
  await expect(explanation).toContainText("R8C7 · candidates 1/4");
  await expect(explanation).toContainText("Link end A");
  await expect(explanation).toContainText("Link end B");
  await expect(explanation).toContainText("strong link for 1 in Column 3");
  await expect(explanation).toContainText("at least one wing is 4");
  await expect(page.locator('.training-cell[aria-label*="hint role Wing A"] .hint-role-badge')).toHaveText("W1");
  await expect(page.locator('.training-cell[aria-label*="hint role Wing B"] .hint-role-badge')).toHaveText("W2");
  await expect(page.locator('.training-cell[aria-label*="hint role Link end A"] .hint-role-badge')).toHaveText("L1");
  await expect(page.locator('.training-cell[aria-label*="hint role Link end B"] .hint-role-badge')).toHaveText("L2");
});

test("the settings menu toggles back to the screen it opened from", async ({ page }) => {
  await page.getByRole("button", { name: "Settings and help" }).click();
  await expect(page.getByRole("heading", { name: "Settings & help" })).toBeVisible();
  await page.getByRole("button", { name: "Close settings and help" }).click();
  await expect(page.getByRole("heading", { name: /Good/ })).toBeVisible();

  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await expect(page.getByRole("grid", { name: "Sudoku board" })).toBeVisible();
  await page.getByRole("button", { name: "Settings and help" }).click();
  await page.getByRole("button", { name: "Close settings and help" }).click();
  await expect(page.getByRole("grid", { name: "Sudoku board" })).toBeVisible();
});

test("player settings support simple notes, compact tools and readable presets", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const legacyNoteCell = page.locator(".sudoku-cell:not(.given)").first();
  await legacyNoteCell.click();
  await page.getByRole("button", { name: "Corner", exact: true }).click();
  await page.getByRole("button", { name: "7", exact: true }).click();
  await expect(legacyNoteCell.locator(".corner-marks")).toContainText("7");
  await page.getByRole("button", { name: "Settings and help" }).click();
  await page.locator('[data-preference-select="noteStyle"]').selectOption("simple");
  for (const key of ["showColours", "showLines", "showValueSelection", "showCandidateCalculation", "showControlHelp"]) {
    await page.locator(`[data-preference="${key}"]`).uncheck();
  }
  await page.locator('[data-preference-select="digitSize"]').selectOption("large");
  await page.locator('[data-preference-select="digitColour"]').selectOption("amber");
  await page.locator('[data-preference-select="noteSize"]').selectOption("large");
  await page.locator('[data-preference-select="noteColour"]').selectOption("amber");
  await page.locator('[data-preference-select="menuSize"]').selectOption("large");
  await page.locator('[data-preference-select="menuColour"]').selectOption("bright");
  await page.locator('[data-preference-select="highlightColour"]').selectOption("violet");
  await expect(page.locator("html")).toHaveAttribute("data-note-size", "large");
  await expect(page.locator("html")).toHaveAttribute("data-highlight-colour", "violet");
  await page.getByRole("button", { name: "Close settings and help" }).click();

  const modes = page.getByRole("group", { name: "Entry mode" });
  await expect(modes).toContainText("Digit");
  await expect(modes).toContainText("Notes");
  await expect(modes).not.toContainText("Corner");
  await expect(modes).not.toContainText("Colour");
  await expect(modes).not.toContainText("Lines");
  await expect(page.getByRole("button", { name: "Highlight multiple values" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Calculate all candidates" })).toHaveCount(0);
  await expect(page.locator(".control-help")).toHaveCount(0);
  await expect(legacyNoteCell.locator(".corner-marks")).toHaveCount(0);
  await expect(legacyNoteCell.locator(".centre-marks")).toContainText("7");

  const empty = page.locator(".sudoku-cell:not(.given)");
  await empty.nth(0).click();
  await page.getByRole("button", { name: /Multi-select/ }).click();
  await empty.nth(1).click();
  await page.getByRole("button", { name: "Digit", exact: true }).click();
  await page.getByRole("button", { name: "4", exact: true }).click();
  await expect(empty.nth(0).locator(".corner-marks")).toHaveCount(0);
  await expect(empty.nth(1).locator(".corner-marks")).toHaveCount(0);
  await expect(empty.nth(0).locator(".centre-marks")).toContainText("4");
  await expect(empty.nth(1).locator(".centre-marks")).toContainText("4");
  expect(await empty.nth(0).locator(".centre-marks").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);
  expect(await page.getByRole("button", { name: "Notes", exact: true }).evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(12);

  await page.reload();
  await page.locator("[data-game]").first().click();
  await expect(page.getByRole("group", { name: "Entry mode" })).toContainText("Notes");
  await expect(page.getByRole("group", { name: "Entry mode" })).not.toContainText("Corner");
  await expect(page.locator("html")).toHaveAttribute("data-digit-colour", "amber");
});

test("the default three-mistake limit fails a puzzle on the fourth wrong digit", async ({ page }) => {
  await page.getByRole("button", { name: "Settings and help" }).click();
  await expect(page.locator('[data-preference="mistakeLimit"]')).toBeChecked();
  await expect(page.locator('[data-preference="showMistakes"]')).not.toBeChecked();
  await page.getByRole("button", { name: "Close settings and help" }).click();
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await expect(page.locator(".board-status")).not.toContainText("Mistakes");

  const wrongDigits = await page.evaluate(async () => {
    const request = indexedDB.open("strack-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction("state", "readonly");
    const store = transaction.objectStore("state");
    const meta = await new Promise<any>((resolve, reject) => { const get = store.get("meta"); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const game = await new Promise<any>((resolve, reject) => { const get = store.get(`game:${meta.activeGameId}`); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const answer = Number(game.puzzle.solution[game.anchor]);
    db.close();
    return [1, 2, 3, 4, 5].filter((digit) => digit !== answer).slice(0, 4);
  });

  for (const digit of wrongDigits.slice(0, 3)) await page.getByRole("button", { name: String(digit), exact: true }).click();
  await expect(page.locator(".board-status")).not.toContainText("Mistakes");
  await expect(page.locator(".failure-banner")).toHaveCount(0);
  await page.getByRole("button", { name: String(wrongDigits[3]), exact: true }).click();
  await expect(page.locator(".failure-banner")).toContainText("Puzzle failed");
  await expect(page.locator(".failure-banner")).toContainText("4 mistakes");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  await expect(page.locator(".number-pad [data-digit]").first()).toBeDisabled();
});

test("immediate mistake highlighting is optional and accessible", async ({ page }) => {
  await page.getByRole("button", { name: "Settings and help" }).click();
  const setting = page.locator('[data-preference="showMistakes"]');
  await expect(setting).not.toBeChecked();
  await setting.check();
  await page.getByRole("button", { name: "Close settings and help" }).click();
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await expect(page.locator(".board-status")).toContainText("Mistakes 0/3");

  const wrong = await page.evaluate(async () => {
    const request = indexedDB.open("strack-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction("state", "readonly");
    const store = transaction.objectStore("state");
    const meta = await new Promise<any>((resolve, reject) => { const get = store.get("meta"); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const game = await new Promise<any>((resolve, reject) => { const get = store.get(`game:${meta.activeGameId}`); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const answer = Number(game.puzzle.solution[game.anchor]);
    db.close();
    return [1, 2, 3, 4, 5].find((digit) => digit !== answer);
  });

  await page.getByRole("button", { name: String(wrong), exact: true }).click();
  await expect(page.locator(".board-status")).toContainText("Mistakes 1/3");
  await expect(page.locator(".sudoku-cell.mistake")).toHaveCount(1);
  await expect(page.locator(".sudoku-cell.mistake")).toHaveAttribute("aria-label", /incorrect/);
});

test("normal, corner, centre, colour, multi-select, undo and keyboard flows work", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const rowTracks = await page.getByRole("grid", { name: "Sudoku board" }).evaluate((board) => getComputedStyle(board).gridTemplateRows.split(" ").map(Number.parseFloat));
  expect(rowTracks).toHaveLength(9);
  expect(Math.max(...rowTracks) - Math.min(...rowTracks)).toBeLessThan(1);
  const empty = page.locator(".sudoku-cell:not(.given)");
  await empty.nth(0).click();
  await page.getByRole("button", { name: "Corner", exact: true }).click();
  await page.getByRole("button", { name: "1", exact: true }).click();
  await expect(empty.nth(0).locator(".corner-marks")).toContainText("1");
  await page.getByRole("button", { name: "Centre" }).click();
  await page.keyboard.press("2");
  await expect(empty.nth(0).locator(".centre-marks")).toContainText("2");
  await page.getByRole("button", { name: /Multi-select/ }).click();
  await empty.nth(1).click();
  await page.getByRole("button", { name: "Digit" }).click();
  await page.keyboard.press("3");
  await expect(empty.nth(0).locator(".corner-marks")).toContainText("3");
  await expect(empty.nth(1).locator(".corner-marks")).toContainText("3");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(empty.nth(1).locator(".corner-marks")).toHaveCount(0);
  await page.getByRole("button", { name: "Colour" }).click();
  await page.getByRole("button", { name: "Toggle cyan cell colour" }).click();
  await page.getByRole("button", { name: "Toggle amber cell colour" }).click();
  await expect(empty.nth(0).locator(".cell-colours i")).toHaveCount(2);
  await expect(empty.nth(0)).toHaveAttribute("aria-label", /colours cyan, amber/);
  await page.keyboard.press("Shift+ArrowRight");
  expect(await page.locator(".sudoku-cell.selected").count()).toBeGreaterThan(1);
});

test("double-clicking a sole centre note promotes it to the full digit", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const cell = page.locator(".sudoku-cell:not(.given)").first();
  await cell.click();
  await page.getByRole("button", { name: "Centre", exact: true }).click();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await expect(cell.locator(".centre-marks")).toContainText("2");

  await cell.dblclick();
  await expect(cell.locator(".cell-value")).toHaveText("2");
  await expect(cell.locator(".centre-marks")).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(cell.locator(".cell-value")).toHaveCount(0);
  await expect(cell.locator(".centre-marks")).toContainText("2");
});

test("nine colours subdivide cells and coloured lines can be drawn, recoloured and undone", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const cells = page.locator(".sudoku-cell");
  const empty = page.locator(".sudoku-cell:not(.given)");
  await empty.nth(0).click();
  await page.getByRole("button", { name: "Colour" }).click();
  await expect(page.getByRole("group", { name: "Entry mode" })).toContainText("Lines");
  await expect(page.locator("[data-colour]")).toHaveCount(9);
  for (const colour of ["cyan", "amber", "indigo"]) await page.getByRole("button", { name: `Toggle ${colour} cell colour` }).click();
  await expect(empty.nth(0).locator(".cell-colours i")).toHaveCount(3);
  await expect(empty.nth(0).locator(".colour-cues i")).toHaveCount(3);
  await page.getByLabel("Colour to clear").selectOption("amber");
  await page.getByRole("button", { name: "Clear amber everywhere" }).click();
  await expect(empty.nth(0).locator(".cell-colours i")).toHaveCount(2);
  await page.getByRole("button", { name: "Clear all cell colours" }).click();
  await expect(empty.nth(0).locator(".cell-colours i")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(empty.nth(0).locator(".cell-colours i")).toHaveCount(2);

  await page.getByRole("button", { name: "Lines" }).click();
  await page.getByRole("button", { name: "Use rose line colour" }).click();
  await cells.nth(0).dragTo(cells.nth(10));
  const line = page.locator(".annotation-line:not(.preview)");
  await expect(line).toHaveCount(1);
  await expect(line).toHaveClass(/colour-rose/);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(line).toHaveCount(0);
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(line).toHaveCount(1);
  await page.getByLabel("Colour to clear").selectOption("rose");
  await page.getByRole("button", { name: "Clear rose lines" }).click();
  await expect(line).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(line).toHaveCount(1);
  await page.getByRole("button", { name: "Clear all lines" }).click();
  await expect(line).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(line).toHaveCount(1);

  await cells.nth(0).click();
  await page.keyboard.press("Shift+ArrowRight");
  await expect(page.getByRole("button", { name: "Connect selected cells" })).toBeEnabled();
});

test("all candidates replace corner notes with centre notes as one undoable action", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const empty = page.locator(".sudoku-cell:not(.given):not(.has-value)");
  await expect(empty.first()).toBeVisible();
  const emptyCount = await empty.count();
  await empty.first().click();
  await page.getByRole("button", { name: "Corner", exact: true }).click();
  await page.getByRole("button", { name: "1", exact: true }).click();
  await expect(empty.first().locator(".corner-marks")).toContainText("1");
  await page.getByRole("button", { name: "Calculate all candidates" }).click();
  await expect(page.locator(".sudoku-cell:not(.given) .corner-marks")).toHaveCount(0);
  await expect(page.locator(".sudoku-cell:not(.given):not(.has-value) .centre-marks")).toHaveCount(emptyCount);
  await expect(page.getByText("Candidates calculated for every empty cell")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(empty.first().locator(".corner-marks")).toContainText("1");
  await expect(page.locator(".sudoku-cell:not(.given) .centre-marks")).toHaveCount(0);
});

test("peer shading appears only when the selected cell contains a value", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const empty = page.locator(".sudoku-cell:not(.given)").first();
  await empty.click();
  await expect(page.locator(".sudoku-cell.peer")).toHaveCount(0);
  await page.getByRole("button", { name: "Corner", exact: true }).click();
  await page.locator('[data-digit="4"]').click();
  await expect(empty.locator(".corner-marks")).toContainText("4");
  await expect(page.locator(".sudoku-cell.peer")).toHaveCount(0);
  await page.getByRole("button", { name: "Digit", exact: true }).click();
  await page.locator('[data-digit="5"]').click();
  await expect(empty.locator(".cell-value")).toHaveText("5");
  expect(await page.locator(".sudoku-cell.peer").count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Corner", exact: true }).click();
  await page.locator('[data-digit="4"]').click();
  await expect(empty.locator(".corner-marks")).toHaveCount(0);
  await expect(empty.locator(".cell-value")).toHaveText("5");
  await page.getByRole("button", { name: "Centre", exact: true }).click();
  await page.locator('[data-digit="6"]').click();
  await expect(empty.locator(".centre-marks")).toHaveCount(0);
  await expect(empty.locator(".cell-value")).toHaveText("5");
  await page.getByRole("button", { name: "Digit", exact: true }).click();
  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator(".sudoku-cell.peer")).toHaveCount(0);
});

test("home separates completed puzzles and allows individual deletion", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await page.getByRole("button", { name: /Home/ }).click();
  await expect(page.getByRole("heading", { name: "Active puzzles" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Completed puzzles", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Delete recent Easy puzzle/ }).click();
  await page.getByRole("button", { name: "Delete puzzle", exact: true }).click();
  await expect(page.getByRole("heading", { name: "No puzzles in progress" })).toBeVisible();

  await page.getByRole("button", { name: "Medium Pairs and locked" }).click();
  await page.evaluate(async () => {
    const request = indexedDB.open("strack-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction("state", "readwrite");
    const store = transaction.objectStore("state");
    const meta = await new Promise<any>((resolve, reject) => { const get = store.get("meta"); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const game = await new Promise<any>((resolve, reject) => { const get = store.get(`game:${meta.activeGameId}`); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    game.completedAt = Date.now();
    game.paused = true;
    game.updatedAt = Date.now();
    store.put(game, `game:${game.id}`);
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
    db.close();
  });
  await page.reload();
  await expect(page.getByRole("button", { name: /Review Medium puzzle/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "No puzzles in progress" })).toBeVisible();
});

test("dragging across cells paints a multi-cell selection while clicks stay singular", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const empty = page.locator(".sudoku-cell:not(.given)");
  const start = await empty.nth(0).boundingBox();
  const end = await empty.nth(8).boundingBox();
  expect(start).not.toBeNull();
  expect(end).not.toBeNull();

  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
  await page.mouse.down();
  await page.mouse.move(end!.x + end!.width / 2, end!.y + end!.height / 2, { steps: 12 });
  await page.mouse.up();

  await expect(empty.nth(0)).toHaveClass(/selected/);
  await expect(empty.nth(8)).toHaveClass(/selected/);
  expect(await page.locator(".sudoku-cell.selected").count()).toBeGreaterThan(1);

  await empty.nth(2).click();
  await expect(empty.nth(2)).toHaveClass(/selected/);
  await expect(page.locator(".sudoku-cell.selected")).toHaveCount(1);
});

test("the last entered digit remains active and highlights matching grid values", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const digit = await page.locator(".sudoku-cell.given .cell-value").first().textContent();
  expect(digit).toMatch(/^[1-9]$/);
  const empty = page.locator(".sudoku-cell:not(.given)");

  await empty.nth(0).click();
  await page.getByRole("button", { name: digit!, exact: true }).click();
  await expect(page.locator(`[data-digit="${digit}"]`)).toHaveClass(/active-digit/);
  expect(await page.locator(".sudoku-cell.match").count()).toBeGreaterThan(1);

  await page.getByRole("button", { name: "Corner", exact: true }).click();
  await empty.nth(1).click();
  await page.getByRole("button", { name: digit!, exact: true }).click();
  await expect(empty.nth(1).locator(".corner-marks")).toContainText(digit!);
  await expect(page.locator(`[data-digit="${digit}"]`)).toHaveClass(/active-digit/);
  expect(await page.locator(".sudoku-cell.match").count()).toBeGreaterThan(0);
});

test("selecting a placed value highlights matching corner and centre notes", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const digit = await page.locator(".sudoku-cell.given .cell-value").first().textContent();
  expect(digit).toMatch(/^[1-9]$/);
  const empty = page.locator(".sudoku-cell:not(.given)");

  await empty.nth(0).click();
  await page.getByRole("button", { name: "Corner", exact: true }).click();
  await page.locator(`[data-digit="${digit}"]`).click();
  await empty.nth(1).click();
  await page.getByRole("button", { name: "Centre", exact: true }).click();
  await page.locator(`[data-digit="${digit}"]`).click();
  const cornerNote = empty.nth(0).locator(".corner-marks i");
  const centreNote = empty.nth(1).locator(".centre-marks i");
  await expect(cornerNote).toHaveText(digit!);
  await expect(centreNote).toHaveText(digit!);
  const phoneNoteSizes = await Promise.all([cornerNote, centreNote].map((note) => note.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))));
  expect(phoneNoteSizes[0]).toBeGreaterThanOrEqual(10);
  expect(phoneNoteSizes[1]).toBeGreaterThanOrEqual(11);

  const matchingValue = page.locator(".sudoku-cell.given").filter({ has: page.locator(`.cell-value:text-is("${digit}")`) }).first();
  await matchingValue.click();
  const cornerMatch = empty.nth(0).locator(".corner-marks .note-match");
  const centreMatch = empty.nth(1).locator(".centre-marks .note-match");
  await expect(cornerMatch).toHaveText(digit!);
  await expect(centreMatch).toHaveText(digit!);
  await expect(empty.nth(0)).toHaveClass(/note-match-cell/);
  await expect(empty.nth(1)).toHaveClass(/note-match-cell/);
  const noteCellBackground = await empty.nth(0).evaluate((element) => getComputedStyle(element).backgroundColor);
  await expect(empty.nth(1)).toHaveCSS("background-color", noteCellBackground);
  await expect(page.locator(".sudoku-cell.match:not(.selected)").first()).toHaveCSS("background-color", noteCellBackground);
  expect(await empty.nth(2).evaluate((element) => getComputedStyle(element).backgroundColor)).not.toBe(noteCellBackground);
  expect(await page.locator(".note-match").count()).toBeGreaterThanOrEqual(2);
  const readMatchStyle = (match: typeof cornerMatch) => match.evaluate((element) => {
    const style = getComputedStyle(element);
    return { color: style.color, background: style.backgroundColor, outline: style.outlineStyle, size: Number.parseFloat(style.fontSize), transform: style.transform, weight: Number(style.fontWeight) };
  });
  let matchStyles: Awaited<ReturnType<typeof readMatchStyle>>[] = [];
  await expect.poll(async () => {
    matchStyles = [await readMatchStyle(cornerMatch), await readMatchStyle(centreMatch)];
    return matchStyles.every((style) => Boolean(style.color));
  }).toBe(true);
  expect(matchStyles[0].color).not.toBe(matchStyles[1].color);
  for (const style of matchStyles) {
    expect(style.background).toBe("rgba(0, 0, 0, 0)");
    expect(style.outline).toBe("none");
    expect(style.transform).toBe("none");
    expect(style.weight).toBeGreaterThanOrEqual(900);
  }
  expect(matchStyles[0].size).toBeGreaterThanOrEqual(12);
  expect(matchStyles[1].size).toBeGreaterThanOrEqual(13);
});

test("selecting a placed value highlights matching automatic candidates", async ({ page }) => {
  await page.getByRole("button", { name: "Settings and help" }).click();
  await page.getByRole("switch", { name: /Automatic candidates/ }).check();
  await page.getByRole("button", { name: "Sudoku home" }).click();
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const given = page.locator(".sudoku-cell.given").first();
  const digit = await given.locator(".cell-value").textContent();
  await given.click();
  const matches = page.locator(".centre-marks.auto .note-match");
  expect(await matches.count()).toBeGreaterThan(0);
  await expect(matches.first()).toHaveText(digit!);
  await expect(matches.first().locator("xpath=ancestor::button[contains(@class, 'sudoku-cell')]")).toHaveClass(/note-match-cell/);
  expect(await matches.first().evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
});

test("the number buttons form a three by three keypad", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const digits = page.locator("[data-digit]");
  await expect(digits).toHaveCount(9);
  const layout = await digits.evaluateAll((buttons) => buttons.map((button) => {
    const box = button.getBoundingClientRect();
    return { left: Math.round(box.left), top: Math.round(box.top), width: box.width };
  }));
  const columns = [...new Set(layout.map((box) => box.left))];
  const rows = [...new Set(layout.map((box) => box.top))];
  expect(columns).toHaveLength(3);
  expect(rows).toHaveLength(3);
  for (const row of rows) expect(layout.filter((box) => box.top === row)).toHaveLength(3);
  const clearWidth = (await page.getByRole("button", { name: "Clear" }).boundingBox())!.width;
  expect(clearWidth).toBeGreaterThan(layout[0].width * 2.8);
});

test("corner notes remain separate from cell values and multi-cell toggles converge", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const empty = page.locator(".sudoku-cell:not(.given)");
  await empty.nth(0).click();
  await page.getByRole("button", { name: "Corner", exact: true }).click();
  await page.getByRole("button", { name: "4", exact: true }).click();
  await page.getByRole("button", { name: "Centre", exact: true }).click();
  await page.getByRole("button", { name: "6", exact: true }).click();
  const cell = page.locator(".sudoku-cell.selected").first();
  const corner = cell.locator(".corner-marks");
  const centre = cell.locator(".centre-marks");
  await expect(corner.locator("i")).toHaveText("4");
  await expect(centre.locator("i")).toHaveText("6");
  const noteStyles = await cell.evaluate((element) => {
    const cornerMarks = element.querySelector<HTMLElement>(".corner-marks")!;
    const centreMarks = element.querySelector<HTMLElement>(".centre-marks")!;
    const cornerLayout = getComputedStyle(cornerMarks);
    const centreLayout = getComputedStyle(centreMarks);
    return {
      corner: { position: cornerLayout.position, justify: cornerLayout.justifyContent, wrap: cornerLayout.flexWrap },
      centre: { position: centreLayout.position, justify: centreLayout.justifyContent, transform: centreLayout.transform, wrap: centreLayout.flexWrap },
      cornerColour: getComputedStyle(cornerMarks.querySelector("i")!).color,
      centreColour: getComputedStyle(centreMarks.querySelector("i")!).color,
    };
  });
  expect(noteStyles.corner).toEqual({ position: "absolute", justify: "flex-start", wrap: "wrap" });
  expect(noteStyles.centre.position).toBe("absolute");
  expect(noteStyles.centre.justify).toBe("center");
  expect(noteStyles.centre.transform).not.toBe("none");
  expect(noteStyles.centre.wrap).toBe("wrap");
  expect(noteStyles.cornerColour).not.toBe(noteStyles.centreColour);
  await page.getByRole("button", { name: "Digit" }).click();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await expect(empty.nth(0).locator(".cell-value")).toHaveText("5");
  await expect(empty.nth(0).locator(".corner-marks")).toHaveCount(0);
  await expect(empty.nth(0).locator(".centre-marks")).toHaveCount(0);
  await expect(empty.nth(0)).toHaveClass(/has-value/);
  await expect(empty.nth(0)).not.toHaveClass(/has-corner/);
  expect(await cell.locator(".cell-value").evaluate((element) => getComputedStyle(element).position)).toBe("relative");

  await page.getByRole("button", { name: "Corner", exact: true }).click();
  await page.getByRole("button", { name: /Multi-select/ }).click();
  await empty.nth(1).click();
  await page.getByRole("button", { name: "4", exact: true }).click();
  await expect(empty.nth(0).locator(".corner-marks")).toHaveCount(0);
  await expect(empty.nth(1).locator(".corner-marks")).toContainText("4");
  await page.getByRole("button", { name: "4", exact: true }).click();
  await expect(empty.nth(0).locator(".corner-marks")).toHaveCount(0);
  await expect(empty.nth(1).locator(".corner-marks")).toHaveCount(0);
});

test("highlight mode selects multiple values and clicking outside clears every highlight", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const empty = page.locator(".sudoku-cell:not(.given)");
  await empty.nth(0).click();
  await page.getByRole("button", { name: "Centre", exact: true }).click();
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "2", exact: true }).click();
  await empty.nth(1).click();
  await page.getByRole("button", { name: "1", exact: true }).click();
  await page.getByRole("button", { name: "Highlight multiple values" }).click();
  await expect(page.locator(".sudoku-cell.selected")).toHaveCount(0);
  await expect(page.getByText("Highlight cells containing:")).toBeVisible();

  for (const digit of ["1", "2"]) await page.locator(`[data-digit="${digit}"]`).click();
  for (const digit of ["1", "2"]) await expect(page.locator(`[data-digit="${digit}"]`)).toHaveClass(/active-digit/);
  await expect(empty.nth(0)).toHaveClass(/note-match-cell/);
  await expect(empty.nth(1)).toHaveClass(/note-match-cell/);
  await page.getByRole("button", { name: "All digits · AND" }).click();
  await expect(page.getByRole("button", { name: "All digits · AND" })).toHaveAttribute("aria-pressed", "true");
  await expect(empty.nth(0)).toHaveClass(/note-match-cell/);
  await expect(empty.nth(1)).not.toHaveClass(/note-match-cell/);
  await expect(page.locator(".sudoku-cell.match")).toHaveCount(0);
  await page.locator(".controls").dispatchEvent("click");
  for (const digit of ["1", "2"]) await expect(page.locator(`[data-digit="${digit}"]`)).not.toHaveClass(/active-digit/);
  await expect(page.locator(".sudoku-cell.match")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Highlight multiple values" })).toHaveAttribute("aria-pressed", "false");
});

test("solving the puzzle triggers a reduced-motion-safe completion celebration", async ({ page }) => {
  const nearlySolved = "534678912672195348198342567859761423426853791713924856961537284287419635345286170";
  await page.getByRole("button", { name: "Open" }).click();
  await page.getByLabel("81-character puzzle").fill(nearlySolved);
  await page.getByRole("button", { name: "Validate puzzle" }).click();
  await page.getByRole("button", { name: "Play now" }).click();
  await page.getByRole("button", { name: "9", exact: true }).click();
  await expect(page.getByText("Puzzle complete!", { exact: true })).toBeVisible();
  await expect(page.locator(".sudoku-board")).toHaveClass(/celebrating/);
  await expect(page.locator(".completion-confetti i")).toHaveCount(14);
  expect(await page.locator(".completion-banner").evaluate((element) => getComputedStyle(element).animationName)).toBe("completion-arrive");
});

test("number-pad digits grey out after all nine are placed and recover on undo", async ({ page }) => {
  await page.getByRole("button", { name: "Settings and help" }).click();
  await page.locator('[data-preference="mistakeLimit"]').uncheck();
  await page.getByRole("button", { name: "Close settings and help" }).click();
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await expect(page.getByRole("grid", { name: "Sudoku board" })).toBeVisible();
  const digit = "5";
  const placed = await page.locator(".sudoku-cell .cell-value").allTextContents();
  const needed = 9 - placed.filter((value) => value === digit).length;
  const editable = page.locator(".sudoku-cell:not(.given)");
  for (let index = 0; index < needed; index++) {
    await editable.nth(index).click();
    await expect(editable.nth(index)).toHaveClass(/selected/);
    await page.locator(`[data-digit="${digit}"]`).click();
    await expect(editable.nth(index).locator(".cell-value")).toHaveText(digit);
  }
  const button = page.locator(`[data-digit="${digit}"]`);
  await expect(button).toHaveClass(/complete-digit/);
  await expect(button).toHaveAttribute("aria-label", "5, all placed");
  expect(Number(await button.evaluate((element) => getComputedStyle(element).opacity))).toBeLessThan(1);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(button).not.toHaveClass(/complete-digit/);
  await expect(button).toHaveAttribute("aria-label", "5");
});

test("hints can show answers, be dismissed, and remain available in history", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await page.getByRole("button", { name: "Get a logical hint" }).click();
  const hint = page.locator(".hint-panel");
  await expect(hint).not.toContainText(/\b[1-9]\b/);
  await expect(hint.locator(".hint-answer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Apply deduction" })).toHaveCount(0);
  await expect(page.locator(".sudoku-cell.hint-target")).toHaveCount(0);
  await expect(page.locator(".sudoku-cell.hint-focus, .sudoku-cell.hint-evidence")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show answer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show pattern" })).toBeVisible();
  await page.getByRole("button", { name: "Show pattern" }).click();
  await expect.poll(() => page.locator(".sudoku-cell.hint-focus").count()).toBeGreaterThan(0);
  await expect(page.getByRole("button", { name: "Show answer" })).toBeVisible();
  const reasoning = page.locator(".hint-reasoning");
  await expect(reasoning).toHaveAttribute("open", "");
  await expect(reasoning.locator("summary")).toContainText("Learn and walk through");
  await expect(reasoning).toContainText("What the rule means");
  await expect(reasoning).toContainText("Why it works");
  await expect(reasoning).toContainText("How to spot it");
  await expect(reasoning.locator("li")).not.toHaveCount(0);
  await expect(reasoning).toContainText(/Row [1-9], column [1-9]/);
  await expect(page.getByRole("button", { name: "Dismiss hint" })).toBeVisible();

  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.locator(".hint-answer")).toContainText(/(Place|Remove) [1-9]/);
  await expect(page.getByRole("button", { name: "Apply deduction" })).toBeVisible();
  expect(await page.locator(".sudoku-cell.hint-target").count()).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Dismiss hint" }).click();
  await expect(page.locator(".hint-panel")).toHaveCount(0);

  await page.getByRole("button", { name: "Get a logical hint" }).click();
  await expect(page.locator(".hint-panel .hint-answer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Apply deduction" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Show pattern" })).toBeVisible();
  await page.getByRole("button", { name: "Show pattern" }).click();
  await expect(page.getByRole("button", { name: "Show answer" })).toBeVisible();
  await page.getByRole("button", { name: "Dismiss hint" }).click();

  await page.getByRole("button", { name: "Previous hints (1)" }).click();
  const history = page.getByRole("dialog");
  await expect(history).toContainText("Previous hints");
  await expect(history).toContainText("Dismissed");
  await expect(history.locator(".hint-answer")).toHaveCount(0);
  await expect(history.getByRole("button", { name: "Show answer" })).toHaveCount(0);
  await history.getByRole("button", { name: "Review hint" }).click();

  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".hint-panel")).toContainText("Previous hint · Minimal hint");
  await expect(page.locator(".hint-panel .hint-answer")).toHaveCount(0);
  await expect(page.locator(".sudoku-cell.hint-target, .sudoku-cell.hint-focus, .sudoku-cell.hint-evidence")).toHaveCount(0);
  await page.getByRole("button", { name: "Show pattern" }).click();
  await expect(page.locator(".hint-panel")).toContainText("Previous hint ·");
  await expect.poll(() => page.locator(".sudoku-cell.hint-focus, .sudoku-cell.hint-evidence").count()).toBeGreaterThan(0);
  await expect(page.locator(".hint-panel .hint-answer")).toHaveCount(0);
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.locator(".hint-panel .hint-answer")).toContainText(/(Place|Remove) [1-9]/);
  await expect(page.getByRole("button", { name: "Apply deduction" })).toHaveCount(0);
  await page.getByRole("button", { name: "Close review" }).click();
  await expect(page.locator(".hint-panel")).toHaveCount(0);
});

test("a blocked candidate state offers an undoable rebuild instead of a stale engine-limit toast", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await page.evaluate(async () => {
    const request = indexedDB.open("strack-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction("state", "readwrite");
    const state = transaction.objectStore("state");
    const meta = await new Promise<any>((resolve, reject) => { const get = state.get("meta"); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const game = await new Promise<any>((resolve, reject) => { const get = state.get(`game:${meta.activeGameId}`); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const empty = game.values.findIndex((value: string) => !value);
    game.eliminated[empty] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    game.hintPath = undefined;
    state.put(game, `game:${game.id}`);
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
    db.close();
  });
  await page.reload();
  await page.getByRole("button", { name: /Open Easy puzzle/ }).click();
  await page.getByRole("button", { name: "Get a logical hint" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Your candidate notes are blocking the next hint");
  await expect(dialog).toContainText("sudokUI can continue from the placed digits");
  await expect(page.locator("#toast")).not.toContainText("HoDoKu");
  await dialog.getByRole("button", { name: "Rebuild candidates" }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole("button", { name: "Get a logical hint" }).click();
  await expect(page.locator(".hint-panel")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".hint-panel")).toHaveCount(0);
});

test("BUG +1 teaches the exceptional candidate before revealing the exact placement", async ({ page }) => {
  const position = "548162000903480026026390480360004870807003600452876000285741369030629008600538210";
  const candidateRows = [
    ["", "", "", "", "", "", "79", "39", "37"],
    ["", "17", "", "", "", "57", "15", "", ""],
    ["17", "", "", "", "", "57", "", "", "15"],
    ["", "", "19", "29", "15", "", "", "", "25"],
    ["", "19", "", "29", "15", "", "", "45", "245"],
    ["", "", "", "", "", "", "19", "39", "13"],
    ["", "", "", "", "", "", "", "", ""],
    ["17", "", "14", "", "", "", "57", "45", ""],
    ["", "79", "49", "", "", "", "", "", "47"],
  ];

  await page.getByRole("button", { name: "Open" }).click();
  await page.getByLabel("81-character puzzle").fill(position);
  await page.getByRole("button", { name: "Validate puzzle" }).click();
  await page.getByRole("button", { name: "Play now" }).click();
  await page.evaluate(async (centre) => {
    const request = indexedDB.open("strack-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction("state", "readwrite");
    const store = transaction.objectStore("state");
    const meta = await new Promise<any>((resolve, reject) => { const get = store.get("meta"); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const game = await new Promise<any>((resolve, reject) => { const get = store.get(`game:${meta.activeGameId}`); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    game.centre = centre;
    game.eliminated = Array.from({ length: 81 }, () => []);
    game.hintStage = "none";
    game.hintId = null;
    store.put(game, `game:${game.id}`);
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
    db.close();
  }, candidateRows.flat().map((digits) => [...digits].map(Number)));
  await page.reload();
  await page.locator("[data-game]").first().click();
  await page.getByRole("button", { name: "Get a logical hint" }).click();
  await page.getByRole("button", { name: "Show pattern" }).click();

  const panel = page.locator(".hint-panel");
  await expect(panel).toContainText("All unsolved cells are bivalue cells except one with three candidates");
  await expect(panel).toContainText("Why it works");
  await expect(panel).toContainText("Without X in that cell, the grid would be all bivalue cells");
  await expect(panel).toContainText("the one cell with three candidates; 5 is the extra");
  await expect(panel).toContainText("Row 5, column 9 · 5");
  await expect(panel).toContainText("Its row, column and box, each holding 5 three times");
  await expect(panel).toContainText("Your turn:");
  await expect(panel).not.toContainText("Place 5 in Row 5, column 9");
  await expect(panel.locator(".hint-answer")).toHaveCount(0);
  await expect(page.locator('[data-cell="44"] .hint-role-badge')).toHaveText("B");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);

  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(panel.locator(".hint-answer")).toContainText("Place 5 in Row 5, column 9");
});

test("a supported hint opens its matching strategy lesson", async ({ page }) => {
  const nakedSinglePosition = "8.9.4..2..46.1....3..9........1..9455.......6983..6........4..1....9.37..3..7.4.9";
  await page.getByRole("button", { name: "Open" }).click();
  await page.getByLabel("81-character puzzle").fill(nakedSinglePosition);
  await page.getByRole("button", { name: "Validate puzzle" }).click();
  await page.getByRole("button", { name: "Play now" }).click();
  await page.getByRole("button", { name: "Get a logical hint" }).click();
  await page.getByRole("button", { name: "Show pattern" }).click();
  const practice = page.getByRole("button", { name: /Practice Naked single/ });
  await expect(practice).toBeVisible();
  await practice.click();
  await expect(page.getByRole("heading", { name: "Naked single", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Practice with a new position" })).toBeVisible();
});

test("an already-applied saved hint is not reopened after restart", async ({ page }) => {
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await page.getByRole("button", { name: "Get a logical hint" }).click();
  await page.getByRole("button", { name: "Show pattern" }).click();
  await page.getByRole("button", { name: "Show answer" }).click();
  const appliedHintId = await page.evaluate(async () => {
    const request = indexedDB.open("strack-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction("state", "readonly");
    const store = transaction.objectStore("state");
    const meta = await new Promise<any>((resolve, reject) => { const get = store.get("meta"); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const game = await new Promise<any>((resolve, reject) => { const get = store.get(`game:${meta.activeGameId}`); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    db.close();
    return game.hintId as string;
  });
  await page.getByRole("button", { name: "Apply deduction" }).click();

  await page.evaluate(async (hintId) => {
    const request = indexedDB.open("strack-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction("state", "readwrite");
    const store = transaction.objectStore("state");
    const meta = await new Promise<any>((resolve, reject) => { const get = store.get("meta"); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const game = await new Promise<any>((resolve, reject) => { const get = store.get(`game:${meta.activeGameId}`); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    game.hintStage = "preview";
    game.hintId = hintId;
    store.put(game, `game:${game.id}`);
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
    db.close();
  }, appliedHintId);

  await page.reload();
  await page.getByRole("button", { name: "Open Easy puzzle" }).click();
  await expect(page.locator(".hint-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Previous hints (1)" })).toBeVisible();
});

test("hints follow the live candidate grid and never target absent centre notes", async ({ page }) => {
  const reportedPosition = "745280030010056007609070008004092000907010004000740000500020803400860010070035090";
  await page.getByRole("button", { name: "Open" }).click();
  await page.getByLabel("81-character puzzle").fill(reportedPosition);
  await page.getByRole("button", { name: "Validate puzzle" }).click();
  await page.getByRole("button", { name: "Play now" }).click();
  await page.getByRole("button", { name: "Calculate all candidates" }).click();

  await page.getByRole("button", { name: "Get a logical hint" }).click();
  await page.getByRole("button", { name: "Show pattern" }).click();
  await expect(page.locator(".hint-panel")).toContainText("Locked pair");
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(page.locator(".hint-answer")).toContainText("Remove 3 from Row 3, column 6");
  await page.getByRole("button", { name: "Dismiss hint" }).click();

  const reportedCandidates = [
    ["", "", "", "", "", "19", "169", "", "169"], ["238", "", "238", "349", "", "", "249", "24", ""],
    ["", "23", "", "134", "", "14", "125", "245", ""], ["13", "3568", "", "56", "", "", "13567", "5678", "156"],
    ["", "23568", "", "56", "", "38", "2356", "2568", ""], ["123", "23568", "1236", "", "", "38", "123569", "2568", "12569"],
    ["", "69", "16", "149", "", "1479", "", "467", ""], ["", "239", "23", "", "", "79", "257", "", "25"],
    ["128", "", "1268", "14", "", "", "246", "", "26"],
  ].flat().map((digits) => [...digits].map(Number));
  await page.evaluate(async (centre) => {
    const request = indexedDB.open("strack-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction("state", "readwrite");
    const store = transaction.objectStore("state");
    const meta = await new Promise<any>((resolve, reject) => { const get = store.get("meta"); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const game = await new Promise<any>((resolve, reject) => { const get = store.get(`game:${meta.activeGameId}`); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    game.centre = centre;
    game.eliminated = Array.from({ length: 81 }, () => []);
    game.hintStage = "none";
    game.hintId = null;
    store.put(game, `game:${game.id}`);
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
    db.close();
  }, reportedCandidates);
  await page.reload();
  await page.locator("[data-game]").first().click();
  await expect(page.locator('[data-cell="27"] .centre-marks')).toHaveText("13");
  await page.getByRole("button", { name: "Get a logical hint" }).click();
  await page.getByRole("button", { name: "Show pattern" }).click();
  await page.getByRole("button", { name: "Show answer" }).click();
  const answer = await page.locator(".hint-answer").innerText();
  const eliminations = [...answer.matchAll(/Remove (\d) from Row (\d), column (\d)/g)];
  expect(eliminations.length).toBeGreaterThan(0);
  for (const [, digit, row, column] of eliminations) {
    const cell = (Number(row) - 1) * 9 + Number(column) - 1;
    await expect(page.locator(`[data-cell="${cell}"] .centre-marks`)).toContainText(digit);
  }
});

test("Finned Jellyfish names its exact roles and teaches the logic before the answer", async ({ page }) => {
  const givens = "502070430000400050000020700400502073000010000970603001008050000010004000059030807";
  const position = "502070430030400052004325700401502073020010504975643281048050000010004005059030847";
  const candidateRows = [
    ["", "689", "", "189", "", "1689", "", "", "689"], ["178", "", "67", "", "689", "689", "169", "", ""],
    ["168", "689", "", "", "", "", "", "169", "689"], ["", "68", "", "", "89", "", "69", "", ""],
    ["368", "", "36", "789", "", "789", "", "69", ""], ["", "", "", "", "", "", "", "", ""],
    ["2367", "", "", "279", "", "679", "1369", "1269", "69"], ["2367", "", "367", "2789", "689", "", "369", "269", ""],
    ["26", "", "", "12", "", "16", "", "", ""],
  ];
  await page.getByRole("button", { name: "Open" }).click();
  await page.getByLabel("81-character puzzle").fill(givens);
  await page.getByRole("button", { name: "Validate puzzle" }).click();
  await page.getByRole("button", { name: "Play now" }).click();
  await page.evaluate(async ({ position, centre }) => {
    const request = indexedDB.open("strack-v1");
    const db = await new Promise<IDBDatabase>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    const transaction = db.transaction("state", "readwrite");
    const state = transaction.objectStore("state");
    const meta = await new Promise<any>((resolve, reject) => { const get = state.get("meta"); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    const game = await new Promise<any>((resolve, reject) => { const get = state.get(`game:${meta.activeGameId}`); get.onsuccess = () => resolve(get.result); get.onerror = () => reject(get.error); });
    game.values = [...position].map((value) => value === "0" ? "" : value);
    game.centre = centre;
    game.eliminated = Array.from({ length: 81 }, () => []);
    game.hintStage = "none";
    game.hintId = null;
    state.put(game, `game:${game.id}`);
    await new Promise<void>((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); });
    db.close();
  }, { position, centre: candidateRows.flat().map((digits) => [...digits].map(Number)) });
  await page.reload();
  await page.locator("[data-game]").first().click();
  await page.getByRole("button", { name: "Get a logical hint" }).click();
  await page.getByRole("button", { name: "Show pattern" }).click();

  const panel = page.locator(".hint-panel");
  await expect(panel).toContainText("Finned Jellyfish");
  await expect(panel).toContainText("What the rule means");
  await expect(panel).toContainText("If no fin is true");
  await expect(panel).toContainText("Base rows: the 6s of the fish");
  await expect(panel).toContainText("Cover columns: where the base's 6s must land");
  await expect(panel).toContainText("Row 1, column 9");
  await expect(panel).toContainText("Row 3, column 8");
  await expect(panel).toContainText("Row 3, column 9");
  await expect(panel).not.toContainText("Remove 6 from Row 2, column 7");
  await expect(page.locator('[data-cell="8"] .hint-role-badge')).toHaveText("F");
  await page.getByRole("button", { name: "Show answer" }).click();
  await expect(panel.locator(".hint-answer")).toContainText("Remove 6 from Row 2, column 7");
});

test("settings persist theme and help explains notation, ratings, offline use and backups", async ({ page }) => {
  await page.getByRole("button", { name: "Settings and help" }).click();
  await page.getByLabel("Theme").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Open user guide" }).click();
  const guide = page.getByRole("dialog");
  await expect(guide).toContainText("Warm corner notes stay in the top-left");
  await expect(guide).toContainText("High-contrast centre notes stay centred");
  await expect(guide).toContainText("not an official universal scale");
  await expect(guide).toContainText("IndexedDB");
  await guide.getByRole("button", { name: "Got it" }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("Sudoku grid surfaces follow explicit light and dark themes", async ({ page }) => {
  const boardColours = async () => {
    const board = page.getByRole("grid", { name: "Sudoku board" });
    await expect(board).toBeVisible();
    return page.evaluate(() => {
      const given = document.querySelector<HTMLElement>(".sudoku-cell.given:not(.peer):not(.match)")!;
      const empty = document.querySelector<HTMLElement>(".sudoku-cell:not(.given):not(.selected):not(.peer):not(.match)")!;
      const peer = document.querySelector<HTMLElement>(".sudoku-cell.peer")!;
      const styles = getComputedStyle(document.documentElement);
      const rgb = (value: string) => {
        const sample = document.createElement("span");
        sample.style.color = value.trim();
        document.body.append(sample);
        const channels = getComputedStyle(sample).color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
        sample.remove();
        return channels;
      };
      const luminance = (channels: number[]) => channels.map((channel) => channel / 255).map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
      const note = rgb(styles.getPropertyValue("--board-centre-note"));
      const surface = rgb(styles.getPropertyValue("--board"));
      const match = rgb(styles.getPropertyValue("--board-match"));
      const light = Math.max(luminance(note), luminance(surface));
      const dark = Math.min(luminance(note), luminance(surface));
      const matchLight = Math.max(luminance(note), luminance(match));
      const matchDark = Math.min(luminance(note), luminance(match));
      return {
        board: getComputedStyle(document.querySelector<HTMLElement>(".sudoku-board")!).backgroundColor,
        given: getComputedStyle(given).backgroundColor,
        empty: getComputedStyle(empty).backgroundColor,
        peer: getComputedStyle(peer).backgroundColor,
        givenText: getComputedStyle(given).color,
        centreNote: `rgb(${note.join(", ")})`,
        match: `rgb(${match.join(", ")})`,
        centreNoteContrast: (light + .05) / (dark + .05),
        centreNoteMatchContrast: (matchLight + .05) / (matchDark + .05),
      };
    });
  };

  await page.goto("/");
  await page.getByRole("button", { name: "Settings and help" }).click();
  await page.getByLabel("Theme").selectOption("dark");
  await page.getByRole("button", { name: "Sudoku home" }).click();
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await page.locator(".sudoku-cell.given").first().click();
  await expect(page.locator(".sudoku-cell.peer").first()).toBeVisible();
  const dark = await boardColours();

  await page.getByRole("button", { name: "Settings and help" }).click();
  await page.getByLabel("Theme").selectOption("light");
  await page.getByRole("button", { name: "Sudoku home" }).click();
  await page.getByRole("button", { name: /Resume puzzle/ }).click();
  const light = await boardColours();

  expect(dark).not.toEqual(light);
  expect(dark.empty).toBe("rgb(19, 27, 31)");
  expect(light.empty).toBe("rgb(237, 243, 244)");
  expect(dark.given).toBe(dark.empty);
  expect(light.given).toBe(light.empty);
  expect(dark.peer).not.toBe(dark.empty);
  expect(light.peer).not.toBe(light.empty);
  expect(dark.given).not.toBe(light.given);
  expect(dark.givenText).not.toBe(light.givenText);
  expect(dark.centreNote).toBe("rgb(245, 251, 252)");
  expect(light.centreNote).toBe("rgb(21, 33, 38)");
  expect(dark.match).toBe("rgb(36, 93, 105)");
  expect(light.match).toBe("rgb(191, 231, 238)");
  expect(dark.centreNoteContrast).toBeGreaterThan(12);
  expect(light.centreNoteContrast).toBeGreaterThan(12);
  expect(dark.centreNoteMatchContrast).toBeGreaterThan(7);
  expect(light.centreNoteMatchContrast).toBeGreaterThan(12);
});

test("import validates uniqueness and creates a client-side share link", async ({ page }) => {
  await page.getByRole("button", { name: "Open" }).click();
  await page.getByLabel("81-character puzzle").fill("530070000600195000098000060800060003400803001700020006060000280000419005000080079");
  await page.getByRole("button", { name: "Validate puzzle" }).click();
  await expect(page.getByText("Unique solution found on this device.")).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: (value: string) => { sessionStorage.setItem("copied-link", value); return Promise.resolve(); } } });
  });
  await page.getByRole("button", { name: "Copy share link" }).dispatchEvent("click");
  const clipboard = await page.evaluate(() => sessionStorage.getItem("copied-link") || "");
  expect(new URL(clipboard).searchParams.get("p")).toBe("530070000600195000098000060800060003400803001700020006060000280000419005000080079");
});

test("narrow phone and landscape controls do not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("grid", { name: "Sudoku board" })).toBeVisible();
  await expect(page.locator(".player-main .page-heading")).toBeHidden();
  const narrowPad = (await page.locator(".number-pad").boundingBox())!;
  expect(narrowPad.y + narrowPad.height).toBeLessThanOrEqual(740);
  await page.screenshot({ path: "test-results/player-phone.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => {
    const pad = (await page.locator(".number-pad").boundingBox())!;
    return Math.round(pad.y + pad.height);
  }).toBeLessThanOrEqual(844);
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.getByRole("button", { name: "Get a logical hint" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/player-landscape.png", fullPage: true });
});

test("the puzzle board grows with available viewport width and height", async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const board = page.getByRole("grid", { name: "Sudoku board" });
  await expect(board).toBeVisible();
  const compact = (await board.boundingBox())!;

  await page.setViewportSize({ width: 1500, height: 1000 });
  await expect.poll(async () => (await board.boundingBox())!.width).toBeGreaterThan(compact.width + 200);
  const spacious = (await board.boundingBox())!;
  expect(Math.abs(spacious.width - spacious.height)).toBeLessThan(1);
  expect(spacious.width).toBeLessThanOrEqual(821);
  expect(spacious.y + spacious.height).toBeLessThanOrEqual(1000);

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect.poll(async () => (await board.boundingBox())!.width).toBeGreaterThan(680);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("accessibility contract covers names, focus, contrast, reduced motion and keyboard-only import", async ({ page }) => {
  const unnamed = await page.locator("button").evaluateAll((buttons) => buttons.filter((button) => !(button.textContent || "").trim() && !button.getAttribute("aria-label")).length);
  expect(unnamed).toBe(0);
  const start = page.getByRole("button", { name: /Start an Easy puzzle/ });
  await start.focus();
  expect(await start.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  const contrast = await page.evaluate(() => {
    const rgb = (value: string) => (value.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
    const luminance = (colour: number[]) => colour.map((part) => part / 255).map((part) => part <= .03928 ? part / 12.92 : ((part + .055) / 1.055) ** 2.4).reduce((sum, part, index) => sum + part * [.2126, .7152, .0722][index], 0);
    const style = getComputedStyle(document.body);
    const values = [luminance(rgb(style.color)), luminance(rgb(style.backgroundColor))].sort((a, b) => b - a);
    return (values[0] + .05) / (values[1] + .05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(parseFloat(await page.locator(".band-card").first().evaluate((element) => getComputedStyle(element).transitionDuration))).toBeLessThan(.02);
  const open = page.getByRole("button", { name: "Open" });
  await open.focus(); await page.keyboard.press("Enter");
  const input = page.getByLabel("81-character puzzle");
  await input.fill("530070000600195000098000060800060003400803001700020006060000280000419005000080079");
  const validate = page.getByRole("button", { name: "Validate puzzle" });
  await validate.focus(); await page.keyboard.press("Enter");
  const play = page.getByRole("button", { name: "Play now" });
  await expect(play).toBeVisible();
  await play.focus(); await page.keyboard.press("Enter");
  await expect(page.getByRole("grid", { name: "Sudoku board" })).toBeVisible();
});

test("production app relaunches offline with catalogue and current progress", async ({ browser }) => {
  const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url!, "http://local").pathname.replace(/^\/strack\/?/, "/");
      const file = resolve("dist", `.${pathname === "/" ? "/index.html" : pathname}`);
      if (!file.startsWith(resolve("dist") + "/")) throw new Error("invalid path");
      response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
      response.end(await readFile(file));
    } catch { response.statusCode = 404; response.end(); }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/strack/`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const empty = page.locator(".sudoku-cell:not(.given)").first();
  await empty.click();
  await page.keyboard.press("1");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(500);
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: /Resume puzzle/ })).toBeVisible();
  await page.getByRole("button", { name: /Resume puzzle/ }).click();
  await expect(page.getByRole("grid", { name: "Sudoku board" })).toBeVisible();
  await expect(page.locator(".sudoku-cell:not(.given)").first().locator(".cell-value")).toHaveText("1");
  await page.getByRole("button", { name: "Sudoku home" }).click();
  await page.getByRole("button", { name: "Puzzles" }).click();
  await expect(page.getByText("80 puzzles")).toBeVisible();
  await context.close();
});
