import "./style.css";
import { createCombinedBackup, importBackup, importLegacyData, migrationPreview, type ImportResult } from "./storage.ts";

const base = import.meta.env.BASE_URL;

document.documentElement.dataset.theme = matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <header class="app-header">
    <a class="brand" href="${base}" aria-label="Brain Games home"><span aria-hidden="true">B</span><strong>Brain Games</strong></a>
    <p>Entertainment games for a quieter bit of focus.</p>
  </header>
  <main id="main">
    <section class="hero">
      <div><span class="eyebrow">Play at your own pace</span><h1>What would you like to play?</h1><p>Sudoku and word games now share one home. Your existing game data remains in place while the combined account and progress migration is completed.</p></div>
      <span class="status"><i aria-hidden="true"></i>${navigator.onLine ? "Ready online" : "Ready offline"}</span>
    </section>
    <section class="game-grid" aria-label="Game collections">
      <a class="game-card sudoku" href="${base}sudoku/">
        <span class="game-mark" aria-hidden="true">9</span>
        <span><small>Sudoku</small><strong>Logic, candidates, hints and training</strong><em>Open Sudoku →</em></span>
      </a>
      <a class="game-card words" href="${base}words/">
        <span class="game-mark" aria-hidden="true">A</span>
        <span><small>Word games</small><strong>Crosswords, searches, grids and letter mixes</strong><em>Open Word Games →</em></span>
      </a>
    </section>
    <section class="data-card" aria-labelledby="data-heading">
      <div><span class="eyebrow">Progress &amp; backups</span><h2 id="data-heading">Bring your existing play with you</h2><p>Brain Games can copy compatible STrack and WTrack progress already saved in this browser. You review the counts first; importing never deletes or changes either legacy database.</p></div>
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
const message = document.querySelector<HTMLElement>("[data-data-message]")!;
const importLegacyButton = document.querySelector<HTMLButtonElement>("[data-import-legacy]")!;

const resultMessage = (result: ImportResult) => {
  const changed = result.sudokuAdded + result.sudokuUpdated + result.wordsAdded + result.wordsUpdated;
  return changed
    ? `Imported ${result.sudokuAdded + result.sudokuUpdated} Sudoku session${result.sudokuAdded + result.sudokuUpdated === 1 ? "" : "s"} and ${result.wordsAdded + result.wordsUpdated} word-game session${result.wordsAdded + result.wordsUpdated === 1 ? "" : "s"}.`
    : "Everything in that source was already present. No sessions were duplicated.";
};

async function refreshMigrationSummary() {
  try {
    const preview = await migrationPreview();
    const legacyCount = preview.legacySudoku.games + preview.legacyWords.progress;
    importLegacyButton.disabled = legacyCount === 0;
    summary.innerHTML = `<span><strong>${preview.legacySudoku.games}</strong> STrack session${preview.legacySudoku.games === 1 ? "" : "s"} found</span><span><strong>${preview.legacyWords.progress}</strong> WTrack session${preview.legacyWords.progress === 1 ? "" : "s"} found</span><span><strong>${preview.combinedSudoku.games + preview.combinedWords.progress}</strong> already in Brain Games</span>`;
  } catch {
    summary.textContent = "Device progress could not be inspected. You can still restore a downloaded backup.";
  }
}

importLegacyButton.addEventListener("click", async () => {
  importLegacyButton.disabled = true;
  message.textContent = "Importing without changing the legacy applications…";
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
