import { chromium } from "@playwright/test";

const base = process.env.LIVE_BASE_URL || "https://bicyclejeanre.github.io/brain-games/";
const apiKey = process.env.BRAIN_GAMES_FIREBASE_API_KEY;
const project = process.env.BRAIN_GAMES_FIREBASE_PROJECT_ID || "brain-games-jvw";
if (!apiKey) throw new Error("BRAIN_GAMES_FIREBASE_API_KEY is required.");

const stamp = Date.now();
const email = `brain-games-live-${stamp}@example.com`;
const password = `Smoke-${stamp}-Aa1!`;
let user;
let browser;

async function authRequest(path, body) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${path}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${path}: ${JSON.stringify(result)}`);
  return result;
}

async function signInProfile(page) {
  await page.goto(`${base}?view=settings`);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByText(`Signed in as ${email}`).waitFor({ timeout: 20_000 });
}

async function verifySudokuProfile(page) {
  await page.getByRole("button", { name: /Settings and help/ }).click();
  try { await page.getByText(email, { exact: true }).waitFor({ timeout: 20_000 }); }
  catch { throw new Error(`Sudoku profile failed at ${page.url()}: ${(await page.locator("body").innerText()).slice(0, 700)}`); }
}

async function verifyWordsProfile(page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByText(email, { exact: true }).waitFor({ timeout: 20_000 });
}

async function firestore(path, options = {}) {
  return fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${path}`, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${user.idToken}` },
  });
}

async function cleanup() {
  if (!user) return;
  try {
    for (const collection of ["sudokuGames", "wordProgress"]) {
      const records = await firestore(`users/${user.localId}/${collection}`);
      if (records.ok) {
        for (const document of (await records.json()).documents || []) {
          await fetch(`https://firestore.googleapis.com/v1/${document.name}`, { method: "DELETE", headers: { Authorization: `Bearer ${user.idToken}` } });
        }
      }
    }
    for (const path of [`users/${user.localId}/sudokuMeta/settings`, `users/${user.localId}/wordMeta/settings`, `users/${user.localId}/wordState/app`]) await firestore(path, { method: "DELETE" });
    await authRequest("accounts:delete", { idToken: user.idToken });
  } catch (error) {
    console.error(`Cleanup warning: ${error instanceof Error ? error.message : error}`);
  }
}

try {
  user = await authRequest("accounts:signUp", { email, password, returnSecureToken: true });
  browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const phone = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
  const first = await desktop.newPage();
  const second = await phone.newPage();

  await signInProfile(first);
  await first.goto(`${base}sudoku/`);
  await verifySudokuProfile(first);
  await first.getByRole("button", { name: /Close settings and help/ }).click();
  await first.getByRole("button", { name: /Start an Easy puzzle/ }).click();
  await first.getByRole("grid", { name: "Sudoku board" }).waitFor();
  await first.getByText("Synced", { exact: true }).first().waitFor({ timeout: 20_000 });

  await signInProfile(second);
  await second.goto(`${base}sudoku/`);
  await verifySudokuProfile(second);
  await second.getByRole("button", { name: /Close settings and help/ }).click();
  await second.getByRole("button", { name: /Resume puzzle/ }).waitFor({ timeout: 20_000 });

  await first.goto(`${base}words/`);
  await verifyWordsProfile(first);
  await first.getByRole("button", { name: "Puzzles", exact: true }).click();
  await first.locator("[data-open]:not([disabled])").first().click();
  await first.getByRole("button", { name: "← Puzzles" }).waitFor();
  await first.getByRole("button", { name: "Settings", exact: true }).click();
  await first.getByRole("button", { name: "Sync now" }).click();

  await second.goto(`${base}words/`);
  await verifyWordsProfile(second);
  await second.getByRole("button", { name: "Puzzles", exact: true }).click();
  await second.getByRole("button", { name: "Continue", exact: true }).first().waitFor({ timeout: 20_000 });

  const overflow = await second.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (overflow > 1) throw new Error(`Phone layout overflows horizontally by ${overflow}px.`);
  console.log("Live smoke passed: desktop and phone routes, shared sign-in, Sudoku resume, Word Games resume, and responsive layout.");
  await desktop.close();
  await phone.close();
} finally {
  await browser?.close();
  await cleanup();
}
