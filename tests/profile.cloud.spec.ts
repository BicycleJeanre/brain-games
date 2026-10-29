import { expect, test } from "@playwright/test";

test("one sign-in and shared settings follow the player through every game", async ({ page, browser }) => {
  const email = `profile-${Date.now()}@example.com`;
  const password = "brain-games-test-password";

  await page.goto("./?view=settings");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create profile" }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();
  await expect(page.getByRole("link", { name: `Manage Brain Games profile for ${email}` })).toBeVisible();
  await page.getByLabel("Colour theme").selectOption("light");
  await page.getByLabel("Show timers").uncheck();

  await page.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: /Play Sudoku/ }).click();
  await expect(page.locator("[data-cloud-status]").first()).toHaveText("Synced");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  await page.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: /Play Crosswords/ }).click();
  await expect(page.locator("[data-cloud-status]").first()).toHaveText("Synced");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page.getByText(`Signed in as ${email}`)).toBeVisible();

  const secondDevice = await browser.newContext();
  const secondPage = await secondDevice.newPage();
  await secondPage.goto("./?view=settings");
  await secondPage.getByRole("textbox", { name: "Email" }).fill(email);
  await secondPage.getByLabel("Password").fill(password);
  await secondPage.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(secondPage.getByText(`Signed in as ${email}`)).toBeVisible();
  await secondPage.getByRole("navigation", { name: "Brain Games" }).getByRole("link", { name: "Home", exact: true }).click();
  await secondPage.getByRole("link", { name: /Play Sudoku/ }).click();
  await expect(secondPage.locator("[data-cloud-status]").first()).toHaveText("Synced");
  await expect(secondPage.locator("html")).toHaveAttribute("data-theme", "light");
  await secondPage.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await expect(secondPage.locator("#timer")).toHaveClass(/hidden/);
  await secondPage.getByRole("link", { name: "Brain Games home" }).click();
  await secondPage.getByRole("link", { name: /Play Crosswords/ }).click();
  await expect(secondPage.locator("[data-cloud-status]").first()).toHaveText("Synced");
  await expect(secondPage.locator("html")).toHaveAttribute("data-theme", "light");
  await secondPage.getByRole("button", { name: "Start", exact: true }).first().click();
  await expect(secondPage.locator(".player-heading .timer")).toHaveText("");
  await secondDevice.close();

  await page.getByRole("button", { name: "Sign out on this device" }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});
