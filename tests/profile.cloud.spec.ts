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

  await page.getByRole("link", { name: "Sudoku preferences" }).click();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage Brain Games profile" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveCount(0);

  await page.getByRole("link", { name: "Manage Brain Games profile" }).click();
  await page.getByRole("link", { name: "Word-game preferences" }).click();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole("link", { name: "Manage Brain Games profile" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Email" })).toHaveCount(0);

  await page.getByRole("link", { name: "Manage Brain Games profile" }).click();
  await page.getByRole("button", { name: "Sign out on this device" }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});
