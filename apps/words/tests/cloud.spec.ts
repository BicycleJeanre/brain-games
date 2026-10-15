import { expect, test } from "@playwright/test";

test("a signed-in puzzle resumes on a second device", async ({ browser }) => {
  const email = `solver-${Date.now()}@example.test`;
  const password = "test-password-42";
  const firstContext = await browser.newContext();
  const first = await firstContext.newPage();
  await first.goto("/");
  await first.getByRole("button", { name: "Settings" }).click();
  await first.getByLabel("Email").fill(email);
  await first.getByLabel("Password").fill(password);
  await first.getByRole("button", { name: "Create account" }).click();
  await expect(first.getByText(`Signed in as ${email}.`)).toBeVisible({ timeout: 15_000 });
  await first.getByRole("button", { name: "Puzzles", exact: true }).click();
  await first.locator('[data-open="ws-word-craft-001"]').click();
  await first.locator('[data-word-cell="2,0"]').click();
  await first.locator('[data-word-cell="6,4"]').click();
  await expect(first.getByText("Found").first()).toBeVisible();
  await first.getByRole("button", { name: "Settings" }).click();
  await expect(first.getByText("Synced")).toBeVisible();

  const secondContext = await browser.newContext();
  const second = await secondContext.newPage();
  await second.goto("/");
  await second.getByRole("button", { name: "Settings" }).click();
  await second.getByLabel("Email").fill(email);
  await second.getByLabel("Password").fill(password);
  await second.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(second.getByText(`Signed in as ${email}.`)).toBeVisible({ timeout: 15_000 });
  await second.getByRole("button", { name: "Puzzles", exact: true }).click();
  await second.locator('[data-open="ws-word-craft-001"]').click();
  await expect(second.getByText("Found").first()).toBeVisible();

  await firstContext.close();
  await secondContext.close();
});
