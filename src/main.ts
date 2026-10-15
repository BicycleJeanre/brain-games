import "./style.css";
import { createCombinedBackup, importBackup, importLegacyData, migrationPreview, type ImportResult } from "./storage.ts";

const base = import.meta.env.BASE_URL;

document.documentElement.dataset.theme = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <header class="app-header">
    <a class="brand" href="${base}" aria-label="Brain Games home"><span aria-hidden="true">B</span><strong>Brain Games</strong></a>
    <nav aria-label="Brain Games"><a href="#play">Play</a><a href="#progress">Progress</a><a href="#data">Data</a></nav>
  </header>
  <main id="main">
    <section class="hero">
      <div><span class="eyebrow">One place to play</span><h1>Pick up a game or start something new.</h1><p>Sudoku, word games, saved progress, backups and cross-device play now belong to one Brain Games experience.</p></div>
      <span class="status"><i aria-hidden="true"></i>${navigator.onLine ? "Ready online" : "Ready offline"}</span>
    </section>
    <section class="progress-card" id="progress" aria-labelledby="progress-heading">
      <div class="section-heading"><div><span class="eyebrow">Across all games</span><h2 id="progress-heading">Your progress</h2></div><span class="progress-total" data-progress-total>Loading…</span></div>
      <div class="progress-grid" data-progress-grid aria-live="polite"></div>
    </section>
    <section class="game-grid" id="play" aria-label="Game collections">
      <a class="game-card sudoku" href="${base}sudoku/">
        <span class="game-mark" aria-hidden="true">9</span>
        <span><small>Sudoku</small><strong>Logic, candidates, hints and training</strong><em>Open Sudoku →</em></span>
      </a>
      <a class="game-card words" href="${base}words/">
        <span class="game-mark" aria-hidden="true">A</span>
        <span><small>Word games</small><strong>Crosswords, searches, grids and letter mixes</strong><em>Open Word Games →</em></span>
      </a>
    </section>
    <section class="data-card" id="data" aria-labelledby="data-heading">
      <div><span class="eyebrow">Data &amp; backups</span><h2 id="data-heading">Bring previous progress with you</h2><p>Brain Games can copy compatible Sudoku and word-game progress saved by earlier versions in this browser. You review the counts first; importing leaves the original data untouched.</p></div>
      <div class="migration-summary" data-migration-summary role="status">Checking this device…</div>
      <div class="data-actions">
        <button class="primary" type="button" data-import-legacy disabled>Import existing progress</button>
        <button class="secondary" type="button" data-export>Download combined backup</button>
        <label class="file-action">Restore a backup<input type="file" accept="application/json,.json" data-import-file /></label>
      </div>
      <p class="data-message" data-data-message aria-live="polite"></p>
    </section>
    <section class="future-card">
      <span class="eyebrow">More games later</span><h2>Built to grow beyond puzzles</h2><p>Future entertainment modules can include speed-reading games, memory, attention and mental arithmetic. Scores describe play only and do not imply cognitive or health benefits.</p>
    </section>
  </main>
  <footer><span>Free software · AGPL-3.0-or-later</span><a href="https://github.com/BicycleJeanre/brain-games">Source code</a></footer>`;

const summary = document.querySelector<HTMLElement>("[data-migration-summary]")!;
const progressGrid = document.querySelector<HTMLElement>("[data-progress-grid]")!;
const progressTotal = document.querySelector<HTMLElement>("[data-progress-total]")!;
const message = document.querySelector<HTMLElement>("[data-data-message]")!;
const importLegacyButton = document.querySelector<HTMLButtonElement>("[data-import-legacy]")!;

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

async function refreshMigrationSummary() {
  try {
    const preview = await migrationPreview();
    const legacyCount = preview.legacySudoku.games + preview.legacyWords.progress;
    const active = preview.combinedSudoku.active + preview.combinedWords.active;
    const completed = preview.combinedSudoku.completed + preview.combinedWords.completed;
    importLegacyButton.disabled = legacyCount === 0;
    summary.innerHTML = `<span><strong>${preview.legacySudoku.games}</strong> previous Sudoku session${preview.legacySudoku.games === 1 ? "" : "s"}</span><span><strong>${preview.legacyWords.progress}</strong> previous word-game session${preview.legacyWords.progress === 1 ? "" : "s"}</span><span><strong>${preview.combinedSudoku.games + preview.combinedWords.progress}</strong> already in Brain Games</span>`;
    progressTotal.textContent = `${active} active · ${completed} completed`;
    progressGrid.innerHTML = `
      <article><span class="game-mark" aria-hidden="true">9</span><div><h3>Sudoku</h3><p><strong>${preview.combinedSudoku.active}</strong> active · <strong>${preview.combinedSudoku.completed}</strong> completed</p><small>${formatTime(preview.combinedSudoku.averageSeconds)}</small></div><a href="${base}sudoku/">${preview.combinedSudoku.active ? "Continue" : "Play"} Sudoku →</a></article>
      <article class="words"><span class="game-mark" aria-hidden="true">A</span><div><h3>Word games</h3><p><strong>${preview.combinedWords.active}</strong> active · <strong>${preview.combinedWords.completed}</strong> completed</p><small>${formatTime(preview.combinedWords.averageSeconds)}</small></div><a href="${base}words/">${preview.combinedWords.active ? "Continue" : "Play"} word games →</a></article>`;
  } catch {
    summary.textContent = "Device progress could not be inspected. You can still restore a downloaded backup.";
    progressTotal.textContent = "Unavailable";
    progressGrid.textContent = "Progress could not be loaded on this device.";
  }
}

importLegacyButton.addEventListener("click", async () => {
  importLegacyButton.disabled = true;
  message.textContent = "Importing without changing the earlier app data…";
  try {
    message.textContent = resultMessage(await importLegacyData());
    await refreshMigrationSummary();
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "The import could not be completed.";
  }
});

document.querySelector<HTMLButtonElement>("[data-export]")!.addEventListener("click", async () => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([await createCombinedBackup()], { type: "application/json" }));
  link.download = `brain-games-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  message.textContent = "Combined backup downloaded.";
});

document.querySelector<HTMLInputElement>("[data-import-file]")!.addEventListener("change", async (event) => {
  const input = event.currentTarget as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    message.textContent = resultMessage(await importBackup(await file.text()));
    await refreshMigrationSummary();
  } catch (error) {
    message.textContent = error instanceof Error ? error.message : "The backup could not be restored.";
  } finally {
    input.value = "";
  }
});

void refreshMigrationSummary();

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register(`${base}sw.js`));
