import "./style.css";
import { leaveProfile, profileConfigured, profileError, resetProfilePassword, useProfile, watchProfile, type ProfileUser } from "./auth.ts";
import { DEFAULT_SUDOKU_PREFERENCES, DEFAULT_WORD_PREFERENCES, loadGamePreferences, saveSharedTheme, saveSudokuPreferences, saveWordPreferences, type GamePreferences, type Theme } from "./preferences.ts";
import { createCombinedBackup, importBackup, importLegacyData, migrationPreview, type ImportResult, type MigrationPreview } from "./storage.ts";

type ShellView = "home" | "play" | "progress" | "settings";

const base = import.meta.env.BASE_URL;
const themeKey = "brain-games-theme";
const validViews = new Set<ShellView>(["home", "play", "progress", "settings"]);
let preview: MigrationPreview | null = null;
let dataMessage = "";
let profileUser: ProfileUser | null = null;
let profileMessage = "";
let profileMessageError = false;
let settingsMessage = "";
let gamePreferences: GamePreferences = {
  sudoku: { ...DEFAULT_SUDOKU_PREFERENCES },
  words: { ...DEFAULT_WORD_PREFERENCES },
};

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
  <div class="game-grid" aria-label="All games">
    <a class="game-card sudoku" href="${base}sudoku/">
      <span class="game-mark" aria-hidden="true">9</span>
      <span><small>Logic</small><strong>Sudoku</strong><p>Classic number puzzles with candidates, explanatory hints, challenges and training.</p><em>Play Sudoku →</em></span>
    </a>
    <a class="game-card words" href="${base}words/?game=crossword">
      <span class="game-mark" aria-hidden="true">CW</span>
      <span><small>Words</small><strong>Crosswords</strong><p>Fill keyboard-friendly grids using paired across and down clues.</p><em>Play Crosswords →</em></span>
    </a>
    <a class="game-card words" href="${base}words/?game=word-search">
      <span class="game-mark" aria-hidden="true">WS</span>
      <span><small>Words</small><strong>Word Search</strong><p>Trace hidden words in eight directions and keep every find.</p><em>Play Word Search →</em></span>
    </a>
    <a class="game-card words" href="${base}words/?game=word-grid">
      <span class="game-mark" aria-hidden="true">WG</span>
      <span><small>Words</small><strong>Word Grid</strong><p>Connect adjacent letters without reusing a tile.</p><em>Play Word Grid →</em></span>
    </a>
    <a class="game-card words" href="${base}words/?game=letter-mix">
      <span class="game-mark" aria-hidden="true">LM</span>
      <span><small>Words</small><strong>Letter Mix</strong><p>Build words from a free-order letter tray and shuffle it at any time.</p><em>Play Letter Mix →</em></span>
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
      <div><span class="eyebrow">Your game desk</span><h1>${active ? "Pick up where you left off." : "What would you like to play?"}</h1><p>Every game shares this home, profile, progress, and settings, while each player keeps the focused controls that make it enjoyable.</p></div>
      <span class="status"><i aria-hidden="true"></i>${navigator.onLine ? "Ready online" : "Ready offline"}</span>
    </section>
    <section class="home-section" aria-labelledby="games-heading">
      <div class="section-heading"><div><span class="eyebrow">Your library</span><h2 id="games-heading">All games</h2></div></div>
      ${gameCards()}
    </section>
    <section class="home-section progress-preview card" aria-labelledby="progress-preview-heading">
      <div><span class="eyebrow">Saved activity</span><h2 id="progress-preview-heading">${preview ? `${active} active game${active === 1 ? "" : "s"}` : "Loading progress…"}</h2><p>${preview ? `${preview.combinedSudoku.completed + preview.combinedWords.completed} completed across your game library.` : "Checking this device."}</p></div>
      <button class="secondary" data-view="progress">View progress</button>
    </section>`;
}

function playView() {
  return `
    <section class="page-heading"><div><span class="eyebrow">Game library</span><h1>All games</h1><p>Choose any game directly. Every player uses this Brain Games home, profile, progress, appearance, and settings surface.</p></div></section>
    ${gameCards()}
    <section class="future-card card"><span class="eyebrow">More games later</span><h2>Built to grow</h2><p>Future entertainment modules can include speed-reading games, memory, attention and mental arithmetic. Scores describe play only and do not imply cognitive or health benefits.</p></section>`;
}

const selectSetting = (domain: "sudoku" | "words", key: string, title: string, detail: string, value: string, options: Array<[string, string]>) => `
  <label class="settings-field"><span><strong>${title}</strong><small>${detail}</small></span><select data-preference-domain="${domain}" data-preference-key="${key}" aria-label="${title}">${options.map(([option, label]) => `<option value="${option}" ${value === option ? "selected" : ""}>${label}</option>`).join("")}</select></label>`;

const toggleSetting = (domain: "sudoku" | "words" | "shared", key: string, title: string, detail: string, checked: boolean) => `
  <label class="toggle settings-field"><input type="checkbox" data-preference-domain="${domain}" data-preference-key="${key}" ${checked ? "checked" : ""}/><span><strong>${title}</strong><small>${detail}</small></span></label>`;

function settingsView() {
  const theme = savedTheme();
  const legacySudoku = preview?.legacySudoku.games ?? 0;
  const legacyWords = preview?.legacyWords.progress ?? 0;
  const combined = preview ? preview.combinedSudoku.games + preview.combinedWords.progress : 0;
  return `
    <section class="page-heading"><div><span class="eyebrow">One place for the whole app</span><h1>Settings</h1><p>Profile, appearance, player preferences, and backups for every game live here.</p></div><span class="settings-saved" data-settings-status role="status">${settingsMessage || "Changes save automatically"}</span></section>
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
      <section class="settings-card full-settings-card card" aria-labelledby="appearance-heading">
        <span class="eyebrow">Across every game</span><h2 id="appearance-heading">Appearance &amp; play</h2><p>These choices apply consistently to Sudoku and every word game.</p>
        <label class="settings-field"><span><strong>Colour theme</strong><small>Use the device setting or keep one theme everywhere.</small></span><select data-theme-select><option value="system" ${theme === "system" ? "selected" : ""}>System</option><option value="light" ${theme === "light" ? "selected" : ""}>Light</option><option value="dark" ${theme === "dark" ? "selected" : ""}>Dark</option></select></label>
        ${toggleSetting("shared", "showTimer", "Show timers", "Keep elapsed time visible in all game players.", gamePreferences.sudoku.showTimer && gamePreferences.words.showTimer)}
        ${toggleSetting("shared", "showControlHelp", "Show player instructions", "Keep keyboard, touch, and selection reminders visible.", gamePreferences.sudoku.showControlHelp && gamePreferences.words.showControlHelp)}
      </section>
      <section class="settings-card full-settings-card card" aria-labelledby="sudoku-settings-heading">
        <span class="eyebrow">Sudoku</span><h2 id="sudoku-settings-heading">Grid &amp; assistance</h2>
        ${selectSetting("sudoku", "noteStyle", "Note style", "Use centre notes only or separate corner and centre notes.", gamePreferences.sudoku.noteStyle, [["simple", "Simple"], ["advanced", "Advanced"]])}
        ${toggleSetting("sudoku", "autoCandidates", "Automatic candidates", "Show possible digits when a cell has no manual notes.", gamePreferences.sudoku.autoCandidates)}
        ${toggleSetting("sudoku", "cleanCandidates", "Clean candidates after entry", "Remove an entered digit from peer-cell notes.", gamePreferences.sudoku.cleanCandidates)}
        ${toggleSetting("sudoku", "highlightPeers", "Highlight peers", "Highlight the row, column, and box of the selected cell.", gamePreferences.sudoku.highlightPeers)}
        ${toggleSetting("sudoku", "highlightMatches", "Highlight matching digits", "Highlight matching values and candidate notes.", gamePreferences.sudoku.highlightMatches)}
        ${toggleSetting("sudoku", "showMistakes", "Show mistakes immediately", "Mark an incorrect placed digit without revealing the answer.", gamePreferences.sudoku.showMistakes)}
        ${toggleSetting("sudoku", "mistakeLimit", "Three-mistake limit", "Fail an attempt after a fourth incorrect full digit.", gamePreferences.sudoku.mistakeLimit)}
        ${toggleSetting("sudoku", "showColours", "Show colour annotations", "Keep colour marking available in the player.", gamePreferences.sudoku.showColours)}
        ${toggleSetting("sudoku", "showLines", "Show line annotations", "Keep candidate-link drawing available in the player.", gamePreferences.sudoku.showLines)}
        ${toggleSetting("sudoku", "showValueSelection", "Show multi-value highlighting", "Allow several digits to be highlighted with OR/AND matching.", gamePreferences.sudoku.showValueSelection)}
        ${toggleSetting("sudoku", "showCandidateCalculation", "Show candidate calculation", "Keep the calculate-all-candidates action available.", gamePreferences.sudoku.showCandidateCalculation)}
        ${selectSetting("sudoku", "digitSize", "Digit size", "Placed values in the Sudoku grid.", gamePreferences.sudoku.digitSize, [["small", "Small"], ["medium", "Medium"], ["large", "Large"]])}
        ${selectSetting("sudoku", "noteSize", "Note size", "Corner and centre candidate notes.", gamePreferences.sudoku.noteSize, [["small", "Small"], ["medium", "Medium"], ["large", "Large"]])}
        ${selectSetting("sudoku", "menuSize", "Menu text size", "Navigation and primary player controls.", gamePreferences.sudoku.menuSize, [["small", "Small"], ["medium", "Medium"], ["large", "Large"]])}
        ${selectSetting("sudoku", "digitColour", "Digit colour", "Placed values in light and dark themes.", gamePreferences.sudoku.digitColour, [["cyan", "Cyan"], ["mono", "Monochrome"], ["amber", "Amber"]])}
        ${selectSetting("sudoku", "noteColour", "Note colour", "Candidate-note palette.", gamePreferences.sudoku.noteColour, [["classic", "Classic"], ["mono", "Monochrome"], ["cyan", "Cyan"], ["amber", "Amber"]])}
        ${selectSetting("sudoku", "menuColour", "Menu colour", "Navigation and control text palette.", gamePreferences.sudoku.menuColour, [["standard", "Standard"], ["bright", "Bright"], ["cyan", "Cyan"], ["amber", "Amber"]])}
        ${selectSetting("sudoku", "highlightColour", "Highlight colour", "Selected cells, matches, and training highlights.", gamePreferences.sudoku.highlightColour, [["cyan", "Cyan"], ["amber", "Amber"], ["violet", "Violet"], ["green", "Green"]])}
      </section>
      <section class="settings-card full-settings-card card" aria-labelledby="word-settings-heading">
        <span class="eyebrow">Crosswords, Word Search, Word Grid &amp; Letter Mix</span><h2 id="word-settings-heading">Word-game player</h2>
        ${toggleSetting("words", "showHints", "Show hint controls", "Keep local hint actions available in every word game.", gamePreferences.words.showHints)}
        ${toggleSetting("words", "checkAsYouType", "Mark incorrect crossword letters", "Add an error state without revealing the correct answer.", gamePreferences.words.checkAsYouType)}
        ${selectSetting("words", "gridTextSize", "Grid letter size", "Letters inside word-search, crossword, and word-grid cells.", gamePreferences.words.gridTextSize, [["small", "Small"], ["medium", "Medium"], ["large", "Large"]])}
        ${selectSetting("words", "clueTextSize", "Clue and word-list size", "Crossword clues and found or target word lists.", gamePreferences.words.clueTextSize, [["small", "Small"], ["medium", "Medium"], ["large", "Large"]])}
        ${selectSetting("words", "menuTextSize", "Menu text size", "Navigation and primary player controls.", gamePreferences.words.menuTextSize, [["small", "Small"], ["medium", "Medium"], ["large", "Large"]])}
        ${selectSetting("words", "highlightColour", "Highlight colour", "Selected cells, active clues, and hint outlines.", gamePreferences.words.highlightColour, [["cyan", "Cyan"], ["amber", "Amber"], ["violet", "Violet"], ["green", "Green"]])}
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
  const reportSettingsSaved = (message = "Saved for every game. Changes sync when each game connects.") => {
    settingsMessage = message;
    const status = document.querySelector<HTMLElement>("[data-settings-status]");
    if (status) status.textContent = message;
  };
  document.querySelector<HTMLSelectElement>("[data-theme-select]")?.addEventListener("change", async (event) => {
    const next = (event.currentTarget as HTMLSelectElement).value as Theme;
    localStorage.setItem(themeKey, next);
    applyTheme(next);
    await saveSharedTheme(next, gamePreferences);
    reportSettingsSaved("Theme saved for the complete app.");
  });
  const savePreference = async (element: HTMLInputElement | HTMLSelectElement) => {
    const domain = element.dataset.preferenceDomain as "sudoku" | "words" | "shared";
    const key = element.dataset.preferenceKey!;
    const value = element instanceof HTMLInputElement ? element.checked : element.value;
    if (domain === "shared") {
      (gamePreferences.sudoku as unknown as Record<string, unknown>)[key] = value;
      (gamePreferences.words as unknown as Record<string, unknown>)[key] = value;
      await Promise.all([saveSudokuPreferences(gamePreferences.sudoku), saveWordPreferences(gamePreferences.words)]);
    } else if (domain === "sudoku") {
      (gamePreferences.sudoku as unknown as Record<string, unknown>)[key] = value;
      await saveSudokuPreferences(gamePreferences.sudoku);
    } else {
      (gamePreferences.words as unknown as Record<string, unknown>)[key] = value;
      await saveWordPreferences(gamePreferences.words);
    }
    reportSettingsSaved(domain === "shared" ? "Saved for every game." : `Saved for ${domain === "sudoku" ? "Sudoku" : "all word games"}.`);
  };
  document.querySelectorAll<HTMLInputElement>("input[data-preference-domain]").forEach((input) => input.addEventListener("change", () => void savePreference(input)));
  document.querySelectorAll<HTMLSelectElement>("select[data-preference-domain]").forEach((select) => select.addEventListener("change", () => void savePreference(select)));
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

async function refreshGamePreferences() {
  try { gamePreferences = await loadGamePreferences(); }
  catch { settingsMessage = "Player preferences could not be loaded. Your saved games are unaffected."; }
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
void refreshGamePreferences();
watchProfile((user) => { profileUser = user; render(); });

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register(`${base}sw.js`));
