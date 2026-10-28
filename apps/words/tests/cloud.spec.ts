import { expect, test } from "@playwright/test";

async function waitForAuthenticatedSettings(page: import("@playwright/test").Page, device: string) {
  try {
    await expect(page.getByRole("button", { name: "Sync now" })).toBeVisible({ timeout: 30_000 });
  } catch {
    throw new Error(`${device} did not authenticate. Visible page: ${(await page.locator("body").innerText()).slice(0, 1_200)}`);
  }
}

test("a signed-in puzzle resumes on a second device", async ({ browser }) => {
  const email = `solver-${Date.now()}@example.test`;
  const password = "test-password-42";
  const account = await fetch("http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  expect(account.ok, await account.text()).toBe(true);
  const firstContext = await browser.newContext();
  const first = await firstContext.newPage();
  await first.goto("/");
  await first.getByRole("button", { name: "Settings" }).click();
  await first.getByLabel("Email").fill(email);
  await first.getByLabel("Password").fill(password);
  await first.getByRole("button", { name: "Sign in", exact: true }).click();
  await waitForAuthenticatedSettings(first, "First device");
  await first.getByRole("button", { name: "Puzzles", exact: true }).click();
  await first.locator('[data-open="ws-word-craft-001"]').click();
  await first.locator('[data-word-cell="2,0"]').click();
  await first.locator('[data-word-cell="6,4"]').click();
  await expect(first.getByText("Found").first()).toBeVisible();
  await first.getByRole("button", { name: "Settings" }).click();
  await first.getByRole("button", { name: "Sync now" }).click();
  await expect(first.getByText("Synced")).toBeVisible();

  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  await second.goto("/");
  await second.getByRole("button", { name: "Settings" }).click();
  await second.getByLabel("Email").fill(email);
  await second.getByLabel("Password").fill(password);
  await second.getByRole("button", { name: "Sign in", exact: true }).click();
  await waitForAuthenticatedSettings(second, "Second device");
  await expect(second.getByText("Synced")).toBeVisible({ timeout: 10_000 });
  await second.getByRole("button", { name: "Puzzles", exact: true }).click();
  await second.locator('[data-open="ws-word-craft-001"]').click();
  await expect(second.getByText("Found").first()).toBeVisible();

  await firstContext.close();
  await secondContext.close();
});
