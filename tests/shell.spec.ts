import { expect, test } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

test("the shared home exposes both complete game families", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: "What would you like to play?" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Sudoku/ })).toHaveAttribute("href", "/brain-games/sudoku/");
  await expect(page.getByRole("link", { name: /Open Word Games/ })).toHaveAttribute("href", "/brain-games/words/");
  await expect(page.getByText(/do not imply cognitive or health benefits/)).toBeVisible();

  await page.getByRole("link", { name: /Open Sudoku/ }).click();
  await expect(page.getByRole("button", { name: "STrack home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Brain Games" })).toHaveAttribute("href", "/brain-games/");
  await page.getByRole("link", { name: "Brain Games" }).click();
  await page.getByRole("link", { name: /Open Word Games/ }).click();
  await expect(page.getByRole("button", { name: "WTrack home" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Brain Games" })).toHaveAttribute("href", "/brain-games/");
});

test("the shared home fits a phone viewport without horizontal scrolling", async ({ page }) => {
  await page.goto("./");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("link", { name: /Open Sudoku/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Open Word Games/ })).toBeVisible();
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
  await expect(page.getByText("1 STrack session found")).toBeVisible();
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
  await page.getByRole("link", { name: /Open Sudoku/ }).click();
  await expect(page.getByRole("button", { name: "STrack home" })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole("link", { name: "Brain Games" }).click();
  await page.getByRole("link", { name: /Open Word Games/ }).click();
  await expect(page.getByRole("button", { name: "WTrack home" })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.getByRole("link", { name: "Brain Games" }).click();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  server.closeAllConnections();
  await new Promise<void>((closed) => server.close(() => closed()));
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "What would you like to play?" })).toBeVisible();
  await page.getByRole("link", { name: /Open Sudoku/ }).click();
  await expect(page.getByRole("button", { name: "STrack home" })).toBeVisible();
  await page.getByRole("link", { name: "Brain Games" }).click();
  await page.getByRole("link", { name: /Open Word Games/ }).click();
  await expect(page.getByRole("button", { name: "WTrack home" })).toBeVisible();
  await context.close();
});
