import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

test("the shared home exposes every game in one library", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /What would you like to play|Pick up where you left off/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Play Sudoku/ })).toHaveAttribute("href", "/brain-games/sudoku/");
  await expect(page.getByRole("link", { name: /Play Crosswords/ })).toHaveAttribute("href", "/brain-games/words/?game=crossword");
  await expect(page.getByRole("link", { name: /Play Word Search/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Play Word Grid/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Play Letter Mix/ })).toBeVisible();

  await page.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Progress", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your progress" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /What would you like to play|Pick up where you left off/ })).toHaveCount(0);
  await expect(page).toHaveURL(/\?view=progress$/);

  await page.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Play" }).click();
  await expect(page.getByText(/do not imply cognitive or health benefits/)).toBeVisible();

  await page.getByRole("link", { name: /Play Sudoku/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toHaveAttribute("href", "/brain-games/");
  await expect(page.getByRole("navigation", { name: "Brain Games" }).getByRole("link")).toHaveText(["Home", "Play", "Progress", "Settings"]);
  await expect(page.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Play", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute("href", "/brain-games/?view=settings");
  await page.getByRole("link", { name: "Brain Games home" }).click();
  await page.getByRole("link", { name: /Play Crosswords/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toHaveAttribute("href", "/brain-games/");
  await expect(page.getByRole("navigation", { name: "Brain Games" }).getByRole("link")).toHaveText(["Home", "Play", "Progress", "Settings"]);
  await expect(page.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Play", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Puzzles", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Puzzle type" }).getByRole("button", { name: "Crosswords", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: "Settings", exact: true })).toHaveAttribute("href", "/brain-games/?view=settings");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect(page.getByText(/STrack|WTrack/)).toHaveCount(0);
});

test("one settings surface owns preferences for every game", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("link", { name: "Sign in to Brain Games" }).click();
  await expect(page).toHaveURL(/\?view=settings$/);
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brain Games profile" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create profile" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Your saved games" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /What would you like to play|Pick up where you left off/ })).toHaveCount(0);

  await page.getByLabel("Colour theme").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByLabel("Note style").selectOption("simple");
  await page.getByLabel("Show hint controls").uncheck();
  await page.getByLabel("Show timers").uncheck();
  await page.getByLabel("Show player instructions").uncheck();
  await expect(page.getByText("Saved for every game.")).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("brain-games-settings-v1") || "null"))).toMatchObject({
    version: 1,
    theme: "light",
    showTimer: false,
    showControlHelp: false,
  });
  await page.reload();
  await expect(page.getByLabel("Note style")).toHaveValue("simple");
  await expect(page.getByLabel("Show hint controls")).not.toBeChecked();

  await page.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: /Play Sudoku/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("navigation", { name: "Brain Games" }).getByRole("link")).toHaveText(["Home", "Play", "Progress", "Settings"]);
  await page.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await expect(page.locator("#timer")).toHaveClass(/hidden/);
  await page.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: /Play Crosswords/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("navigation", { name: "Brain Games" }).getByRole("link")).toHaveText(["Home", "Play", "Progress", "Settings"]);
  await page.getByRole("button", { name: "Start", exact: true }).first().click();
  await expect(page.locator(".player-heading .timer")).toHaveText("");

  await page.goto("./sudoku/?view=settings");
  await expect(page).toHaveURL(/brain-games\/?\?view=settings$/);
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await page.goto("./words/?view=settings");
  await expect(page).toHaveURL(/brain-games\/?\?view=settings$/);
});

test("shared settings preserve an unpartitioned combined game record", async ({ page }) => {
  await page.goto("./?view=settings");
  await page.evaluate(async () => {
    const request = indexedDB.open("brain-games-v1", 1);
    await new Promise<void>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction("sudoku-state", "readwrite");
        const store = transaction.objectStore("sudoku-state");
        store.delete("meta");
        store.put({
          version: 1,
          settingsUpdatedAt: 1,
          preferences: { noteStyle: "advanced" },
          trainingProgress: {},
          games: { preserved: { id: "preserved", updatedAt: 10 } },
          deletedGames: {},
          activeGameId: "preserved",
        }, "app");
        transaction.oncomplete = () => { request.result.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await page.reload();
  await page.getByLabel("Note style").selectOption("simple");
  await expect(page.getByText("Saved for Sudoku.")).toBeVisible();
  const keys = await page.evaluate(async () => {
    const request = indexedDB.open("brain-games-v1", 1);
    return new Promise<IDBValidKey[]>((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction("sudoku-state", "readonly");
        const getKeys = transaction.objectStore("sudoku-state").getAllKeys();
        getKeys.onsuccess = () => { request.result.close(); resolve(getKeys.result); };
        getKeys.onerror = () => reject(getKeys.error);
      };
    });
  });
  expect(keys).toContain("game:preserved");
  expect(keys).toContain("meta");
  expect(keys).not.toContain("app");
});

test("the shared home fits a phone viewport without horizontal scrolling", async ({ page }) => {
  await page.goto("./");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("link", { name: /Play Sudoku/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Play Crosswords/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Settings" })).toBeVisible();
});

test("legacy device progress is previewed and imported without deleting its source", async ({ page }) => {
  await page.goto("./");
  await page.evaluate(async () => {
    const request = indexedDB.open("strack-v1", 1);
    await new Promise<void>((resolve, reject) => {
      request.onupgradeneeded = () => request.result.createObjectStore("state");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const transaction = request.result.transaction("state", "readwrite");
        transaction.objectStore("state").put({
          version: 1,
          settingsUpdatedAt: 1,
          preferences: {},
          trainingProgress: {},
          games: { "legacy-game": { id: "legacy-game", updatedAt: 10, completedAt: null } },
          deletedGames: {},
          activeGameId: "legacy-game",
        }, "app");
        transaction.oncomplete = () => { request.result.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await page.reload();
  await page.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Settings" }).click();
  await expect(page.getByText("1 previous Sudoku session")).toBeVisible();
  await page.getByRole("button", { name: "Import existing progress" }).click();
  await expect(page.getByText(/Imported 1 Sudoku session/)).toBeVisible();
  await page.getByRole("button", { name: "Import existing progress" }).click();
  await expect(page.getByText(/already present/)).toBeVisible();
  const databases = await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name));
  expect(databases).toContain("strack-v1");
  expect(databases).toContain("brain-games-v1");
});

test("the installed shell and both visited game modules relaunch after the server stops", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "One real service-worker restart journey is sufficient");
  const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".json": "application/json" };
  const root = resolve("dist");
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url!, "http://local").pathname.replace(/^\/brain-games\/?/, "/");
      const file = resolve(root, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
      if (!file.startsWith(`${root}/`)) throw new Error("invalid path");
      response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream");
      response.end(await readFile(file));
    } catch { response.statusCode = 404; response.end(); }
  });
  await new Promise<void>((ready) => server.listen(0, "127.0.0.1", ready));
  const port = (server.address() as { port: number }).port;
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/brain-games/`);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.getByRole("link", { name: /Play Sudoku/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toBeVisible();
  await page.getByRole("link", { name: "Brain Games home" }).click();
  await page.getByRole("link", { name: /Play Crosswords/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toBeVisible();
  await page.getByRole("link", { name: "Brain Games home" }).click();
  server.closeAllConnections();
  await new Promise<void>((closed) => server.close(() => closed()));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /What would you like to play|Pick up where you left off/ })).toBeVisible();
  await page.getByRole("link", { name: /Play Sudoku/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toBeVisible();
  await page.getByRole("link", { name: "Brain Games home" }).click();
  await page.getByRole("link", { name: /Play Crosswords/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toBeVisible();
  await context.close();
});
