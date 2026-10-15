import "./style.css";
import { leaveProfile, profileConfigured, profileError, resetProfilePassword, useProfile, watchProfile, type ProfileUser } from "./auth.ts";
import { createCombinedBackup, importBackup, importLegacyData, migrationPreview, type ImportResult, type MigrationPreview } from "./storage.ts";

type ShellView = "home" | "play" | "progress" | "settings";
type Theme = "system" | "light" | "dark";

const base = import.meta.env.BASE_URL;
const themeKey = "brain-games-theme";
const validViews = new Set<ShellView>(["home", "play", "progress", "settings"]);
let preview: MigrationPreview | null = null;
let dataMessage = "";
let profileUser: ProfileUser | null = null;
let profileMessage = "";
let profileMessageError = false;

const requestedView = new URLSearchParams(location.search).get("view") as ShellView | null;
let view: ShellView = requestedView && validViews.has(requestedView) ? requestedView : "home";

function savedTheme(): Theme {
  const value = localStorage.getItem(themeKey);
  return value === "light" || value === "dark" ? value : "system";
}

function applyTheme(theme = savedTheme()) {
  const resolved = theme === "system"
    ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : theme;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = theme;
}

applyTheme();

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

const resultMessage = (result: ImportResult) => {
  const changed = result.sudokuAdded + result.sudokuUpdated + result.wordsAdded + result.wordsUpdated;
  return changed
    ? `Imported ${result.sudokuAdded + result.sudokuUpdated} Sudoku session${result.sudokuAdded + result.sudokuUpdated === 1 ? "" : "s"} and ${result.wordsAdded + result.wordsUpdated} word-game session${result.wordsAdded + result.wordsUpdated === 1 ? "" : "s"}.`
    : "Everything in that source was already present. No sessions were duplicated.";
};

const formatTime = (seconds: number | null) => {
  if (seconds === null) return "No completed times yet";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours ? `${hours}h ${minutes}m average` : `${minutes}:${String(remainder).padStart(2, "0")} average`;
};

const gameCards = () => `
  <div class="game-grid" aria-label="Game collections">
    <a class="game-card sudoku" href="${base}sudoku/">
      <span class="game-mark" aria-hidden="true">9</span>
      <span><small>Sudoku</small><strong>Logic, candidates, hints and training</strong><em>Open Sudoku →</em></span>
    </a>
    <a class="game-card words" href="${base}words/">
      <span class="game-mark" aria-hidden="true">A</span>
      <span><small>Word games</small><strong>Crosswords, searches, grids and letter mixes</strong><em>Open Word games →</em></span>
    </a>
  </div>`;

function progressContent() {
  if (!preview) return `<div class="loading-card card" role="status">Loading your progress…</div>`;
  const active = preview.combinedSudoku.active + preview.combinedWords.active;
  const completed = preview.combinedSudoku.completed + preview.combinedWords.completed;
  return `
    <div class="section-heading"><div><span class="eyebrow">Across all games</span><h1>Your progress</h1></div><span class="progress-total">${active} active · ${completed} completed</span></div>
    <div class="progress-grid">
      <article class="card"><span class="game-mark" aria-hidden="true">9</span><div><h2>Sudoku</h2><p><strong>${preview.combinedSudoku.active}</strong> active · <strong>${preview.combinedSudoku.completed}</strong> completed</p><small>${formatTime(preview.combinedSudoku.averageSeconds)}</small></div><a href="${base}sudoku/">${preview.combinedSudoku.active ? "Continue" : "Play"} Sudoku →</a></article>
      <article class="card words"><span class="game-mark" aria-hidden="true">A</span><div><h2>Word games</h2><p><strong>${preview.combinedWords.active}</strong> active · <strong>${preview.combinedWords.completed}</strong> completed</p><small>${formatTime(preview.combinedWords.averageSeconds)}</small></div><a href="${base}words/">${preview.combinedWords.active ? "Continue" : "Play"} word games →</a></article>
    </div>`;
}

function homeView() {
  const active = preview ? preview.combinedSudoku.active + preview.combinedWords.active : 0;
  return `
    <section class="hero card">
      <div><span class="eyebrow">Your game desk</span><h1>${active ? "Pick up where you left off." : "What would you like to play?"}</h1><p>Sudoku and word games share one home, while each game keeps the focused controls that make it enjoyable to play.</p></div>
      <span class="status"><i aria-hidden="true"></i>${navigator.onLine ? "Ready online" : "Ready offline"}</span>
    </section>
    <section class="home-section" aria-labelledby="games-heading">
      <div class="section-heading"><div><span class="eyebrow">Choose a game</span><h2 id="games-heading">Play</h2></div><button class="text-button" data-view="play">See all games →</button></div>
      ${gameCards()}
    </section>
    <section class="home-section progress-preview card" aria-labelledby="progress-preview-heading">
      <div><span class="eyebrow">Saved activity</span><h2 id="progress-preview-heading">${preview ? `${active} active game${active === 1 ? "" : "s"}` : "Loading progress…"}</h2><p>${preview ? `${preview.combinedSudoku.completed + preview.combinedWords.completed} completed across your game library.` : "Checking this device."}</p></div>
      <button class="secondary" data-view="progress">View progress</button>
    </section>`;
}

function playView() {
  return `
    <section class="page-heading"><div><span class="eyebrow">Game library</span><h1>Choose a game</h1><p>Each game opens in its own focused player. Use the Brain Games header to switch without returning to a long landing page.</p></div></section>
    ${gameCards()}
    <section class="future-card card"><span class="eyebrow">More games later</span><h2>Built to grow</h2><p>Future entertainment modules can include speed-reading games, memory, attention and mental arithmetic. Scores describe play only and do not imply cognitive or health benefits.</p></section>`;
}

function settingsView() {
  const theme = savedTheme();
  const legacySudoku = preview?.legacySudoku.games ?? 0;
  const legacyWords = preview?.legacyWords.progress ?? 0;
  const combined = preview ? preview.combinedSudoku.games + preview.combinedWords.progress : 0;
  return `
    <section class="page-heading"><div><span class="eyebrow">Preferences and data</span><h1>Settings</h1><p>Shared app choices live here. Detailed player controls remain available inside each game.</p></div></section>
    <div class="settings-grid">
      <section class="settings-card profile-card card" aria-labelledby="profile-heading">
        <div><span class="eyebrow">One account for every game</span><h2 id="profile-heading">Brain Games profile</h2>
        ${!profileConfigured
          ? `<p>Cloud profiles are not configured in this build. Every game remains available with device-only saves.</p>`
          : profileUser
            ? `<p>Signed in as <strong>${escapeHtml(profileUser.email || "your profile")}</strong>. This one profile is used by Sudoku, word games, and future Brain Games modules on this device.</p><p>Open either game to sync its saved progress automatically.</p><button class="secondary" type="button" data-profile-sign-out>Sign out on this device</button>`
            : `<p>Sign in once to use the same private profile for Sudoku and every word game on this device. Use the same profile on your phone and PC to continue between them.</p>
              <form class="profile-form" data-profile-form><label>Email<input type="email" name="email" autocomplete="email" required /></label><label>Password<input type="password" name="password" autocomplete="current-password" minlength="6" required /></label><div class="stack-actions"><button class="primary" type="submit">Sign in</button><button class="secondary" type="submit" data-create="true">Create profile</button></div><button class="text-button" type="button" data-reset-password>Send password reset email</button></form>`}
        ${profileMessage ? `<p class="profile-message ${profileMessageError ? "error" : ""}" role="status">${escapeHtml(profileMessage)}</p>` : ""}</div>
        <div class="profile-games" aria-label="Profile coverage"><span><b>9</b> Sudoku</span><span><b>A</b> Word games</span><span><b>+</b> Future games</span></div>
      </section>
      <section class="settings-card card" aria-labelledby="appearance-heading">
        <span class="eyebrow">Appearance</span><h2 id="appearance-heading">Theme</h2><p>Use your device setting, or keep Brain Games light or dark.</p>
        <label class="settings-field"><span><strong>Colour theme</strong><small>Applies to this shared game desk.</small></span><select data-theme-select><option value="system" ${theme === "system" ? "selected" : ""}>System</option><option value="light" ${theme === "light" ? "selected" : ""}>Light</option><option value="dark" ${theme === "dark" ? "selected" : ""}>Dark</option></select></label>
      </section>
      <section class="settings-card card" aria-labelledby="game-settings-heading">
        <span class="eyebrow">Player preferences</span><h2 id="game-settings-heading">Game settings</h2><p>Open each game's detailed display, assistance, timer, storage, and help controls. Your profile is managed above.</p>
        <div class="stack-actions"><a class="secondary" href="${base}sudoku/?view=settings">Sudoku preferences</a><a class="secondary" href="${base}words/?view=settings">Word-game preferences</a></div>
      </section>
      <section class="settings-card data-card card" aria-labelledby="data-heading">
        <div><span class="eyebrow">Data &amp; backups</span><h2 id="data-heading">Your saved games</h2><p>Import compatible progress from earlier versions or keep an independent combined backup. Importing leaves the earlier data untouched.</p></div>
        <div class="migration-summary" role="status"><span><strong>${legacySudoku}</strong> previous Sudoku session${legacySudoku === 1 ? "" : "s"}</span><span><strong>${legacyWords}</strong> previous word-game session${legacyWords === 1 ? "" : "s"}</span><span><strong>${combined}</strong> already in Brain Games</span></div>
        <div class="data-actions"><button class="primary" type="button" data-import-legacy ${legacySudoku + legacyWords ? "" : "disabled"}>Import existing progress</button><button class="secondary" type="button" data-export>Download combined backup</button><label class="file-action">Restore a backup<input type="file" accept="application/json,.json" data-import-file /></label></div>
        <p class="data-message" aria-live="polite">${dataMessage}</p>
      </section>
    </div>`;
}

function viewContent() {
  if (view === "play") return playView();
  if (view === "progress") return `<section class="progress-page">${progressContent()}</section>`;
  if (view === "settings") return settingsView();
  return homeView();
}

function render() {
  document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
    <header class="app-header">
      <button class="brand" data-view="home" aria-label="Brain Games home"><span aria-hidden="true">B</span><strong>Brain Games</strong></button>
      <button class="profile-pill" data-view="settings" aria-label="${profileUser ? `Manage Brain Games profile for ${escapeHtml(profileUser.email || "signed-in user")}` : "Sign in to Brain Games"}">${profileUser ? escapeHtml(profileUser.email || "Profile") : "Sign in"}</button>
      <nav aria-label="Brain Games">
        <button data-view="home" class="${view === "home" ? "active" : ""}" ${view === "home" ? 'aria-current="page"' : ""}>Home</button>
        <button data-view="play" class="${view === "play" ? "active" : ""}" ${view === "play" ? 'aria-current="page"' : ""}>Play</button>
        <button data-view="progress" class="${view === "progress" ? "active" : ""}" ${view === "progress" ? 'aria-current="page"' : ""}>Progress</button>
        <button data-view="settings" class="${view === "settings" ? "active" : ""}" ${view === "settings" ? 'aria-current="page"' : ""}>Settings</button>
      </nav>
    </header>
    <main id="main" tabindex="-1">${viewContent()}</main>
    <footer><span>Brain Games · Offline-first · No ads or analytics</span><a href="https://github.com/BicycleJeanre/brain-games">Source code</a></footer>`;
  bindView();
}

function navigate(next: ShellView, replace = false) {
  if (next === view && !replace) return;
  view = next;
  const url = new URL(location.href);
  if (next === "home") url.searchParams.delete("view"); else url.searchParams.set("view", next);
  history[replace ? "replaceState" : "pushState"]({ view: next }, "", url);
  scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  render();
  document.querySelector<HTMLElement>("#main")?.focus({ preventScroll: true });
}

function bindView() {
  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view as ShellView)));
  document.querySelector<HTMLSelectElement>("[data-theme-select]")?.addEventListener("change", (event) => {
    const next = (event.currentTarget as HTMLSelectElement).value as Theme;
    localStorage.setItem(themeKey, next);
    applyTheme(next);
  });
  document.querySelector<HTMLFormElement>("[data-profile-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const submitter = (event as SubmitEvent).submitter as HTMLElement | null;
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");
    profileMessage = submitter?.dataset.create ? "Creating your Brain Games profile…" : "Signing in to Brain Games…";
    profileMessageError = false;
    render();
    try {
      await useProfile(email, password, submitter?.dataset.create === "true");
      profileMessage = "Signed in. Sudoku and word games now use this profile.";
      render();
    } catch (error) {
      profileMessage = profileError(error);
      profileMessageError = true;
      render();
    }
  });
  document.querySelector<HTMLElement>("[data-profile-sign-out]")?.addEventListener("click", async () => {
    await leaveProfile();
    profileMessage = "Signed out. Saved games remain on this device.";
    profileMessageError = false;
    render();
  });
  document.querySelector<HTMLElement>("[data-reset-password]")?.addEventListener("click", async () => {
    const email = document.querySelector<HTMLInputElement>("[data-profile-form] input[name='email']")?.value.trim() ?? "";
    if (!email) {
      profileMessage = "Enter your email address first.";
      profileMessageError = true;
      return render();
    }
    try {
      await resetProfilePassword(email);
      profileMessage = "Password reset email sent.";
      profileMessageError = false;
    } catch (error) {
      profileMessage = profileError(error);
      profileMessageError = true;
    }
    render();
  });
  document.querySelector<HTMLButtonElement>("[data-import-legacy]")?.addEventListener("click", async (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    button.disabled = true;
    dataMessage = "Importing without changing the earlier app data…";
    render();
    try { dataMessage = resultMessage(await importLegacyData()); }
    catch (error) { dataMessage = error instanceof Error ? error.message : "The import could not be completed."; }
    await refreshPreview();
  });
  document.querySelector<HTMLButtonElement>("[data-export]")?.addEventListener("click", async () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([await createCombinedBackup()], { type: "application/json" }));
    link.download = `brain-games-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    dataMessage = "Combined backup downloaded.";
    render();
  });
  document.querySelector<HTMLInputElement>("[data-import-file]")?.addEventListener("change", async (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    try { dataMessage = resultMessage(await importBackup(await file.text())); }
    catch (error) { dataMessage = error instanceof Error ? error.message : "The backup could not be restored."; }
    await refreshPreview();
  });
}

async function refreshPreview() {
  try { preview = await migrationPreview(); }
  catch { preview = null; if (view === "settings") dataMessage = "Device progress could not be inspected. You can still restore a downloaded backup."; }
  render();
}

addEventListener("popstate", () => {
  const next = new URLSearchParams(location.search).get("view") as ShellView | null;
  view = next && validViews.has(next) ? next : "home";
  render();
});
matchMedia("(prefers-color-scheme: light)").addEventListener("change", () => { if (savedTheme() === "system") applyTheme("system"); });

render();
void refreshPreview();
watchProfile((user) => { profileUser = user; render(); });

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register(`${base}sw.js`));
