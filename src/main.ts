import "./style.css";
import { createBackup, parseBackup } from "./backup.ts";
import { cloudConfigured, CloudSync, sendReset, signInAccount, signOutAccount, watchAuth } from "./cloud.ts";
import { crosswords, findWord, puzzleById, puzzles, wordPath, wordSearches } from "./puzzles.ts";
import { Store } from "./store.ts";
import type { CrosswordPuzzle, GridPoint, Preferences, Puzzle, PuzzleProgress, WordSearchPuzzle } from "./types.ts";

type View = "home" | "library" | "create" | "settings" | "help" | "player";
const app = document.querySelector<HTMLDivElement>("#app")!;
const store = new Store();
let view: View = "home";
let activePuzzle: Puzzle | null = null;
let selectionStart: GridPoint | null = null;
let dragStart: GridPoint | null = null;
let suppressWordClick = false;
let selectedClue = "";
let message = "";
let settingsMessage = "";
let settingsError = false;
let renderToken = 0;

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const progressFor = (puzzle: Puzzle) => store.data.progress[puzzle.id];
const completedCount = () => Object.values(store.data.progress).filter((progress) => progress.completedAt).length;

const cloud = new CloudSync(store, () => render());

function applyTheme() {
  document.documentElement.dataset.theme = store.data.preferences.theme;
}

function chrome(content: string) {
  const active = view === "player" ? "library" : view;
  return `
    <header class="app-header">
      <button class="brand" data-nav="home" aria-label="WTrack home"><span class="brand-grid">W</span><span>WTrack</span></button>
      <span class="cloud-state">${escapeHtml(cloud.status())}</span>
      <nav aria-label="Primary">
        ${[["home","Home"],["library","Puzzles"],["create","Create"],["settings","Settings"],["help","Help"]].map(([id, label]) => `<button data-nav="${id}" class="${active === id ? "active" : ""}">${label}</button>`).join("")}
      </nav>
    </header>
    <main id="main" class="${view === "player" ? "player-main" : ""}">${content}</main>
    <footer class="app-footer"><span>Offline-first · No ads or analytics</span><a href="https://github.com/BicycleJeanre/wtrack">Source & provenance</a></footer>`;
}

function puzzleCard(puzzle: Puzzle) {
  const progress = progressFor(puzzle);
  const status = progress?.completedAt ? "Complete" : progress ? "Continue" : "Start";
  return `<article class="puzzle-card card">
    <span class="kind-icon" aria-hidden="true">${puzzle.kind === "word-search" ? "WS" : "CW"}</span>
    <div><span class="eyebrow">${puzzle.kind === "word-search" ? "Word search" : "Crossword"} · ${puzzle.difficulty}</span><h3>${escapeHtml(puzzle.title)}</h3><p>${escapeHtml(puzzle.subtitle)}</p></div>
    <button class="secondary compact" data-open="${puzzle.id}">${status}</button>
  </article>`;
}

function home() {
  const active = Object.values(store.data.progress).filter((progress) => !progress.completedAt).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);
  return `<section class="hero card">
    <div><span class="eyebrow">Your quiet word-puzzle desk</span><h1>Find the pattern.<br>Fill the crossing.</h1><p>Word searches and crosswords designed for focused play. Everything needed for the bundled collection works offline.</p></div>
    <button class="primary" data-nav="library">Choose a puzzle<small>${puzzles.length} ready offline</small></button>
  </section>
  ${active.length ? `<section class="section"><div class="section-heading"><div><span class="eyebrow">Pick up where you left off</span><h2>In progress</h2></div></div><div class="puzzle-list">${active.map((progress) => puzzleById(progress.puzzleId)).filter(Boolean).map((puzzle) => puzzleCard(puzzle!)).join("")}</div></section>` : ""}
  <section class="stat-grid">
    <article class="card stat"><b>${wordSearches.length}</b><span>Word searches</span></article>
    <article class="card stat"><b>${crosswords.length}</b><span>Crosswords</span></article>
    <article class="card stat"><b>${completedCount()}</b><span>Completed</span></article>
  </section>
  <section class="split-feature">
    <article class="card feature"><span class="kind-icon">WS</span><h2>Word searches</h2><p>Trace in eight directions, track every find, and resume on any screen size.</p><button class="text-button" data-filter="word-search">Browse word searches →</button></article>
    <article class="card feature"><span class="kind-icon">CW</span><h2>Crosswords</h2><p>Keyboard-first grids, paired across/down clues, and optional checking as you type.</p><button class="text-button" data-filter="crossword">Browse crosswords →</button></article>
  </section>`;
}

function library(filter = "all") {
  const visible = filter === "all" ? puzzles : puzzles.filter((puzzle) => puzzle.kind === filter);
  return `<div class="page-heading"><div><span class="eyebrow">Offline catalogue</span><h1>Puzzles</h1></div><span class="catalogue-badge">Catalogue 2026.10.1</span></div>
    <div class="filter-tabs" role="group" aria-label="Puzzle type">
      ${[["all","All"],["word-search","Word searches"],["crossword","Crosswords"]].map(([id,label]) => `<button data-library-filter="${id}" aria-pressed="${filter === id}">${label}</button>`).join("")}
    </div>
    <div class="puzzle-list">${visible.map(puzzleCard).join("")}</div>`;
}

function wordSearchPlayer(puzzle: WordSearchPuzzle, progress: PuzzleProgress) {
  const foundCells = new Set(puzzle.words.filter((word) => progress.foundWordIds.includes(word.id)).flatMap((word) => word.path.map(({ x, y }) => `${x}:${y}`)));
  return `<div class="player-heading"><button class="back-button" data-nav="library">← Puzzles</button><div><span class="eyebrow">Word search · ${puzzle.difficulty}</span><h1>${escapeHtml(puzzle.title)}</h1></div><span class="timer">${store.data.preferences.showTimer ? formatTime(progress.elapsedSeconds) : ""}</span></div>
    <div class="player-layout">
      <div class="board-column">
        <div class="word-grid card" style="--columns:${puzzle.columns}" role="grid" aria-label="${escapeHtml(puzzle.title)} word search">
          ${puzzle.grid.flatMap((row, y) => [...row].map((letter, x) => `<button role="gridcell" class="word-cell ${foundCells.has(`${x}:${y}`) ? "found" : ""} ${selectionStart?.x === x && selectionStart?.y === y ? "selected" : ""}" data-word-cell="${x},${y}" aria-label="Row ${y + 1}, column ${x + 1}, ${letter}">${letter}</button>`)).join("")}
        </div>
        <p class="board-note">Drag across a word, or select its first and last letters. With a keyboard, use the arrow keys to move and Enter or Space to select.</p>
      </div>
      <aside class="controls card"><div class="control-heading"><span class="eyebrow">Find these words</span><strong>${progress.foundWordIds.length} / ${puzzle.words.length}</strong></div>
        <ul class="word-list">${puzzle.words.map((word) => `<li class="${progress.foundWordIds.includes(word.id) ? "found" : ""}"><span>${escapeHtml(word.label)}</span><span>${progress.foundWordIds.includes(word.id) ? "Found" : `${word.label.length} letters`}</span></li>`).join("")}</ul>
        ${progress.completedAt ? `<div class="complete-banner"><strong>Puzzle complete</strong><span>${formatTime(progress.elapsedSeconds)}</span></div>` : ""}
        <button class="secondary" data-reset="${puzzle.id}">Start over</button>
      </aside>
    </div>`;
}

function clueKey(number: number, direction: string) { return `${number}-${direction}`; }

function crosswordPlayer(puzzle: CrosswordPuzzle, progress: PuzzleProgress) {
  const numberAt = new Map<string, number>();
  for (const clue of puzzle.clues) numberAt.set(`${clue.row}:${clue.column}`, Math.min(clue.number, numberAt.get(`${clue.row}:${clue.column}`) ?? clue.number));
  const selected = puzzle.clues.find((clue) => clueKey(clue.number, clue.direction) === selectedClue) ?? puzzle.clues[0];
  selectedClue = selected ? clueKey(selected.number, selected.direction) : "";
  const selectedCells = new Set(selected ? [...selected.answer].map((_, index) => `${selected.row + (selected.direction === "down" ? index : 0)}:${selected.column + (selected.direction === "across" ? index : 0)}`) : []);
  return `<div class="player-heading"><button class="back-button" data-nav="library">← Puzzles</button><div><span class="eyebrow">Crossword · ${puzzle.difficulty}</span><h1>${escapeHtml(puzzle.title)}</h1></div><span class="timer">${store.data.preferences.showTimer ? formatTime(progress.elapsedSeconds) : ""}</span></div>
    <div class="crossword-layout">
      <div><div class="crossword-grid card" style="--columns:${puzzle.columns};--rows:${puzzle.rows}" role="grid" aria-label="${escapeHtml(puzzle.title)} crossword">
        ${puzzle.grid.flatMap((row, y) => [...row].map((solution, x) => {
          if (solution === "#") return `<span class="crossword-block" aria-hidden="true"></span>`;
          const index = y * puzzle.columns + x;
          const value = progress.entries[index] ?? "";
          const wrong = store.data.preferences.checkAsYouType && value && value !== solution;
          return `<label class="crossword-cell ${selectedCells.has(`${y}:${x}`) ? "active" : ""} ${wrong ? "wrong" : ""}">${numberAt.has(`${y}:${x}`) ? `<span>${numberAt.get(`${y}:${x}`)}</span>` : ""}<input maxlength="1" autocomplete="off" autocapitalize="characters" data-crossword-cell="${index}" data-row="${y}" data-column="${x}" value="${escapeHtml(value)}" aria-label="Row ${y + 1}, column ${x + 1}" /></label>`;
        })).join("")}
      </div><p class="board-note">Type a letter to move through the active clue. Use arrow keys to navigate the grid.</p></div>
      <aside class="clue-panel card">
        ${(["across","down"] as const).map((direction) => `<section><span class="eyebrow">${direction}</span><ol>${puzzle.clues.filter((clue) => clue.direction === direction).map((clue) => `<li><button class="clue ${selectedClue === clueKey(clue.number, clue.direction) ? "active" : ""}" data-clue="${clueKey(clue.number, clue.direction)}"><b>${clue.number}</b><span>${escapeHtml(clue.clue)}</span></button></li>`).join("")}</ol></section>`).join("")}
        ${progress.completedAt ? `<div class="complete-banner"><strong>Puzzle complete</strong><span>${formatTime(progress.elapsedSeconds)}</span></div>` : ""}
        <button class="secondary" data-reset="${puzzle.id}">Start over</button>
      </aside>
    </div>`;
}

function player() {
  if (!activePuzzle) return `<div class="empty card"><h1>Puzzle not found</h1><button class="primary" data-nav="library">Open the library</button></div>`;
  const progress = progressFor(activePuzzle);
  if (!progress) return `<p class="boot">Preparing puzzle…</p>`;
  return activePuzzle.kind === "word-search" ? wordSearchPlayer(activePuzzle, progress) : crosswordPlayer(activePuzzle, progress);
}

function createLab() {
  return `<div class="page-heading"><div><span class="eyebrow">External puzzle tools</span><h1>Create</h1></div></div>
    <div class="split-feature">
      <form class="card create-card" id="word-search-form"><span class="kind-icon">WS</span><h2>Generate a word search</h2><p>Powered locally by <code>@blex41/word-search</code>. Enter one word per line.</p><label>Words<textarea name="words">FOREST\nMOSS\nFERN\nTRAIL\nPINE\nOWL</textarea></label><button class="primary" type="submit">Generate preview</button></form>
      <form class="card create-card" id="crossword-form"><span class="kind-icon">CW</span><h2>Lay out a crossword</h2><p>Powered locally by <code>crossword-layout-generator</code>. Use <code>ANSWER | clue</code> on each line.</p><label>Answers and clues<textarea name="items">FOREST | A large area covered in trees\nFERN | A leafy plant without flowers\nTRAIL | A path through the woods\nPINE | An evergreen tree\nOWL | A nocturnal bird</textarea></label><button class="primary" type="submit">Generate preview</button></form>
    </div>
    <section id="generator-output" aria-live="polite">${message ? `<div class="generator-output card">${message}</div>` : ""}</section>
    <p class="privacy-note">Generated previews stay on this device. Curated catalogue publication requires provenance and licence review.</p>`;
}

function settings() {
  const preferences = store.data.preferences;
  return `<div class="page-heading"><div><span class="eyebrow">Device and cloud</span><h1>Settings</h1></div></div>
    <div class="settings-grid">
      <form class="card settings-card" id="preferences-form"><h2>Appearance & play</h2>
        <label>Theme<select name="theme"><option value="system" ${preferences.theme === "system" ? "selected" : ""}>System</option><option value="light" ${preferences.theme === "light" ? "selected" : ""}>Light</option><option value="dark" ${preferences.theme === "dark" ? "selected" : ""}>Dark</option></select></label>
        <label class="toggle"><input type="checkbox" name="showTimer" ${preferences.showTimer ? "checked" : ""}/><span>Show puzzle timer</span></label>
        <label class="toggle"><input type="checkbox" name="checkAsYouType" ${preferences.checkAsYouType ? "checked" : ""}/><span>Mark incorrect crossword letters</span></label>
        <button class="primary" type="submit">Save preferences</button>
      </form>
      <form class="card settings-card" id="account-form"><h2>Private sync</h2>
        ${!cloudConfigured ? `<p>Firebase is not configured in this build. Device storage remains fully functional.</p>` : cloud.user ? `<p>Signed in as <strong>${escapeHtml(cloud.user.email ?? "account")}</strong>.</p><button class="secondary" type="button" data-sync>Sync now</button><button class="text-button" type="button" data-sign-out>Sign out</button>` : `<p>Sign in to privately sync progress and preferences. Offline play does not require an account.</p><label>Email<input type="email" name="email" required autocomplete="email" /></label><label>Password<input type="password" name="password" minlength="6" required autocomplete="current-password" /></label><div class="button-row"><button class="primary" name="action" value="sign-in">Sign in</button><button class="secondary" name="action" value="create">Create account</button></div><button class="text-button" name="action" value="reset">Send reset email</button>`}
        ${cloud.error ? `<p class="error">${escapeHtml(cloud.error)}</p>` : ""}
      </form>
      <section class="card settings-card"><h2>Device backup</h2>
        <p>Download a private JSON copy of your progress and preferences, or restore one previously exported by WTrack.</p>
        <button class="secondary" type="button" data-export-backup>Download backup</button>
        <form id="import-form" class="import-form"><label>WTrack backup<input type="file" name="backup" accept="application/json,.json" required /></label><button class="primary" type="submit">Restore backup</button></form>
        ${settingsMessage ? `<p class="status-message ${settingsError ? "error" : ""}" role="status">${escapeHtml(settingsMessage)}</p>` : ""}
      </section>
    </div>`;
}

function help() {
  return `<div class="page-heading"><div><span class="eyebrow">How WTrack works</span><h1>Help</h1></div></div>
    <div class="help-grid">
      <article class="card help-card"><h2>Word searches</h2><p>Select the first letter, then the last. Words may run horizontally, vertically, or diagonally, forwards or backwards. Found words stay highlighted.</p></article>
      <article class="card help-card"><h2>Crosswords</h2><p>Select a clue or cell and type. Arrow keys move between cells. Optional checking marks a wrong letter without revealing the answer.</p></article>
      <article class="card help-card"><h2>Offline & privacy</h2><p>Your progress saves to IndexedDB first. The app shell and bundled catalogue are cached for offline use. Firebase sync is optional and owner-protected.</p></article>
      <article class="card help-card"><h2>Puzzle provenance</h2><p>Every bundled puzzle names its source, generator version, and licence. Imported or generated previews are not published automatically.</p></article>
    </div>`;
}

function render(libraryFilter = "all") {
  applyTheme();
  const content = view === "home" ? home() : view === "library" ? library(libraryFilter) : view === "create" ? createLab() : view === "settings" ? settings() : view === "help" ? help() : player();
  app.innerHTML = chrome(content);
  bind();
}

async function openPuzzle(id: string) {
  const puzzle = puzzleById(id);
  if (!puzzle) return;
  activePuzzle = puzzle;
  selectionStart = null;
  selectedClue = puzzle.kind === "crossword" && puzzle.clues[0] ? clueKey(puzzle.clues[0].number, puzzle.clues[0].direction) : "";
  await store.start(puzzle);
  view = "player";
  render();
}

function nextCrosswordIndex(puzzle: CrosswordPuzzle, current: number, key: string) {
  const row = Math.floor(current / puzzle.columns);
  const column = current % puzzle.columns;
  const delta = key === "ArrowLeft" ? [0,-1] : key === "ArrowRight" ? [0,1] : key === "ArrowUp" ? [-1,0] : key === "ArrowDown" ? [1,0] : selectedClue.endsWith("down") ? [1,0] : [0,1];
  let y = row + delta[0]!;
  let x = column + delta[1]!;
  while (y >= 0 && y < puzzle.rows && x >= 0 && x < puzzle.columns) {
    if (puzzle.grid[y]![x] !== "#") return y * puzzle.columns + x;
    y += delta[0]!;
    x += delta[1]!;
  }
  return current;
}

function pointFromCell(cell: HTMLElement): GridPoint {
  const [x, y] = cell.dataset.wordCell!.split(",").map(Number) as [number, number];
  return { x, y };
}

async function completeWordSelection(end: GridPoint) {
  if (!activePuzzle || activePuzzle.kind !== "word-search" || !selectionStart) return false;
  const word = findWord(activePuzzle, wordPath(selectionStart, end));
  selectionStart = null;
  if (word) {
    await store.update(activePuzzle, (progress) => { if (!progress.foundWordIds.includes(word.id)) progress.foundWordIds.push(word.id); });
    void cloud.upload();
  }
  render();
  return Boolean(word);
}

function downloadBackup() {
  const blob = new Blob([createBackup(store.data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `wtrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function bind() {
  app.querySelectorAll<HTMLElement>("[data-nav]").forEach((element) => element.addEventListener("click", () => { view = element.dataset.nav as View; activePuzzle = view === "player" ? activePuzzle : null; message = ""; render(); }));
  app.querySelectorAll<HTMLElement>("[data-open]").forEach((element) => element.addEventListener("click", () => void openPuzzle(element.dataset.open!)));
  app.querySelectorAll<HTMLElement>("[data-filter]").forEach((element) => element.addEventListener("click", () => { view = "library"; render(element.dataset.filter); }));
  app.querySelectorAll<HTMLElement>("[data-library-filter]").forEach((element) => element.addEventListener("click", () => render(element.dataset.libraryFilter)));
  app.querySelectorAll<HTMLElement>("[data-reset]").forEach((element) => element.addEventListener("click", async () => { const puzzle = puzzleById(element.dataset.reset!); if (puzzle && confirm("Start this puzzle over?")) { await store.reset(puzzle); selectionStart = null; render(); void cloud.upload(); } }));

  app.querySelectorAll<HTMLButtonElement>("[data-word-cell]").forEach((cell) => {
    cell.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !activePuzzle || activePuzzle.kind !== "word-search") return;
      dragStart = pointFromCell(cell);
      cell.classList.add("selected");
    });
    cell.addEventListener("pointerup", (event) => {
      if (!dragStart || !activePuzzle || activePuzzle.kind !== "word-search") return;
      const start = dragStart;
      const end = pointFromCell(cell);
      const dragged = end.x !== start.x || end.y !== start.y;
      dragStart = null;
      if (dragged) {
        suppressWordClick = true;
        window.setTimeout(() => { suppressWordClick = false; }, 0);
        event.preventDefault();
        selectionStart = start;
        void completeWordSelection(end);
      }
    });
    cell.addEventListener("pointercancel", () => { dragStart = null; });
    cell.addEventListener("keydown", (event) => {
      if (!activePuzzle || activePuzzle.kind !== "word-search" || !event.key.startsWith("Arrow")) return;
      event.preventDefault();
      const point = pointFromCell(cell);
      const next = {
        x: point.x + (event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0),
        y: point.y + (event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0),
      };
      app.querySelector<HTMLButtonElement>(`[data-word-cell="${next.x},${next.y}"]`)?.focus();
    });
    cell.addEventListener("click", async () => {
      if (suppressWordClick) { suppressWordClick = false; return; }
      if (!activePuzzle || activePuzzle.kind !== "word-search") return;
      const point = pointFromCell(cell);
      if (!selectionStart) { selectionStart = point; render(); return; }
      await completeWordSelection(point);
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-clue]").forEach((button) => button.addEventListener("click", () => { selectedClue = button.dataset.clue!; render(); }));
  app.querySelectorAll<HTMLInputElement>("[data-crossword-cell]").forEach((input) => {
    input.addEventListener("focus", () => {
      if (!activePuzzle || activePuzzle.kind !== "crossword") return;
      const row = Number(input.dataset.row), column = Number(input.dataset.column);
      const candidates = activePuzzle.clues.filter((clue) => [...clue.answer].some((_, offset) => clue.row + (clue.direction === "down" ? offset : 0) === row && clue.column + (clue.direction === "across" ? offset : 0) === column));
      const current = candidates.find((clue) => clueKey(clue.number, clue.direction) === selectedClue);
      const next = current && candidates.length > 1 ? current : candidates[0];
      if (next) { selectedClue = clueKey(next.number, next.direction); render(); app.querySelector<HTMLInputElement>(`[data-crossword-cell="${input.dataset.crosswordCell}"]`)?.focus(); }
    }, { once: true });
    input.addEventListener("input", async () => {
      if (!activePuzzle || activePuzzle.kind !== "crossword") return;
      const value = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
      input.value = value;
      const index = Number(input.dataset.crosswordCell);
      await store.update(activePuzzle, (progress) => { progress.entries[index] = value; });
      render();
      const next = nextCrosswordIndex(activePuzzle, index, "next");
      if (value && next !== index) app.querySelector<HTMLInputElement>(`[data-crossword-cell="${next}"]`)?.focus();
      void cloud.upload();
    });
    input.addEventListener("keydown", (event) => {
      if (!activePuzzle || activePuzzle.kind !== "crossword" || !event.key.startsWith("Arrow")) return;
      event.preventDefault();
      const next = nextCrosswordIndex(activePuzzle, Number(input.dataset.crosswordCell), event.key);
      app.querySelector<HTMLInputElement>(`[data-crossword-cell="${next}"]`)?.focus();
    });
  });

  app.querySelector<HTMLFormElement>("#preferences-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    await store.setPreferences({ theme: form.get("theme") as Preferences["theme"], showTimer: form.has("showTimer"), checkAsYouType: form.has("checkAsYouType") });
    render(); void cloud.upload();
  });

  app.querySelector<HTMLFormElement>("#account-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const email = String(form.get("email") ?? ""), password = String(form.get("password") ?? "");
    try {
      if (submitter?.value === "reset") await sendReset(email);
      else await signInAccount(email, password, submitter?.value === "create");
    } catch (error) { cloud.error = error instanceof Error ? error.message : "Account action failed."; render(); }
  });
  app.querySelector<HTMLElement>("[data-sign-out]")?.addEventListener("click", () => void signOutAccount());
  app.querySelector<HTMLElement>("[data-sync]")?.addEventListener("click", () => void cloud.upload());
  app.querySelector<HTMLElement>("[data-export-backup]")?.addEventListener("click", downloadBackup);
  app.querySelector<HTMLFormElement>("#import-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = new FormData(event.currentTarget as HTMLFormElement).get("backup");
    if (!(file instanceof File) || !file.size) return;
    try {
      const imported = parseBackup(await file.text());
      if (!confirm("Replace this device's WTrack progress and preferences with this backup?")) return;
      await store.replaceData(imported);
      settingsMessage = `Backup restored: ${Object.keys(imported.progress).length} puzzle record${Object.keys(imported.progress).length === 1 ? "" : "s"}.`;
      settingsError = false;
      applyTheme();
      render();
    } catch (error) {
      settingsMessage = error instanceof Error ? error.message : "Could not restore this backup.";
      settingsError = true;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#word-search-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const words = String(new FormData(event.currentTarget as HTMLFormElement).get("words") ?? "").split(/\n|,/).map((word) => word.trim()).filter(Boolean);
      const { generateWordSearch } = await import("./external.ts");
      const result = generateWordSearch(words);
      message = `<h2>Word-search preview</h2><div class="mini-grid" style="--columns:${result.grid[0]?.length ?? 1}">${result.grid.flatMap((row) => [...row]).map((letter) => `<span>${escapeHtml(letter)}</span>`).join("")}</div><p>${result.words.length} of ${words.length} words placed. Review before publishing.</p>`;
    } catch (error) { message = `<p class="error">${escapeHtml(error instanceof Error ? error.message : "Could not generate this puzzle.")}</p>`; }
    render();
  });
  app.querySelector<HTMLFormElement>("#crossword-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const items = String(new FormData(event.currentTarget as HTMLFormElement).get("items") ?? "").split("\n").map((line) => { const [answer, ...clue] = line.split("|"); return { answer: answer?.trim() ?? "", clue: clue.join("|").trim() }; }).filter((item) => item.answer && item.clue);
      const { generateCrossword } = await import("./external.ts");
      const result = generateCrossword(items);
      message = `<h2>Crossword preview</h2><div class="mini-grid crossword-preview" style="--columns:${result.cols}">${result.table.flatMap((row) => row).map((letter) => `<span class="${letter === "-" ? "block" : ""}">${letter === "-" ? "" : escapeHtml(letter)}</span>`).join("")}</div><p>${result.result.filter((item) => item.orientation !== "none").length} of ${items.length} answers placed. Review connectivity before publishing.</p>`;
    } catch (error) { message = `<p class="error">${escapeHtml(error instanceof Error ? error.message : "Could not generate this puzzle.")}</p>`; }
    render();
  });
}

async function boot() {
  await store.load();
  applyTheme();
  void watchAuth((user) => void cloud.setUser(user));
  render();
  if ("serviceWorker" in navigator) void navigator.serviceWorker.register(new URL("./sw.js", document.baseURI));
  const token = ++renderToken;
  window.setInterval(async () => {
    if (token !== renderToken || view !== "player" || !activePuzzle) return;
    const progress = progressFor(activePuzzle);
    if (!progress || progress.completedAt) return;
    progress.elapsedSeconds += 1;
    progress.updatedAt = Date.now();
    await store.save();
    const timer = app.querySelector<HTMLElement>(".timer");
    if (timer && store.data.preferences.showTimer) timer.textContent = formatTime(progress.elapsedSeconds);
  }, 1000);
}

void boot();
