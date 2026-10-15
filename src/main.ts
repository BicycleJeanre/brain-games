import "./style.css";

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
    <section class="future-card">
      <span class="eyebrow">More games later</span><h2>Built to grow beyond puzzles</h2><p>Future entertainment modules can include speed-reading games, memory, attention and mental arithmetic. Scores describe play only and do not imply cognitive or health benefits.</p>
    </section>
  </main>
  <footer><span>Free software · AGPL-3.0-or-later</span><a href="https://github.com/BicycleJeanre/brain-games">Source code</a></footer>`;

if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register(`${base}sw.js`));
