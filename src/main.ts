import "./style.css";
import { createBackup, parseBackup } from "./backup.ts";
import { CATALOGUE_VERSION, crosswords, downloadPuzzle, loadCatalogue, puzzleById, puzzles, registerLocalPuzzle, wordGrids, wordSearches } from "./catalogue.ts";
import { challengeSet, challengeStats } from "./challenges.ts";
import { cloudConfigured, CloudSync, sendReset, signInAccount, signOutAccount, watchAuth } from "./cloud.ts";
import { chooseCrosswordHint, chooseWordGridHint, chooseWordSearchHint, recordWordGridHint, wordGridHintCount, wordGridHintCounts } from "./hints.ts";
import { findWord, nextEmptyCrosswordIndex, wordGridWordForPath, wordPath } from "./puzzles.ts";
import { MAX_OFFLINE_PUZZLES, Store } from "./store.ts";
import type { ChallengeCadence, CrosswordPuzzle, Difficulty, GridPoint, Preferences, Puzzle, PuzzleKind, PuzzleProgress, PuzzleSummary, WordGridPuzzle, WordSearchPuzzle } from "./types.ts";

type View = "home" | "library" | "create" | "settings" | "help" | "player";
const app = document.querySelector<HTMLDivElement>("#app")!;
const store = new Store();
let view: View = "home";
let viewBeforeSettings: Exclude<View, "settings"> = "home";
let activePuzzle: Puzzle | null = null;
let activeSessionId: string | null = null;
let libraryType: "all" | PuzzleKind = "all";
let libraryDifficulty: "all" | Difficulty = "all";
let selectionStart: GridPoint | null = null;
let wordGridPath: GridPoint[] = [];
let wordGridTileOrder: GridPoint[] = [];
let wordGridDragging = false;
let wordGridDragStartLength = 0;
let dragStart: GridPoint | null = null;
let suppressWordClick = false;
let selectedClue = "";
let message = "";
let playerMessage = "";
let libraryMessage = "";
let catalogueError = "";
let cachedPuzzleIds = new Set<string>();
let settingsMessage = "";
let settingsError = false;
let renderToken = 0;

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
const progressFor = (puzzle: { id: string }) => store.data.progress[puzzle.id];
const sessionProgress = () => activeSessionId ? store.data.progress[activeSessionId] : undefined;
const completedCount = () => Object.values(store.data.progress).filter((progress) => progress.completedAt).length;
const kindLabel = (kind: PuzzleKind) => kind === "word-search" ? "Word search" : kind === "crossword" ? "Crossword" : "Word Grid";
const puzzleKindLabel = (puzzle: Pick<PuzzleSummary, "kind" | "wordGridMode">) => puzzle.kind === "word-grid" && puzzle.wordGridMode === "shuffle" ? "Letter Mix" : kindLabel(puzzle.kind);
const kindIcon = (kind: PuzzleKind) => kind === "word-search" ? "WS" : kind === "crossword" ? "CW" : "GRID";

const cloud = new CloudSync(store, () => render());
let authReady: ReturnType<typeof watchAuth> | undefined;

function applyPreferences() {
  const preferences = store.data.preferences;
  Object.assign(document.documentElement.dataset, {
    theme: preferences.theme,
    gridTextSize: preferences.gridTextSize,
    clueTextSize: preferences.clueTextSize,
    menuTextSize: preferences.menuTextSize,
    highlightColour: preferences.highlightColour,
  });
}

function chrome(content: string) {
  const active = view === "player" ? "library" : view;
  return `
    <header class="app-header">
      <button class="brand" data-nav="home" aria-label="WTrack home"><span class="brand-grid">W</span><span>WTrack</span></button>
      <span class="connectivity ${navigator.onLine ? "online" : "offline"}">${navigator.onLine ? "Online" : "Offline"}</span>
      <span class="cloud-state">${escapeHtml(cloud.status())}</span>
      <nav aria-label="Primary">
        ${[["home","Home"],["library","Puzzles"],["create","Create"],["settings","Settings"],["help","Help"]].map(([id, label]) => `<button data-nav="${id}" class="${active === id ? "active" : ""}">${label}</button>`).join("")}
      </nav>
    </header>
    <main id="main" class="${view === "player" ? "player-main" : ""}">${content}</main>
    <footer class="app-footer"><span>Offline-first · No ads or analytics</span><a href="https://github.com/BicycleJeanre/wtrack">Source & provenance</a></footer>`;
}

function puzzleCard(puzzle: PuzzleSummary, sessionId = puzzle.id, removable = false) {
  const progress = store.data.progress[sessionId];
  const status = progress?.completedAt ? "Complete" : progress ? "Continue" : "Start";
  const cached = cachedPuzzleIds.has(puzzle.id);
  const privateLocal = puzzle.catalogueVersion === "local-import-1" || puzzle.catalogueVersion.startsWith("wikidata-live-");
  const available = cached || (!privateLocal && navigator.onLine);
  return `<article class="puzzle-card card">
    <span class="kind-icon" aria-hidden="true">${kindIcon(puzzle.kind)}</span>
    <div><span class="eyebrow">${progress?.challenge ? `${progress.challenge.cadence} challenge · ` : ""}${puzzleKindLabel(puzzle)} · ${puzzle.difficulty}</span><h3>${escapeHtml(puzzle.title)}</h3><p>${escapeHtml(puzzle.subtitle)}</p>${cached ? `<span class="offline-label">Available offline</span>` : ""}</div>
    <div class="card-actions"><button class="secondary compact" data-open="${puzzle.id}" data-session="${sessionId}" ${available ? "" : "disabled"}>${available ? status : privateLocal ? "Create again" : "Online only"}</button>${removable ? `<button class="text-button danger-action" data-delete-progress="${sessionId}" aria-label="Delete saved progress for ${escapeHtml(puzzle.title)}">Delete</button>` : ""}</div>
  </article>`;
}

function challengeSection(cadence: ChallengeCadence) {
  const set = challengeSet(puzzles.filter((puzzle) => puzzle.catalogueVersion === CATALOGUE_VERSION), cadence);
  const stats = challengeStats(Object.values(store.data.progress), cadence);
  return `<section class="section challenge-section">
    <div class="section-heading"><div><span class="eyebrow">Stable ${cadence === "daily" ? "until midnight UTC" : "for the ISO week"}</span><h2>${cadence === "daily" ? "Daily" : "Weekly"} challenges</h2></div><span class="catalogue-badge">${stats.currentPeriodCompleted}/4 current · ${stats.streak} ${cadence === "daily" ? "day" : "week"} streak</span></div>
    <div class="challenge-grid">${set.map(({ difficulty, puzzle, periodKey, sessionId }) => {
      const progress = store.data.progress[sessionId];
      const cached = cachedPuzzleIds.has(puzzle.id);
      const available = navigator.onLine || cached;
      return `<article class="card challenge-card"><span class="eyebrow">${difficulty} · ${puzzleKindLabel(puzzle)}</span><h3>${escapeHtml(puzzle.title)}</h3><p>${escapeHtml(periodKey)}${cached ? " · Offline" : ""}</p><button class="secondary compact" data-open="${puzzle.id}" data-session="${sessionId}" data-challenge="${cadence}" data-period="${periodKey}" data-difficulty="${difficulty}" ${available ? "" : "disabled"}>${available ? progress?.completedAt ? "Complete" : progress ? "Continue" : "Start challenge" : "Online only"}</button></article>`;
    }).join("")}</div>
    <p class="challenge-stats">${stats.completed} completed · ${stats.averageSeconds === null ? "No average yet" : `${formatTime(stats.averageSeconds)} average`}</p>
  </section>`;
}

function puzzleProvenance(puzzle: Puzzle) {
  return `<details class="puzzle-provenance"><summary>Source & generation details</summary><p><strong>${escapeHtml(puzzle.source.name)}</strong> · ${escapeHtml(puzzle.source.licence)}</p><p>${escapeHtml(puzzle.source.note)}</p>${puzzle.source.url !== "about:blank" ? `<a href="${escapeHtml(puzzle.source.url)}" target="_blank" rel="noreferrer">Open source record</a>` : ""}</details>`;
}

function home() {
  const entries = Object.entries(store.data.progress).sort(([, left], [, right]) => right.updatedAt - left.updatedAt);
  const active = entries.filter(([, progress]) => !progress.completedAt).slice(0, 4);
  const completed = entries.filter(([, progress]) => progress.completedAt).slice(0, 4);
  return `<section class="hero card">
    <div><span class="eyebrow">Your quiet word-puzzle desk</span><h1>Find. Fill. Build.</h1><p>Browse the growing public catalogue online. Your ten most recently opened puzzles stay ready for offline play.</p></div>
    <button class="primary" data-nav="library">Choose a puzzle<small>${puzzles.length} in the public catalogue</small></button>
  </section>
  ${active.length ? `<section class="section active-section"><div class="section-heading"><div><span class="eyebrow">Pick up where you left off</span><h2>Active puzzles</h2></div></div><div class="puzzle-list">${active.map(([sessionId, progress]) => { const puzzle = puzzleById(progress.puzzleId); return puzzle ? puzzleCard(puzzle, sessionId, true) : ""; }).join("")}</div></section>` : ""}
  ${challengeSection("daily")}
  ${challengeSection("weekly")}
  <section class="stat-grid">
    <article class="card stat"><b>${wordSearches.length}</b><span>Word searches</span></article>
    <article class="card stat"><b>${crosswords.length}</b><span>Crosswords</span></article>
    <article class="card stat"><b>${wordGrids.length}</b><span>Word Grids</span></article>
    <article class="card stat"><b>${completedCount()}</b><span>Completed</span></article>
  </section>
  ${completed.length ? `<section class="section completed-section"><div class="section-heading"><div><span class="eyebrow">Your recent finishes</span><h2>Completed puzzles</h2></div></div><div class="puzzle-list">${completed.map(([sessionId, progress]) => { const puzzle = puzzleById(progress.puzzleId); return puzzle ? puzzleCard(puzzle, sessionId, true) : ""; }).join("")}</div></section>` : ""}
  <section class="split-feature">
    <article class="card feature"><span class="kind-icon">WS</span><h2>Word searches</h2><p>Trace in eight directions, track every find, and resume on any screen size.</p><button class="text-button" data-filter="word-search">Browse word searches →</button></article>
    <article class="card feature"><span class="kind-icon">CW</span><h2>Crosswords</h2><p>Keyboard-first grids, paired across/down clues, and optional checking as you type.</p><button class="text-button" data-filter="crossword">Browse crosswords →</button></article>
    <article class="card feature"><span class="kind-icon">GRID</span><h2>Word Grid</h2><p>Trace connected grids or mix free-order letter trays, then uncover every hidden target word.</p><button class="text-button" data-filter="word-grid">Browse Word Grids →</button></article>
  </section>`;
}

function library() {
  const visible = puzzles.filter((puzzle) => (libraryType === "all" || puzzle.kind === libraryType) && (libraryDifficulty === "all" || puzzle.difficulty === libraryDifficulty));
  return `<div class="page-heading"><div><span class="eyebrow">Public catalogue and your local puzzles</span><h1>Puzzles</h1></div><span class="catalogue-badge">${puzzles.length} puzzles · ${cachedPuzzleIds.size}/${MAX_OFFLINE_PUZZLES} offline</span></div>
    <div class="filter-row">
      <div class="filter-tabs" role="group" aria-label="Puzzle type">
        ${[["all","All types"],["word-search","Word searches"],["crossword","Crosswords"],["word-grid","Word Grids"]].map(([id,label]) => `<button data-library-filter="${id}" aria-pressed="${libraryType === id}">${label}</button>`).join("")}
      </div>
      <div class="filter-tabs difficulty-tabs" role="group" aria-label="Difficulty">
        ${[["all","All levels"],["Easy","Easy"],["Medium","Medium"],["Hard","Hard"],["Diabolical","Diabolical"],["Unrated","Unrated"]].map(([id,label]) => `<button data-difficulty-filter="${id}" aria-pressed="${libraryDifficulty === id}">${label}</button>`).join("")}
      </div>
    </div>
    ${libraryMessage ? `<p class="status-message ${libraryMessage.startsWith("Could not") ? "error" : ""}" role="status">${escapeHtml(libraryMessage)}</p>` : ""}
    <p class="result-count">Showing ${visible.length} of ${puzzles.length} puzzles · opening a puzzle makes it available offline</p>
    <div class="puzzle-list">${visible.map((puzzle) => puzzleCard(puzzle)).join("")}</div>`;
}

function wordSearchPlayer(puzzle: WordSearchPuzzle, progress: PuzzleProgress) {
  const foundCells = new Set(puzzle.words.filter((word) => progress.foundWordIds.includes(word.id)).flatMap((word) => word.path.map(({ x, y }) => `${x}:${y}`)));
  const hintedCells = new Set(progress.hintedCells);
  return `<div class="player-heading"><button class="back-button" data-nav="library">← Puzzles</button><div><span class="eyebrow">${progress.challenge ? `${progress.challenge.cadence} challenge · ` : ""}Word search · ${puzzle.difficulty}</span><h1>${escapeHtml(puzzle.title)}</h1></div><span class="timer">${store.data.preferences.showTimer ? formatTime(progress.elapsedSeconds) : ""}</span></div>
    <div class="player-layout">
      <div class="board-column">
        <div class="word-grid card" style="--columns:${puzzle.columns}" role="grid" aria-label="${escapeHtml(puzzle.title)} word search">
          ${puzzle.grid.flatMap((row, y) => [...row].map((letter, x) => {
            const hinted = hintedCells.has(y * puzzle.columns + x);
            return `<button role="gridcell" class="word-cell ${foundCells.has(`${x}:${y}`) ? "found" : ""} ${hinted ? "hinted" : ""} ${selectionStart?.x === x && selectionStart?.y === y ? "selected" : ""}" data-word-cell="${x},${y}" aria-label="Row ${y + 1}, column ${x + 1}, ${letter}${hinted ? ", hint highlighted" : ""}">${letter}</button>`;
          })).join("")}
        </div>
        ${store.data.preferences.showControlHelp ? `<p class="board-note">Drag across a word, or select its first and last letters. With a keyboard, use the arrow keys to move and Enter or Space to select.</p>` : ""}
      </div>
      <aside class="controls card"><div class="control-heading"><span class="eyebrow">Find these words</span><strong>${progress.foundWordIds.length} / ${puzzle.words.length}</strong></div>
        ${store.data.preferences.showHints ? `<div class="hint-actions"><button class="secondary" data-hint>Give me a hint</button><span>${progress.hintedCells.length} used</span></div>` : ""}
        ${playerMessage ? `<p class="hint-message" role="status">${escapeHtml(playerMessage)}</p>` : ""}
        <ul class="word-list">${puzzle.words.map((word) => `<li class="${progress.foundWordIds.includes(word.id) ? "found" : ""}"><span>${escapeHtml(word.label)}</span><span>${progress.foundWordIds.includes(word.id) ? "Found" : `${word.label.length} letters`}</span></li>`).join("")}</ul>
        ${progress.completedAt ? `<div class="complete-banner"><strong>Puzzle complete</strong><span>${formatTime(progress.elapsedSeconds)}</span></div>` : ""}
        ${puzzleProvenance(puzzle)}
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
  return `<div class="player-heading"><button class="back-button" data-nav="library">← Puzzles</button><div><span class="eyebrow">${progress.challenge ? `${progress.challenge.cadence} challenge · ` : ""}Crossword · ${puzzle.difficulty}</span><h1>${escapeHtml(puzzle.title)}</h1></div><span class="timer">${store.data.preferences.showTimer ? formatTime(progress.elapsedSeconds) : ""}</span></div>
    <div class="crossword-layout">
      <div><div class="crossword-grid card" style="--columns:${puzzle.columns};--rows:${puzzle.rows}" role="grid" aria-label="${escapeHtml(puzzle.title)} crossword">
        ${puzzle.grid.flatMap((row, y) => [...row].map((solution, x) => {
          if (solution === "#") return `<span class="crossword-block" aria-hidden="true"></span>`;
          const index = y * puzzle.columns + x;
          const value = progress.entries[index] ?? "";
          const wrong = store.data.preferences.checkAsYouType && value && value !== solution;
          const hinted = progress.hintedCells.includes(index);
          return `<label class="crossword-cell ${selectedCells.has(`${y}:${x}`) ? "active" : ""} ${wrong ? "wrong" : ""} ${hinted ? "hinted" : ""}">${numberAt.has(`${y}:${x}`) ? `<span>${numberAt.get(`${y}:${x}`)}</span>` : ""}<input maxlength="1" autocomplete="off" autocapitalize="characters" data-crossword-cell="${index}" data-row="${y}" data-column="${x}" value="${escapeHtml(value)}" aria-label="Row ${y + 1}, column ${x + 1}${hinted ? ", letter revealed by hint" : ""}" /></label>`;
        })).join("")}
      </div>${store.data.preferences.showControlHelp ? `<p class="board-note">Type a letter to move through the active clue. Use arrow keys to navigate the grid.</p>` : ""}</div>
      <aside class="clue-panel card">
        ${store.data.preferences.showHints ? `<div class="hint-actions"><button class="secondary" data-hint>Reveal a letter</button><span>${progress.hintedCells.length} used</span></div>` : ""}
        ${playerMessage ? `<p class="hint-message" role="status">${escapeHtml(playerMessage)}</p>` : ""}
        ${(["across","down"] as const).map((direction) => `<section><span class="eyebrow">${direction}</span><ol>${puzzle.clues.filter((clue) => clue.direction === direction).map((clue) => `<li><button class="clue ${selectedClue === clueKey(clue.number, clue.direction) ? "active" : ""}" data-clue="${clueKey(clue.number, clue.direction)}"><b>${clue.number}</b><span>${escapeHtml(clue.clue)}</span></button></li>`).join("")}</ol></section>`).join("")}
        ${progress.completedAt ? `<div class="complete-banner"><strong>Puzzle complete</strong><span>${formatTime(progress.elapsedSeconds)}</span></div>` : ""}
        ${puzzleProvenance(puzzle)}
        <button class="secondary" data-reset="${puzzle.id}">Start over</button>
      </aside>
    </div>`;
}

function wordGridPlayer(puzzle: WordGridPuzzle, progress: PuzzleProgress) {
  const isShuffle = puzzle.wordGridMode === "shuffle";
  const naturalOrder = puzzle.grid.flatMap((row, y) => [...row].map((_, x) => ({ x, y })));
  const tileOrder = isShuffle && wordGridTileOrder.length === naturalOrder.length ? wordGridTileOrder : naturalOrder;
  const selected = new Set(wordGridPath.map(({ x, y }) => `${x}:${y}`));
  const currentWord = wordGridPath.map(({ x, y }) => puzzle.grid[y]?.[x] ?? "").join("");
  const targetIds = new Set(puzzle.roundWordIds);
  const roundWords = puzzle.words.filter((word) => targetIds.has(word.id));
  const found = roundWords.filter((word) => progress.foundWordIds.includes(word.id));
  const foundIds = new Set(progress.foundWordIds);
  const bonusWords = puzzle.words.filter((word) => !targetIds.has(word.id) && foundIds.has(word.id));
  const wordLengths = [...new Set(roundWords.map((word) => word.label.length))].sort((left, right) => left - right);
  const hintedLetterCount = [...wordGridHintCounts(puzzle, progress).values()].reduce((total, count) => total + count, 0);
  const score = puzzle.words.filter((word) => foundIds.has(word.id)).reduce((total, word) => total + word.score, 0);
  return `<div class="player-heading"><button class="back-button" data-nav="library">← Puzzles</button><div><span class="eyebrow">${progress.challenge ? `${progress.challenge.cadence} challenge · ` : ""}${isShuffle ? "Letter Mix" : "Word Grid"} · ${puzzle.difficulty}</span><h1>${escapeHtml(puzzle.title)}</h1></div><span class="timer">${store.data.preferences.showTimer ? formatTime(progress.elapsedSeconds) : ""}</span></div>
    <div class="player-layout">
      <div class="board-column">
        <div class="letter-grid card ${isShuffle ? "shuffle" : ""}" style="--columns:${puzzle.columns};--rows:${puzzle.rows}" role="grid" aria-label="${escapeHtml(puzzle.title)} ${isShuffle ? "letter tray" : "Word Grid"}">
          ${tileOrder.map(({ x, y }) => {
            const letter = puzzle.grid[y]?.[x] ?? "";
            return `<button role="gridcell" class="grid-letter ${selected.has(`${x}:${y}`) ? "selected" : ""}" data-grid-cell="${x},${y}" aria-pressed="${selected.has(`${x}:${y}`)}" aria-label="${isShuffle ? "Letter" : `Row ${y + 1}, column ${x + 1}`}, ${letter}">${letter}</button>`;
          }).join("")}
        </div>
        ${store.data.preferences.showControlHelp ? `<p class="board-note">${isShuffle ? "Tap unused letters in any order to build a word. Each tile can be used once per word. Shuffle rearranges the tray without changing your score or found words." : "Drag through adjacent letters, or tap letters one at a time. Tiles may touch horizontally, vertically, or diagonally and cannot be reused."} Arrow keys move focus; Enter or Space adds a tile.</p>` : ""}
      </div>
      <aside class="controls card">
        <div class="control-heading"><span class="eyebrow">Score</span><strong>${score} point${score === 1 ? "" : "s"}</strong></div>
        <div class="current-word" aria-live="polite"><span>${currentWord || "Choose a letter"}</span><small>${currentWord ? `${currentWord.length} letters` : `Minimum ${puzzle.minimumLength}`}</small></div>
        <div class="button-row"><button class="primary" data-grid-submit ${wordGridPath.length < puzzle.minimumLength ? "disabled" : ""}>Submit word</button><button class="secondary" data-grid-clear ${wordGridPath.length ? "" : "disabled"}>Clear</button>${isShuffle ? `<button class="secondary" data-grid-shuffle>Shuffle letters</button>` : ""}</div>
        ${store.data.preferences.showHints ? `<div class="hint-actions"><button class="secondary" data-hint>Reveal a round-word letter</button><span>${hintedLetterCount} letter${hintedLetterCount === 1 ? "" : "s"} shown</span></div>` : ""}
        ${playerMessage ? `<p class="hint-message" role="status">${escapeHtml(playerMessage)}</p>` : ""}
        <section class="round-words" aria-labelledby="round-words-heading">
          <div class="control-heading"><span class="eyebrow" id="round-words-heading">Round words</span><strong>${found.length} / ${roundWords.length}</strong></div>
          <p class="round-words-note">These are the fixed target words for this ${isShuffle ? "tray" : "grid"}. Blank slots show each word's length; its letters stay hidden until you find it. Find every listed word to finish the round; other valid words score as bonuses.</p>
          <div class="round-word-scroll">${wordLengths.map((length) => `<section class="word-length-group" aria-label="${length}-letter words"><h3>${length} letters</h3><ul>${roundWords.filter((word) => word.label.length === length).sort((left, right) => left.label.localeCompare(right.label)).map((word) => {
            const isFound = foundIds.has(word.id);
            const hintedCount = isFound ? 0 : wordGridHintCount(puzzle, progress, word.id);
            const accessibleLabel = isFound ? `${word.label}, found` : hintedCount ? `${hintedCount} of ${length} letters revealed in an unfound word` : `Unfound ${length}-letter word`;
            return `<li class="round-word-item ${isFound ? "found" : hintedCount ? "has-hint" : ""}" data-round-word="${word.id}"><span class="visually-hidden">${accessibleLabel}</span><span class="round-word-answer" aria-hidden="true">${isFound ? escapeHtml(word.label) : [...word.label].map((letter, index) => `<i class="answer-slot ${index < hintedCount ? "hinted" : ""}">${index < hintedCount ? letter : "_"}</i>`).join("")}</span><b>+${word.score}</b></li>`;
          }).join("")}</ul></section>`).join("")}</div>
        </section>
        ${bonusWords.length ? `<section class="bonus-words" aria-labelledby="bonus-words-heading"><div class="control-heading"><span class="eyebrow" id="bonus-words-heading">Bonus words</span><strong>${bonusWords.length}</strong></div><ul>${bonusWords.sort((left, right) => left.label.localeCompare(right.label)).map((word) => `<li class="bonus-word"><span>${escapeHtml(word.label)}</span><b>+${word.score}</b></li>`).join("")}</ul></section>` : ""}
        ${progress.completedAt ? `<div class="complete-banner"><strong>Round complete</strong><span>${formatTime(progress.elapsedSeconds)}</span></div>` : ""}
        ${puzzleProvenance(puzzle)}
        <button class="secondary" data-reset="${puzzle.id}">Start over</button>
      </aside>
    </div>`;
}

function player() {
  if (!activePuzzle) return `<div class="empty card"><h1>Puzzle not found</h1><button class="primary" data-nav="library">Open the library</button></div>`;
  const progress = sessionProgress();
  if (!progress) return `<p class="boot">Preparing puzzle…</p>`;
  return activePuzzle.kind === "word-search" ? wordSearchPlayer(activePuzzle, progress) : activePuzzle.kind === "crossword" ? crosswordPlayer(activePuzzle, progress) : wordGridPlayer(activePuzzle, progress);
}

function createLab() {
  return `<div class="page-heading"><div><span class="eyebrow">External puzzle tools</span><h1>Create</h1></div></div>
    <form class="card create-card public-data-card" id="wikidata-form"><span class="kind-icon">LIVE</span><div><span class="eyebrow">Public data, generated on demand</span><h2>Create a playable puzzle from Wikimedia data</h2><p>Enter an English Wikipedia topic-page title. WTrack discovers its linked concepts, fetches their public Wikidata labels and descriptions, builds the puzzle in this browser, and keeps the complete result in the same ten-puzzle offline cache. No account or API key is needed.</p></div><div class="public-data-fields"><label>Topic page<input name="topic" value="astronomy" minlength="3" maxlength="80" required autocomplete="off" /></label><label>Puzzle type<select name="kind"><option value="word-search">Word search</option><option value="crossword">Crossword</option></select></label><label>Difficulty profile<select name="difficulty"><option>Easy</option><option selected>Medium</option><option>Hard</option><option>Diabolical</option></select></label></div><button class="primary" type="submit">Create public-data puzzle</button><p class="privacy-note">Requires a connection only while generating. The source topic page, selected Wikidata QIDs, licences, retrieval time, generator versions, and selection seed are saved with the puzzle. Friendly difficulty profiles change term length, count, grid size, and word direction; they are not a universal rating.</p></form>
    <div class="split-feature">
      <form class="card create-card" id="word-search-form"><span class="kind-icon">WS</span><h2>Generate a word search</h2><p>Powered locally by <code>@blex41/word-search</code>. Enter one word per line.</p><label>Words<textarea name="words">FOREST\nMOSS\nFERN\nTRAIL\nPINE\nOWL</textarea></label><button class="primary" type="submit">Generate preview</button></form>
      <form class="card create-card" id="crossword-form"><span class="kind-icon">CW</span><h2>Lay out a crossword</h2><p>Powered locally by <code>crossword-layout-generator</code>. Use <code>ANSWER | clue</code> on each line.</p><label>Answers and clues<textarea name="items">FOREST | A large area covered in trees\nFERN | A leafy plant without flowers\nTRAIL | A path through the woods\nPINE | An evergreen tree\nOWL | A nocturnal bird</textarea></label><button class="primary" type="submit">Generate preview</button></form>
      <form class="card create-card" id="crossword-import-form"><span class="kind-icon">OPEN</span><h2>Open a crossword file</h2><p>Import licensed or personal iPUZ, PUZ, JPZ, or XD files locally through <code>@xwordly/xword-parser</code>. Imports are marked Unrated and are never published automatically.</p><label>Crossword file<input type="file" name="crossword" accept=".ipuz,.puz,.jpz,.xd,application/json,application/octet-stream,text/plain" required /></label><button class="primary" type="submit">Open private puzzle</button></form>
    </div>
    <section id="generator-output" aria-live="polite">${message ? `<div class="generator-output card">${message}</div>` : ""}</section>
    <p class="privacy-note">Generated puzzles, previews, and imports stay on this device. They are not synchronized as puzzle payloads or added to the curated catalogue automatically.</p>`;
}

function settingSelect(key: keyof Preferences, title: string, detail: string, value: string, options: Array<[string, string]>) {
  return `<label class="settings-field"><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span><select data-preference-select="${key}" aria-label="${escapeHtml(title)}">${options.map(([option, label]) => `<option value="${option}" ${value === option ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label>`;
}

function settingToggle(key: keyof Preferences, title: string, detail: string, checked: boolean) {
  return `<label class="toggle settings-field"><input type="checkbox" data-preference-toggle="${key}" ${checked ? "checked" : ""}/><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span></label>`;
}

function settings() {
  const preferences = store.data.preferences;
  const sizes: Array<[string, string]> = [["small", "Small"], ["medium", "Medium"], ["large", "Large"]];
  return `<div class="page-heading"><div><span class="eyebrow">Device and cloud</span><h1>Settings</h1></div><span class="catalogue-badge">Changes save automatically</span></div>
    ${settingsMessage ? `<p class="status-message ${settingsError ? "error" : ""}" role="status">${escapeHtml(settingsMessage)}</p>` : ""}
    <div class="settings-grid">
      <form class="card settings-card account-card" id="account-form"><span class="eyebrow">Cross-device sessions</span><h2>Private sync</h2>
        ${!cloudConfigured ? `<p>Firebase is not configured in this build. Device storage remains fully functional.</p>` : cloud.user ? `<p>Signed in as <strong>${escapeHtml(cloud.user.email ?? "account")}</strong>.</p><button class="secondary" type="button" data-sync>Sync now</button><button class="text-button" type="button" data-sign-out>Sign out</button>` : `<p>Sign in to privately sync progress and preferences. Offline play does not require an account.</p><label>Email<input type="email" name="email" required autocomplete="email" /></label><label>Password<input type="password" name="password" minlength="6" required autocomplete="current-password" /></label><div class="button-row"><button class="primary" name="action" value="sign-in">Sign in</button><button class="secondary" name="action" value="create">Create account</button></div><button class="text-button" name="action" value="reset">Send reset email</button>`}
        ${cloud.error ? `<p class="error">${escapeHtml(cloud.error)}</p>` : ""}
      </form>
      <section class="card settings-card"><span class="eyebrow">Appearance</span><h2>Make the desk yours</h2>
        ${settingSelect("theme", "Theme", "Follow the device or keep one theme.", preferences.theme, [["system", "System"], ["light", "Light"], ["dark", "Dark"]])}
        ${settingToggle("showTimer", "Show timer", "Keep elapsed time visible without turning it into a score.", preferences.showTimer)}
        <p class="preference-status" data-preferences-status role="status">Preferences save on this device and sync when signed in.</p>
      </section>
      <section class="card settings-card"><span class="eyebrow">Player layout</span><h2>Choose what stays visible</h2>
        ${settingToggle("showHints", "Show hint controls", "Keep the local hint actions in all three puzzle players.", preferences.showHints)}
        ${settingToggle("showControlHelp", "Show help text", "Keep keyboard, touch, and selection reminders beneath each board.", preferences.showControlHelp)}
      </section>
      <section class="card settings-card"><span class="eyebrow">Readability</span><h2>Type size and highlight</h2><p>Choose from tested presets rather than fine-tuning individual values.</p>
        ${settingSelect("gridTextSize", "Grid letter size", "Letters inside Word Grid, word-search, and crossword cells.", preferences.gridTextSize, sizes)}
        ${settingSelect("clueTextSize", "Clue and word-list size", "Crossword clues and found or target word lists.", preferences.clueTextSize, sizes)}
        ${settingSelect("menuTextSize", "Menu text size", "Navigation and primary player controls.", preferences.menuTextSize, sizes)}
        ${settingSelect("highlightColour", "Board highlight colour", "Selected cells, active clues, and hint outlines.", preferences.highlightColour, [["cyan", "Cyan"], ["amber", "Amber"], ["violet", "Violet"], ["green", "Green"]])}
      </section>
      <section class="card settings-card"><span class="eyebrow">Assistance</span><h2>Hints and checks</h2>
        ${settingToggle("checkAsYouType", "Mark incorrect crossword letters", "Add a visible error state without revealing the correct answer.", preferences.checkAsYouType)}
        <p>Hiding hint controls does not erase hints already used. All hint selection still runs locally and works offline.</p>
      </section>
      <section class="card settings-card"><span class="eyebrow">Backup</span><h2>Your device data</h2>
        <p>Download a private JSON copy of your progress and preferences. Restore merges missing sessions without replacing progress already on this device.</p>
        <button class="secondary" type="button" data-export-backup>Download backup</button>
        <form id="import-form" class="import-form"><label>WTrack backup<input type="file" name="backup" accept="application/json,.json" required /></label><button class="primary" type="submit">Merge backup</button></form>
      </section>
      <section class="card settings-card"><span class="eyebrow">Storage</span><h2>Offline data controls</h2><p><strong>${cachedPuzzleIds.size} of ${MAX_OFFLINE_PUZZLES}</strong> offline puzzle slots are in use. Reset the current session, clear history, all progress, or downloaded payloads independently.</p><div class="data-actions">${activePuzzle && activeSessionId ? `<button class="secondary danger-action" type="button" data-reset-current>Reset current puzzle</button>` : ""}<button class="secondary" type="button" data-clear-progress="completed">Clear completed sessions</button><button class="secondary danger-action" type="button" data-clear-progress="all">Clear all progress</button><button class="secondary" type="button" data-clear-cache>Clear offline puzzles</button></div><p class="storage-note">Progress deletion synchronizes when signed in. Clearing offline puzzle payloads keeps progress and preferences.</p></section>
      <section class="card settings-card"><span class="eyebrow">Help</span><h2>How WTrack works</h2><button class="secondary" type="button" data-nav="help">Open user guide</button><p class="storage-note"><strong>${navigator.onLine ? "Online" : "Offline"}.</strong> The shell, help, preferences, saved progress, catalogue index, and ten most recently opened puzzles work without a connection after the first production load.</p></section>
    </div>`;
}

function help() {
  return `<div class="page-heading"><div><span class="eyebrow">How WTrack works</span><h1>Help</h1></div></div>
    <div class="help-grid">
      <article class="card help-card"><h2>Word searches</h2><p>Select the first letter, then the last. Words may run horizontally, vertically, or diagonally, forwards or backwards. Found words stay highlighted.</p></article>
      <article class="card help-card"><h2>Crosswords</h2><p>Select a clue or cell and type. Arrow keys move between cells. Optional checking marks a wrong letter without revealing the answer.</p></article>
      <article class="card help-card"><h2>Word Grid</h2><p>Trace or tap adjacent letters to build words of three or more letters. Move horizontally, vertically, or diagonally without reusing a tile. Each round has a fixed hidden target list; find every listed word to complete the puzzle. Other valid words earn bonus points.</p></article>
      <article class="card help-card"><h2>Hints</h2><p>Word-search hints highlight one useful cell. Crossword hints reveal one letter. Word Grid hints reveal one letter at a time inside a hidden round-word entry without marking any grid tile. Hints work locally and stay recorded with your progress.</p></article>
      <article class="card help-card"><h2>Offline & privacy</h2><p>Your progress saves to IndexedDB first. The app shell, catalogue index, and ten most recently opened puzzles work offline. Older puzzle payloads are removed automatically without deleting progress. Firebase sync is optional and owner-protected.</p></article>
      <article class="card help-card"><h2>Challenges</h2><p>Daily and weekly selections are deterministic for every difficulty. Each challenge has its own saved session, works offline after its puzzle has been opened, and contributes to completion, average-time, and streak summaries.</p></article>
      <article class="card help-card"><h2>Backups & deletion</h2><p>Backup restore is non-destructive: it adds missing sessions and keeps existing ones. Delete one saved session from Home, or use scoped controls in Settings. Signed-in deletions synchronize through private tombstones.</p></article>
      <article class="card help-card"><h2>Puzzle provenance</h2><p>Every published puzzle names its source, generator version, and licence. Imported or generated previews are not published automatically.</p></article>
    </div>`;
}

function render() {
  applyPreferences();
  const content = catalogueError
    ? `<div class="empty card"><h1>Catalogue unavailable</h1><p>${escapeHtml(catalogueError)}</p><button class="primary" data-retry-catalogue>Try again</button></div>`
    : view === "home" ? home() : view === "library" ? library() : view === "create" ? createLab() : view === "settings" ? settings() : view === "help" ? help() : player();
  app.innerHTML = chrome(content);
  bind();
}

async function openPuzzle(id: string, sessionId = id, challenge?: PuzzleProgress["challenge"]) {
  const summary = puzzleById(id);
  if (!summary) return;
  libraryMessage = cachedPuzzleIds.has(id) ? "Opening saved offline puzzle…" : "Downloading puzzle for offline play…";
  render();
  let puzzle = await store.getCachedPuzzle(id);
  if (puzzle?.kind === "word-grid" && (!Array.isArray(puzzle.roundWordIds) || puzzle.catalogueVersion !== summary.catalogueVersion)) puzzle = null;
  try {
    if (!puzzle) {
      puzzle = await downloadPuzzle(id);
      cachedPuzzleIds = new Set(await store.cachePuzzle(puzzle));
    } else {
      cachedPuzzleIds = new Set(await store.cachedPuzzleIds());
    }
  } catch (error) {
    libraryMessage = navigator.onLine
      ? `Could not open this puzzle. ${error instanceof Error ? error.message : "Please try again."}`
      : "Could not open this puzzle offline. Reconnect once to download it.";
    render();
    return;
  }
  activePuzzle = puzzle;
  activeSessionId = sessionId;
  selectionStart = null;
  wordGridPath = [];
  wordGridTileOrder = puzzle.kind === "word-grid" ? puzzle.grid.flatMap((row, y) => [...row].map((_, x) => ({ x, y }))) : [];
  playerMessage = "";
  selectedClue = puzzle.kind === "crossword" && puzzle.clues[0] ? clueKey(puzzle.clues[0].number, puzzle.clues[0].direction) : "";
  await store.start(puzzle, sessionId, challenge);
  view = "player";
  libraryMessage = "";
  render();
  window.scrollTo({ top: 0, behavior: "auto" });
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
    await store.update(activePuzzle, (progress) => { if (!progress.foundWordIds.includes(word.id)) progress.foundWordIds.push(word.id); }, activeSessionId ?? activePuzzle.id);
    void cloud.upload();
  }
  render();
  return Boolean(word);
}

function wordGridPoint(cell: HTMLElement): GridPoint {
  const [x, y] = cell.dataset.gridCell!.split(",").map(Number) as [number, number];
  return { x, y };
}

function appendWordGridPoint(point: GridPoint) {
  if (!activePuzzle || activePuzzle.kind !== "word-grid") return false;
  const previous = wordGridPath.at(-1);
  if (wordGridPath.some(({ x, y }) => x === point.x && y === point.y)) return false;
  if (activePuzzle.wordGridMode === "adjacent" && previous && Math.max(Math.abs(previous.x - point.x), Math.abs(previous.y - point.y)) !== 1) return false;
  wordGridPath.push(point);
  return true;
}

async function submitWordGrid() {
  if (!activePuzzle || activePuzzle.kind !== "word-grid") return;
  const puzzle = activePuzzle;
  const word = wordGridWordForPath(puzzle, wordGridPath);
  const label = wordGridPath.map(({ x, y }) => puzzle.grid[y]?.[x] ?? "").join("");
  const progress = sessionProgress();
  const isTarget = word ? puzzle.roundWordIds.includes(word.id) : false;
  if (word && progress?.foundWordIds.includes(word.id)) playerMessage = `${word.label} was already found.`;
  else if (word) {
    await store.update(puzzle, (current) => { current.foundWordIds.push(word.id); }, activeSessionId ?? puzzle.id);
    playerMessage = isTarget
      ? `${word.label} scores ${word.score} point${word.score === 1 ? "" : "s"}.`
      : `${word.label} is a bonus word worth ${word.score} point${word.score === 1 ? "" : "s"}.`;
    void cloud.upload();
  } else if (wordGridPath.length < puzzle.minimumLength) playerMessage = `Words need at least ${puzzle.minimumLength} letters.`;
  else playerMessage = `${label || (puzzle.wordGridMode === "shuffle" ? "That word" : "That path")} is not in this ${puzzle.wordGridMode === "shuffle" ? "tray" : "grid"}'s accepted word list.`;
  wordGridPath = [];
  render();
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
  app.querySelectorAll<HTMLElement>("[data-nav]").forEach((element) => element.addEventListener("click", () => {
    let next = element.dataset.nav as View;
    if (next === "settings") {
      if (view === "settings") next = viewBeforeSettings;
      else { viewBeforeSettings = view; next = "settings"; }
    }
    view = next;
    if (view !== "player" && view !== "settings") { activePuzzle = null; activeSessionId = null; }
    message = "";
    render();
  }));
  app.querySelectorAll<HTMLElement>("[data-open]").forEach((element) => element.addEventListener("click", () => {
    const cadence = element.dataset.challenge as ChallengeCadence | undefined;
    const challenge = cadence ? { cadence, periodKey: element.dataset.period!, difficulty: element.dataset.difficulty as Difficulty } : undefined;
    void openPuzzle(element.dataset.open!, element.dataset.session ?? element.dataset.open!, challenge);
  }));
  app.querySelectorAll<HTMLElement>("[data-filter]").forEach((element) => element.addEventListener("click", () => { libraryType = element.dataset.filter as PuzzleKind; view = "library"; render(); }));
  app.querySelectorAll<HTMLElement>("[data-library-filter]").forEach((element) => element.addEventListener("click", () => { libraryType = element.dataset.libraryFilter as "all" | PuzzleKind; render(); }));
  app.querySelectorAll<HTMLElement>("[data-difficulty-filter]").forEach((element) => element.addEventListener("click", () => { libraryDifficulty = element.dataset.difficultyFilter as "all" | Difficulty; render(); }));
  app.querySelectorAll<HTMLElement>("[data-reset]").forEach((element) => element.addEventListener("click", async () => {
    const puzzle = activePuzzle;
    if (!puzzle || puzzle.id !== element.dataset.reset || !confirm("Start this puzzle over?")) return;
    await store.reset(puzzle, activeSessionId ?? puzzle.id);
    selectionStart = null;
    wordGridPath = [];
    playerMessage = "";
    render();
    void cloud.upload();
  }));
  app.querySelector<HTMLElement>("[data-retry-catalogue]")?.addEventListener("click", () => void reloadCatalogue());
  app.querySelector<HTMLButtonElement>("[data-hint]")?.addEventListener("click", async () => {
    if (!activePuzzle) return;
    const progress = sessionProgress();
    if (!progress) return;
    if (activePuzzle.kind === "word-search") {
      const hint = chooseWordSearchHint(activePuzzle, progress);
      if (!hint) {
        playerMessage = "No unused hints remain for this puzzle.";
      } else {
        await store.update(activePuzzle, (current) => { current.hintedCells.push(hint.cellIndex); }, activeSessionId ?? activePuzzle.id);
        playerMessage = `A remaining word passes through the highlighted cell at row ${hint.row + 1}, column ${hint.column + 1}.`;
      }
    } else if (activePuzzle.kind === "crossword") {
      const activeClue = activePuzzle.clues.find((clue) => clueKey(clue.number, clue.direction) === selectedClue);
      const hint = chooseCrosswordHint(activePuzzle, progress, activeClue);
      if (!hint) {
        playerMessage = "No unused letters remain to reveal.";
      } else {
        await store.update(activePuzzle, (current) => {
          current.entries[hint.cellIndex] = hint.letter;
          current.hintedCells.push(hint.cellIndex);
        }, activeSessionId ?? activePuzzle.id);
        playerMessage = `Revealed ${hint.letter} at row ${hint.row + 1}, column ${hint.column + 1}.`;
      }
    } else {
      const puzzle = activePuzzle;
      const hint = chooseWordGridHint(puzzle, progress);
      if (!hint) playerMessage = "Every remaining round word is already fully revealed by hints.";
      else {
        await store.update(puzzle, (current) => { recordWordGridHint(puzzle, current, hint); }, activeSessionId ?? puzzle.id);
        playerMessage = `Revealed ${hint.letter} as letter ${hint.revealedCount} of ${hint.wordLength} in a round word worth ${hint.points} point${hint.points === 1 ? "" : "s"}.`;
      }
    }
    render();
    void cloud.upload();
  });

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

  app.querySelectorAll<HTMLButtonElement>("[data-grid-cell]").forEach((cell) => {
    cell.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !activePuzzle || activePuzzle.kind !== "word-grid") return;
      wordGridDragging = true;
      const point = wordGridPoint(cell);
      if (!appendWordGridPoint(point)) wordGridPath = [point];
      wordGridDragStartLength = wordGridPath.length;
      cell.classList.add("selected");
      cell.setAttribute("aria-pressed", "true");
    });
    cell.addEventListener("pointerenter", () => {
      if (!wordGridDragging) return;
      if (appendWordGridPoint(wordGridPoint(cell))) {
        cell.classList.add("selected");
        cell.setAttribute("aria-pressed", "true");
      }
    });
    cell.addEventListener("pointerup", () => {
      if (!wordGridDragging) return;
      wordGridDragging = false;
      if (wordGridPath.length > wordGridDragStartLength && wordGridPath.length >= (activePuzzle?.kind === "word-grid" ? activePuzzle.minimumLength : 3)) void submitWordGrid();
      else render();
    });
    cell.addEventListener("keydown", (event) => {
      if (!activePuzzle || activePuzzle.kind !== "word-grid") return;
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        if (activePuzzle.wordGridMode === "shuffle") {
          const cells = [...app.querySelectorAll<HTMLButtonElement>("[data-grid-cell]")];
          const index = cells.indexOf(cell);
          const offset = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" ? -activePuzzle.columns : activePuzzle.columns;
          cells[index + offset]?.focus();
        } else {
          const point = wordGridPoint(cell);
          const x = point.x + (event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0);
          const y = point.y + (event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0);
          app.querySelector<HTMLButtonElement>(`[data-grid-cell="${x},${y}"]`)?.focus();
        }
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (appendWordGridPoint(wordGridPoint(cell))) render();
      }
    });
  });
  app.querySelector<HTMLElement>("[data-grid-submit]")?.addEventListener("click", () => void submitWordGrid());
  app.querySelector<HTMLElement>("[data-grid-clear]")?.addEventListener("click", () => { wordGridPath = []; playerMessage = ""; render(); });
  app.querySelector<HTMLElement>("[data-grid-shuffle]")?.addEventListener("click", () => {
    if (!activePuzzle || activePuzzle.kind !== "word-grid" || activePuzzle.wordGridMode !== "shuffle") return;
    const previous = wordGridTileOrder.map(({ x, y }) => `${x}:${y}`).join("|");
    for (let index = wordGridTileOrder.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [wordGridTileOrder[index], wordGridTileOrder[swap]] = [wordGridTileOrder[swap]!, wordGridTileOrder[index]!];
    }
    if (wordGridTileOrder.length > 1 && wordGridTileOrder.map(({ x, y }) => `${x}:${y}`).join("|") === previous) wordGridTileOrder.push(wordGridTileOrder.shift()!);
    wordGridPath = [];
    playerMessage = "Letters shuffled. Your score and found words are unchanged.";
    render();
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
      const puzzle = activePuzzle;
      const value = input.value.toUpperCase().replace(/[^A-Z]/g, "").slice(-1);
      input.value = value;
      const index = Number(input.dataset.crosswordCell);
      const progress = await store.update(puzzle, (current) => { current.entries[index] = value; }, activeSessionId ?? puzzle.id);
      const activeClue = puzzle.clues.find((clue) => clueKey(clue.number, clue.direction) === selectedClue);
      const next = value && activeClue
        ? nextEmptyCrosswordIndex(puzzle, activeClue, index, progress.entries)
        : nextCrosswordIndex(puzzle, index, "next");
      render();
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

  const savePreference = async (key: keyof Preferences, value: string | boolean) => {
    const preferences = { ...store.data.preferences };
    (preferences as unknown as Record<string, unknown>)[key] = value;
    await store.setPreferences(preferences);
    applyPreferences();
    const status = app.querySelector<HTMLElement>("[data-preferences-status]");
    if (status) status.textContent = "Saved on this device. Syncing when available.";
    void cloud.upload();
  };
  app.querySelectorAll<HTMLSelectElement>("[data-preference-select]").forEach((select) => select.addEventListener("change", () => void savePreference(select.dataset.preferenceSelect as keyof Preferences, select.value)));
  app.querySelectorAll<HTMLInputElement>("[data-preference-toggle]").forEach((toggle) => toggle.addEventListener("change", () => void savePreference(toggle.dataset.preferenceToggle as keyof Preferences, toggle.checked)));

  app.querySelector<HTMLFormElement>("#account-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const email = String(form.get("email") ?? ""), password = String(form.get("password") ?? "");
    try {
      await authReady;
      if (submitter?.value === "reset") await sendReset(email);
      else await signInAccount(email, password, submitter?.value === "create");
    } catch (error) { cloud.error = error instanceof Error ? error.message : "Account action failed."; render(); }
  });
  app.querySelector<HTMLElement>("[data-sign-out]")?.addEventListener("click", () => void signOutAccount());
  app.querySelector<HTMLElement>("[data-sync]")?.addEventListener("click", () => void cloud.upload());
  app.querySelector<HTMLElement>("[data-export-backup]")?.addEventListener("click", downloadBackup);
  app.querySelector<HTMLElement>("[data-reset-current]")?.addEventListener("click", async () => {
    if (!activePuzzle || !activeSessionId || !confirm("Reset the current puzzle session?")) return;
    await store.reset(activePuzzle, activeSessionId);
    selectionStart = null;
    playerMessage = "";
    settingsMessage = "Current puzzle reset.";
    settingsError = false;
    render();
    void cloud.upload();
  });
  app.querySelectorAll<HTMLElement>("[data-delete-progress]").forEach((element) => element.addEventListener("click", async () => {
    const sessionId = element.dataset.deleteProgress!;
    if (!confirm("Delete this saved session? This keeps the downloaded puzzle available offline.")) return;
    await store.removeProgress(sessionId);
    if (activeSessionId === sessionId) { activeSessionId = null; activePuzzle = null; view = "home"; }
    render();
    void cloud.upload();
  }));
  app.querySelectorAll<HTMLElement>("[data-clear-progress]").forEach((element) => element.addEventListener("click", async () => {
    const scope = element.dataset.clearProgress as "completed" | "all";
    if (!confirm(scope === "all" ? "Delete all saved puzzle progress on this device?" : "Delete every completed session on this device?")) return;
    const removed = await store.clearProgress(scope);
    activeSessionId = null; activePuzzle = null;
    settingsMessage = `${removed} saved session${removed === 1 ? "" : "s"} removed.`;
    settingsError = false;
    render();
    void cloud.upload();
  }));
  app.querySelector<HTMLElement>("[data-clear-cache]")?.addEventListener("click", async () => {
    if (!confirm("Remove every downloaded offline puzzle payload? Saved progress will remain.")) return;
    await store.clearPuzzleCache();
    cachedPuzzleIds = new Set();
    settingsMessage = "Offline puzzle payloads cleared. Saved progress was kept.";
    settingsError = false;
    render();
  });
  app.querySelector<HTMLFormElement>("#import-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = new FormData(event.currentTarget as HTMLFormElement).get("backup");
    if (!(file instanceof File) || !file.size) return;
    try {
      const imported = parseBackup(await file.text());
      const result = await store.importData(imported);
      settingsMessage = `Backup merged: ${result.added} session${result.added === 1 ? "" : "s"} added, ${result.skipped} existing session${result.skipped === 1 ? "" : "s"} kept.`;
      settingsError = false;
      applyPreferences();
      render();
    } catch (error) {
      settingsMessage = error instanceof Error ? error.message : "Could not restore this backup.";
      settingsError = true;
      render();
    }
  });

  app.querySelector<HTMLFormElement>("#wikidata-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const values = new FormData(form);
    const topic = String(values.get("topic") ?? "").trim();
    const kind = String(values.get("kind") ?? "") as PuzzleKind;
    const difficulty = String(values.get("difficulty") ?? "") as Exclude<Difficulty, "Unrated">;
    if (!navigator.onLine) {
      message = `<p class="error">Reconnect to request new public data. Puzzles already generated on this device remain playable offline.</p>`;
      render();
      return;
    }
    message = `<p role="status">Requesting public terms and building the puzzle…</p>`;
    render();
    try {
      const { generateWikidataPuzzle } = await import("./wikidata.ts");
      const puzzle = await generateWikidataPuzzle({ kind, topic, difficulty });
      registerLocalPuzzle(puzzle);
      cachedPuzzleIds = new Set(await store.cachePuzzle(puzzle));
      message = "";
      await openPuzzle(puzzle.id);
    } catch (error) {
      message = `<p class="error">${escapeHtml(error instanceof Error ? error.message : "Could not generate a puzzle from public data.")}</p>`;
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
  app.querySelector<HTMLFormElement>("#crossword-import-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = new FormData(event.currentTarget as HTMLFormElement).get("crossword");
    if (!(file instanceof File) || !file.size) return;
    try {
      const { importCrosswordFile } = await import("./external.ts");
      const puzzle = await importCrosswordFile(await file.arrayBuffer(), file.name);
      registerLocalPuzzle(puzzle);
      cachedPuzzleIds = new Set(await store.cachePuzzle(puzzle));
      await openPuzzle(puzzle.id);
    } catch (error) {
      message = `<p class="error">${escapeHtml(error instanceof Error ? error.message : "Could not import this crossword file.")}</p>`;
      render();
    }
  });
}

async function reloadCatalogue() {
  try {
    await loadCatalogue();
    catalogueError = "";
  } catch (error) {
    catalogueError = navigator.onLine
      ? `WTrack could not load the public catalogue. ${error instanceof Error ? error.message : "Please try again."}`
      : "This device has not cached the catalogue index yet. Reconnect and open WTrack once.";
  }
  render();
}

async function boot() {
  await store.load();
  cachedPuzzleIds = new Set(await store.cachedPuzzleIds());
  try {
    await loadCatalogue();
  } catch (error) {
    catalogueError = navigator.onLine
      ? `WTrack could not load the public catalogue. ${error instanceof Error ? error.message : "Please try again."}`
      : "This device has not cached the catalogue index yet. Reconnect and open WTrack once.";
  }
  for (const puzzle of await store.cachedPuzzles()) if (!puzzleById(puzzle.id)) registerLocalPuzzle(puzzle);
  applyPreferences();
  authReady = watchAuth((user) => void cloud.setUser(user));
  render();
  if ("serviceWorker" in navigator) void navigator.serviceWorker.register(new URL("./sw.js", document.baseURI));
  const token = ++renderToken;
  window.setInterval(async () => {
    if (token !== renderToken || view !== "player" || !activePuzzle) return;
    const progress = sessionProgress();
    if (!progress || progress.completedAt) return;
    progress.elapsedSeconds += 1;
    progress.updatedAt = Date.now();
    await store.save();
    const timer = app.querySelector<HTMLElement>(".timer");
    if (timer && store.data.preferences.showTimer) timer.textContent = formatTime(progress.elapsedSeconds);
  }, 1000);
}

addEventListener("online", render);
addEventListener("offline", render);
void boot();
