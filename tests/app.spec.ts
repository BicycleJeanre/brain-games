import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";

test("home and catalogue expose all puzzle types", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /Find\. Fill\. Build\./ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Daily challenges" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Weekly challenges" })).toBeVisible();
  await expect(page.locator("[data-challenge]")).toHaveCount(8);
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await expect(page.getByText("Word craft")).toBeVisible();
  await expect(page.getByText("Puzzle desk")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Letter Lab I", exact: true })).toBeVisible();
  await expect(page.locator(".catalogue-badge")).toContainText("132 puzzles");
  await page.getByRole("button", { name: "Diabolical", exact: true }).click();
  await expect(page.getByText("Showing 32 of 132 puzzles")).toBeVisible();
});

test("Word Grid accepts adjacent paths, scores words, and persists hints", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="wg-letter-grid-1-001"]').click();
  await expect(page.locator(".round-word-item")).toHaveCount(8);
  await expect(page.locator('[data-round-word="ain"] .answer-slot')).toHaveCount(3);
  await expect(page.locator('[data-round-word="ain"]')).not.toContainText("AIN");
  for (const point of [[0,0],[0,1],[1,1]]) await page.locator(`[data-grid-cell="${point[0]},${point[1]}"]`).click();
  await page.getByRole("button", { name: "Submit word" }).click();
  await expect(page.getByRole("status")).toContainText("AID is a bonus word worth 1 point");
  await expect(page.locator(".bonus-word")).toContainText("AID");
  await expect(page.locator(".controls > .control-heading strong").first()).toHaveText("1 point");
  for (const point of [[0,0],[0,1],[1,1]]) await page.locator(`[data-grid-cell="${point[0]},${point[1]}"]`).click();
  await page.getByRole("button", { name: "Submit word" }).click();
  await expect(page.getByRole("status")).toContainText("AID was already found");
  await expect(page.locator(".controls > .control-heading strong").first()).toHaveText("1 point");
  for (const point of [[1,2],[2,2],[1,3]]) await page.locator(`[data-grid-cell="${point[0]},${point[1]}"]`).click();
  await page.getByRole("button", { name: "Submit word" }).click();
  await expect(page.getByRole("status")).toContainText("AIN scores 1 point");
  await expect(page.getByText("AIN", { exact: true })).toBeVisible();
  await expect(page.locator('[data-round-word="ain"] .answer-slot')).toHaveCount(0);
  await expect(page.locator(".controls > .control-heading strong").first()).toHaveText("2 points");
  await page.getByRole("button", { name: "Reveal a round-word letter" }).click();
  await expect(page.locator(".grid-letter.hinted")).toHaveCount(0);
  await expect(page.locator(".round-word-item .answer-slot.hinted")).toHaveCount(1);
  await expect(page.getByRole("status")).toContainText("as letter 1 of");
  await page.getByRole("button", { name: "Reveal a round-word letter" }).click();
  await expect(page.locator(".grid-letter.hinted")).toHaveCount(0);
  await expect(page.locator(".round-word-item .answer-slot.hinted")).toHaveCount(2);
  await expect(page.getByRole("status")).toContainText("as letter 2 of");
  await page.reload();
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="wg-letter-grid-1-001"]').click();
  await expect(page.getByText("AIN", { exact: true })).toBeVisible();
  await expect(page.locator(".bonus-word")).toContainText("AID");
  await expect(page.locator(".grid-letter.hinted")).toHaveCount(0);
  await expect(page.locator(".round-word-item .answer-slot.hinted")).toHaveCount(2);
});

test("Letter Mix shuffles its tray and accepts non-adjacent words", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="wg-letter-mix-1-001"]').click();
  await expect(page.locator(".player-heading .eyebrow")).toHaveText("Letter Mix · Easy");
  const cells = page.locator("[data-grid-cell]");
  await expect(cells).toHaveCount(8);
  const before = await cells.evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.gridCell));
  await page.getByRole("button", { name: "Shuffle letters" }).click();
  const after = await cells.evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.gridCell));
  expect(after).not.toEqual(before);
  expect([...after].sort()).toEqual([...before].sort());
  await expect(page.getByRole("status")).toContainText("score and found words are unchanged");

  for (const point of [[3,1],[0,0],[3,0]]) await page.locator(`[data-grid-cell="${point[0]},${point[1]}"]`).click();
  await page.getByRole("button", { name: "Submit word" }).click();
  await expect(page.getByRole("status")).toContainText("GET scores 1 point");
  await expect(page.getByText("GET", { exact: true })).toBeVisible();
});

test("word-search progress survives reload", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  await page.locator('[data-word-cell="2,0"]').click();
  await page.locator('[data-word-cell="6,4"]').click();
  await expect(page.getByText("Found").first()).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  await expect(page.getByText("Found").first()).toBeVisible();
});

test("word search supports pointer drag and keyboard navigation", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  const start = page.locator('[data-word-cell="2,0"]');
  const end = page.locator('[data-word-cell="6,4"]');
  await start.dragTo(end);
  await expect(page.getByText("Found").first()).toBeVisible();
  await start.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-word-cell="3,0"]')).toBeFocused();
});

test("hints persist for word searches and reveal crossword letters", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles" }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  await page.getByRole("button", { name: "Give me a hint" }).click();
  await expect(page.getByRole("status")).toContainText("highlighted cell");
  await expect(page.locator(".word-cell.hinted")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "Puzzles" }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  await expect(page.locator(".word-cell.hinted")).toHaveCount(1);

  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="cw-puzzle-desk-001"]').click();
  await page.getByRole("button", { name: "Reveal a letter" }).click();
  await expect(page.getByRole("status")).toContainText("Revealed");
  await expect(page.locator(".crossword-cell.hinted input")).toHaveValue(/[A-Z]/);
});

test("settings merge a WTrack JSON backup without replacing local progress", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles" }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  await page.locator('[data-word-cell="2,0"]').click();
  await page.locator('[data-word-cell="6,4"]').click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.locator('input[name="backup"]').setInputFiles({
    name: "wtrack-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({
      format: "wtrack-backup",
      exportedAt: "2026-10-13T00:00:00.000Z",
      data: { version: 1, preferences: { theme: "light", showTimer: false, checkAsYouType: true }, progress: {}, deletedProgress: {}, activePuzzleId: null, settingsUpdatedAt: 1, catalogueVersion: "2026.10.1" },
    })),
  });
  await page.getByRole("button", { name: "Merge backup" }).click();
  await expect(page.getByText(/^Backup merged:/)).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  await expect(page.getByText("Found").first()).toBeVisible();
});

test("settings can reset the current puzzle and return to the player", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  await page.locator('[data-word-cell="2,0"]').click();
  await page.locator('[data-word-cell="6,4"]').click();
  await expect(page.getByText("Found").first()).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Reset current puzzle" }).click();
  await expect(page.getByText("Current puzzle reset.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("grid", { name: /word search/ })).toBeVisible();
  await expect(page.getByText("Found").first()).toHaveCount(0);
});

test("challenge sessions are independent and saved history can be deleted", async ({ page }) => {
  await page.goto("./");
  const challenge = page.locator('[data-challenge="daily"]').first();
  const sessionId = await challenge.getAttribute("data-session");
  await challenge.click();
  await expect(page.locator(".player-heading .eyebrow")).toContainText("daily challenge");
  await page.getByRole("button", { name: "Home", exact: true }).click();
  const active = page.locator(`[data-session="${sessionId}"]`).first();
  await expect(active).toContainText("Continue");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Delete saved progress/ }).first().click();
  await expect(page.locator(`[data-session="${sessionId}"]`)).toHaveCount(1);
  await expect(page.locator(`[data-session="${sessionId}"]`)).toContainText("Start challenge");
});

test("crossword accepts keyboard input", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles" }).click();
  await page.locator('[data-open="cw-puzzle-desk-001"]').click();
  const first = page.locator('[data-crossword-cell="5"]');
  await first.fill("p");
  await expect(first).toHaveValue("P");
  await page.locator('[data-crossword-cell="23"]').fill("a");
  await page.locator('[data-clue="1-across"]').click();
  await page.locator('[data-crossword-cell="22"]').fill("c");
  await expect(page.locator('[data-crossword-cell="24"]')).toBeFocused();
});

test("crossword files import privately and open as unrated puzzles", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Create" }).click();
  const sample = {
    version: "http://ipuz.org/v2", kind: ["http://ipuz.org/crossword#1"], dimensions: { width: 3, height: 3 },
    puzzle: [[1, 2, 3], [4, 0, 0], [5, 0, 0]], solution: [["C", "A", "T"], ["A", "R", "E"], ["R", "E", "D"]],
    clues: { Across: [[1, "Feline"], [4, "Exist"], [5, "Colour"]], Down: [[1, "Vehicle"], [2, "Exist"], [3, "Completed an action"]] },
  };
  await page.locator('input[name="crossword"]').setInputFiles({ name: "sample.ipuz", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(sample)) });
  await page.getByRole("button", { name: "Open private puzzle" }).click();
  await expect(page.getByRole("heading", { name: "sample" })).toBeVisible();
  await expect(page.locator(".player-heading .eyebrow")).toContainText("Unrated");
  await page.reload();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByText("sample").first()).toBeVisible();
});

test("public Wikimedia terms generate a playable puzzle that survives reload", async ({ page }) => {
  const labels = ["PLANET", "COMET", "METEOR", "ORBIT", "GALAXY", "NEBULA", "STAR", "SATURN", "EARTH", "MARS", "VENUS", "MOON", "ASTEROID", "COSMOS", "ECLIPSE", "TELESCOPE"];
  await page.route("https://en.wikipedia.org/w/api.php**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ query: { pages: labels.map((label, index) => ({ title: label, pageprops: { wikibase_item: `Q${index + 1}` } })) } }),
    });
  });
  await page.route("https://www.wikidata.org/w/api.php**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ entities: Object.fromEntries(labels.map((label, index) => [`Q${index + 1}`, { id: `Q${index + 1}`, labels: { en: { value: label } }, descriptions: { en: { value: `Public description for ${label.toLowerCase()}` } } }])) }),
    });
  });
  await page.goto("./");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Create a playable puzzle from Wikimedia data" })).toBeVisible();
  await page.getByLabel("Topic page").fill("astronomy");
  await page.getByLabel("Difficulty profile").selectOption("Medium");
  await page.getByRole("button", { name: "Create public-data puzzle" }).click();
  await expect(page.getByRole("heading", { name: "Astronomy · Medium" })).toBeVisible();
  await expect(page.getByText("Source & generation details")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.getByText("Astronomy · Medium").first()).toBeVisible();
  await expect(page.getByText("Available offline").first()).toBeVisible();
  await expect(page.locator(".challenge-card").filter({ hasText: "Astronomy · Medium" })).toHaveCount(0);
});

test("mobile layout keeps primary navigation usable", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile-only assertion");
  await page.goto("./");
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page.getByRole("heading", { name: "Create", exact: true })).toBeVisible();
});

test("themes, focus, reduced motion, and landscape layout meet the shared accessibility contract", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("./");
  await expect(page.getByText("Online", { exact: true })).toBeVisible();
  expect(await page.locator("button").evaluateAll((buttons) => buttons.filter((button) => !(button.textContent || "").trim() && !button.getAttribute("aria-label")).length)).toBe(0);

  const firstChallenge = page.locator("[data-challenge]").first();
  await firstChallenge.focus();
  expect(await firstChallenge.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe("none");
  expect(parseFloat(await firstChallenge.evaluate((element) => getComputedStyle(element).transitionDuration))).toBeLessThan(.02);

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Theme").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByLabel("Grid letter size").selectOption("large");
  await page.getByLabel("Clue and word-list size").selectOption("large");
  await page.getByLabel("Menu text size").selectOption("large");
  await page.getByLabel("Board highlight colour").selectOption("amber");
  await page.locator('[data-preference-toggle="showHints"]').uncheck();
  await page.locator('[data-preference-toggle="showControlHelp"]').uncheck();
  await expect(page.locator("html")).toHaveAttribute("data-grid-text-size", "large");
  await expect(page.locator("html")).toHaveAttribute("data-clue-text-size", "large");
  await expect(page.locator("html")).toHaveAttribute("data-menu-text-size", "large");
  await expect(page.locator("html")).toHaveAttribute("data-highlight-colour", "amber");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Find\. Fill\. Build\./ })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("grid", { name: /word search/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Give me a hint" })).toHaveCount(0);
  await expect(page.locator(".board-note")).toHaveCount(0);
  expect(await page.locator(".word-cell").first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThan(18);
  expect(await page.locator("html").evaluate((element) => getComputedStyle(element).getPropertyValue("--highlight").trim())).toBe("#8c5700");
});

test("only ten downloaded puzzles remain playable offline", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One cache-cap journey is sufficient");
  await page.goto("./");
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  const buttons = await page.locator("[data-open]").all();
  const ids = (await Promise.all(buttons.slice(0, 11).map((button) => button.getAttribute("data-open")))).filter((id): id is string => Boolean(id));
  expect(ids).toHaveLength(11);
  for (const id of ids) {
    await page.locator(`[data-open="${id}"]`).click();
    await expect(page.getByRole("button", { name: "← Puzzles" })).toBeVisible();
    await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  }

  const cachedIds = await page.evaluate(async () => await new Promise<string[]>((resolve, reject) => {
    const request = indexedDB.open("wtrack", 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const keys = request.result.transaction("puzzle-cache").objectStore("puzzle-cache").getAllKeys();
      keys.onerror = () => reject(keys.error);
      keys.onsuccess = () => resolve(keys.result.map(String));
    };
  }));
  expect(cachedIds).toHaveLength(10);
  expect(cachedIds).not.toContain(ids[0]);
  expect(cachedIds).toContain(ids[10]);

  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await expect(page.locator(`[data-open="${ids[0]}"]`)).toBeDisabled();
  await page.locator(`[data-open="${ids[10]}"]`).click();
  await expect(page.getByRole("button", { name: "← Puzzles" })).toBeVisible();
});

test("production app relaunches after its server stops with catalogue and cached progress", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One real service-worker restart journey is sufficient");
  const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".json": "application/json" };
  const root = resolve("dist");
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url!, "http://local").pathname.replace(/^\/wtrack\/?/, "/");
      const file = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
      if (!file.startsWith(`${root}/`)) throw new Error("invalid path");
      response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
      response.end(await readFile(file));
    } catch { response.statusCode = 404; response.end(); }
  });
  await new Promise<void>((resolveReady) => server.listen(0, "127.0.0.1", resolveReady));
  const port = (server.address() as { port: number }).port;
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/wtrack/`);
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  await page.locator('[data-word-cell="2,0"]').click();
  await page.locator('[data-word-cell="6,4"]').click();
  await expect(page.getByText("Found").first()).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  server.closeAllConnections();
  await new Promise<void>((resolveClosed) => server.close(() => resolveClosed()));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /Find\. Fill\. Build\./ })).toBeVisible();
  await page.getByRole("button", { name: "Puzzles", exact: true }).click();
  await page.locator('[data-open="ws-word-craft-001"]').click();
  await expect(page.getByText("Found").first()).toBeVisible();
  await context.close();
});
