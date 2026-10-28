import { expect, test } from "@playwright/test";

test("one sign-in is shared by the shell, Sudoku, and word games", async ({ page }) => {
  const email = `profile-${Date.now()}@example.com`;
  const password = "brain-games-test-password";

  await page.goto("./?view=settings");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(page.getByRole("button", { name: `Manage Brain Games profile for ${email}` })).toBeVisible();

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: /Play Sudoku/ }).click();
  await expect(page.locator("[data-cloud-status]").first()).not.toHaveText("Sign in to sync");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  await page.getByRole("button", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: /Play Crosswords/ }).click();
  await expect(page.locator("[data-cloud-status]").first()).not.toHaveText("Sign in to sync");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  await page.getByRole("button", { name: "Sign out on this device" }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});
