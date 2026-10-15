import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

test("the shared home exposes both complete game families", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /What would you like to play|Pick up where you left off/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Sudoku/ })).toHaveAttribute("href", "/brain-games/sudoku/");
  await expect(page.getByRole("link", { name: /Open Word games/ })).toHaveAttribute("href", "/brain-games/words/");

  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your progress" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /What would you like to play|Pick up where you left off/ })).toHaveCount(0);
  await expect(page).toHaveURL(/\?view=progress$/);

  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByText(/do not imply cognitive or health benefits/)).toBeVisible();

  await page.getByRole("link", { name: /Open Sudoku/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toHaveAttribute("href", "/brain-games/");
  await expect(page.getByRole("link", { name: "Sudoku", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Word games", exact: true })).toHaveAttribute("href", "/brain-games/words/");
  await page.getByRole("link", { name: "Brain Games home" }).click();
  await page.getByRole("link", { name: /Open Word games/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toHaveAttribute("href", "/brain-games/");
  await expect(page.getByRole("link", { name: "Word games", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Sudoku", exact: true })).toHaveAttribute("href", "/brain-games/sudoku/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await expect(page.getByText(/STrack|WTrack/)).toHaveCount(0);
});

test("settings are a distinct view and open each game's detailed settings", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page).toHaveURL(/\?view=settings$/);
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your saved games" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /What would you like to play|Pick up where you left off/ })).toHaveCount(0);

  await page.getByLabel("Colour theme").selectOption("light");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("link", { name: "Sudoku settings" }).click();
  await expect(page.getByRole("heading", { name: "Settings & help" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Close settings and help" })).toHaveAttribute("aria-pressed", "true");
});

test("the shared home fits a phone viewport without horizontal scrolling", async ({ page }) => {
  await page.goto("./");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("link", { name: /Open Sudoku/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Word games/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
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
  await page.getByRole("button", { name: "Settings" }).click();
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
  await page.getByRole("link", { name: /Open Sudoku/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toBeVisible();
  await page.getByRole("link", { name: "Brain Games home" }).click();
  await page.getByRole("link", { name: /Open Word games/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toBeVisible();
  await page.getByRole("link", { name: "Brain Games home" }).click();
  server.closeAllConnections();
  await new Promise<void>((closed) => server.close(() => closed()));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: /What would you like to play|Pick up where you left off/ })).toBeVisible();
  await page.getByRole("link", { name: /Open Sudoku/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toBeVisible();
  await page.getByRole("link", { name: "Brain Games home" }).click();
  await page.getByRole("link", { name: /Open Word games/ }).click();
  await expect(page.getByRole("link", { name: "Brain Games home" })).toBeVisible();
  await context.close();
});
