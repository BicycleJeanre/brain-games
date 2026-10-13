import { expect, test } from "@playwright/test";

test("a signed-in puzzle session continues on a second device", async ({ browser }) => {
  const email = `solver-${Date.now()}@example.test`;
  const password = "test-password-42";
  const firstContext = await browser.newContext({ viewport: { width: 900, height: 800 } });
  const first = await firstContext.newPage();
  await first.goto("/");
  await first.getByRole("button", { name: "Settings and help" }).click();
  await first.getByLabel("Email").fill(email);
  await first.getByLabel("Password").fill(password);
  await first.getByRole("button", { name: "Create account" }).click();
  await expect(first.getByRole("heading", { name: "Progress sync is on" })).toBeVisible();
  await first.getByRole("button", { name: "STrack home" }).click();
  await first.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  const firstEmpty = first.locator(".sudoku-cell:not(.given)").first();
  const secondEmpty = first.locator(".sudoku-cell:not(.given)").nth(1);
  await firstEmpty.click();
  await first.keyboard.press("1");
  await first.getByRole("button", { name: "Colour" }).click();
  await first.getByRole("button", { name: "Toggle cyan cell colour" }).click();
  await first.getByRole("button", { name: "Toggle amber cell colour" }).click();
  await first.getByRole("button", { name: "Lines" }).click();
  await first.getByRole("button", { name: "Use rose line colour" }).click();
  await firstEmpty.dragTo(secondEmpty);
  await first.getByRole("button", { name: "Settings and help" }).click();
  await expect(first.locator("[data-cloud-status]").filter({ hasText: "Synced" }).first()).toBeVisible();

  const secondContext = await browser.newContext({ viewport: { width: 900, height: 800 } });
  const second = await secondContext.newPage();
  await second.goto("/");
  await second.getByRole("button", { name: "Settings and help" }).click();
  await second.getByLabel("Email").fill(email);
  await second.getByLabel("Password").fill(password);
  await second.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(second.getByRole("heading", { name: "Progress sync is on" })).toBeVisible();
  await second.getByRole("button", { name: "STrack home" }).click();
  await expect(second.getByRole("button", { name: /Resume puzzle/ })).toBeVisible();
  await second.getByRole("button", { name: /Resume puzzle/ }).click();
  await expect(second.locator(".sudoku-cell:not(.given)").first().locator(".cell-value")).toHaveText("1");
  await expect(second.locator(".sudoku-cell:not(.given)").first().locator(".cell-colours i")).toHaveCount(2);
  await expect(second.locator(".annotation-line.colour-rose:not(.preview)")).toHaveCount(1);

  await first.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("strack-v1", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = database.transaction("state", "readwrite");
    const store = transaction.objectStore("state");
    const data = await new Promise<any>((resolve, reject) => {
      const request = store.get("app");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const game = data.games[data.activeGameId];
    const completedAt = Date.now();
    game.values = game.puzzle.solution.split("");
    game.completedAt = completedAt;
    game.updatedAt = completedAt;
    store.put(data, "app");
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
  await first.reload();
  await expect(first.locator("[data-cloud-status]").filter({ hasText: "Synced" }).first()).toBeVisible();
  await second.getByRole("button", { name: /Home/ }).click();
  await expect(second.getByRole("heading", { name: "Completed puzzles" })).toBeVisible();
  await expect(second.getByRole("button", { name: /Review Easy puzzle/ })).toBeVisible();

  await first.getByRole("button", { name: /Delete completed Easy puzzle/ }).click();
  await first.getByRole("button", { name: "Delete puzzle", exact: true }).click();
  await expect(first.getByRole("button", { name: /Review Easy puzzle/ })).toHaveCount(0);
  await expect(second.getByRole("button", { name: /Review Easy puzzle/ })).toHaveCount(0);
  await firstContext.close();
  await secondContext.close();
});
