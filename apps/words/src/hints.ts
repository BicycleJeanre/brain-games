import { uniformInt } from "pure-rand/distribution/uniformInt";
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";
import type { CrosswordClue, CrosswordPuzzle, PuzzleProgress, WordGridPuzzle, WordSearchPuzzle } from "./types.ts";

export interface WordSearchHint {
  kind: "word-search";
  cellIndex: number;
  row: number;
  column: number;
}

export interface CrosswordHint {
  kind: "crossword";
  cellIndex: number;
  letter: string;
  row: number;
  column: number;
}

export interface WordGridHint {
  kind: "word-grid";
  wordId: string;
  wordLength: number;
  points: number;
  revealedCount: number;
  letter: string;
  token: number;
}

export type PuzzleHint = WordSearchHint | CrosswordHint | WordGridHint;

function seedFor(value: string) {
  let hash = 0x811c9dc5;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash | 0;
}

export function chooseWordSearchHint(puzzle: WordSearchPuzzle, progress: PuzzleProgress): WordSearchHint | null {
  const hinted = new Set(progress.hintedCells);
  const unfinished = puzzle.words
    .filter((word) => !progress.foundWordIds.includes(word.id))
    .map((word) => ({ word, cells: word.path.filter(({ x, y }) => !hinted.has(y * puzzle.columns + x)) }))
    .filter(({ cells }) => cells.length > 0);
  if (!unfinished.length) return null;

  const rng = xoroshiro128plus(seedFor(`${puzzle.id}:word-search:${progress.hintedCells.length}`));
  const selected = unfinished[uniformInt(rng, 0, unfinished.length - 1)]!;
  const point = selected.cells[uniformInt(rng, 0, selected.cells.length - 1)]!;
  return {
    kind: "word-search",
    cellIndex: point.y * puzzle.columns + point.x,
    row: point.y,
    column: point.x,
  };
}

function clueCells(puzzle: CrosswordPuzzle, clue: CrosswordClue) {
  return [...clue.answer].map((letter, offset) => {
    const row = clue.row + (clue.direction === "down" ? offset : 0);
    const column = clue.column + (clue.direction === "across" ? offset : 0);
    return { cellIndex: row * puzzle.columns + column, letter, row, column };
  });
}

export function chooseCrosswordHint(puzzle: CrosswordPuzzle, progress: PuzzleProgress, activeClue?: CrosswordClue): CrosswordHint | null {
  const hinted = new Set(progress.hintedCells);
  const unresolved = (cells: ReturnType<typeof clueCells>) => cells.filter(({ cellIndex, letter }) =>
    !hinted.has(cellIndex) && progress.entries[cellIndex] !== letter,
  );
  let candidates = activeClue ? unresolved(clueCells(puzzle, activeClue)) : [];
  if (!candidates.length) {
    candidates = puzzle.grid.flatMap((row, y) => [...row].flatMap((letter, x) => {
      const cellIndex = y * puzzle.columns + x;
      return letter !== "#" && !hinted.has(cellIndex) && progress.entries[cellIndex] !== letter
        ? [{ cellIndex, letter, row: y, column: x }]
        : [];
    }));
  }
  if (!candidates.length) return null;

  const rng = xoroshiro128plus(seedFor(`${puzzle.id}:crossword:${progress.hintedCells.length}`));
  const selected = candidates[uniformInt(rng, 0, candidates.length - 1)]!;
  return { kind: "crossword", ...selected };
}

const WORD_GRID_HINT_STRIDE = 100;

export function wordGridHintCounts(puzzle: WordGridPuzzle, progress: PuzzleProgress) {
  const counts = new Map<string, number>();
  const gridSize = puzzle.rows * puzzle.columns;
  for (const token of progress.hintedCells) {
    if (token < gridSize) continue;
    const encoded = token - gridSize;
    const targetIndex = Math.floor(encoded / WORD_GRID_HINT_STRIDE);
    const revealedCount = encoded % WORD_GRID_HINT_STRIDE;
    const wordId = puzzle.roundWordIds[targetIndex];
    const word = wordId ? puzzle.words.find((candidate) => candidate.id === wordId) : undefined;
    if (word && revealedCount > 0 && revealedCount <= word.label.length) counts.set(wordId!, Math.max(counts.get(wordId!) ?? 0, revealedCount));
  }
  if (counts.size) return counts;

  // Migrate the earlier grid-cell hint format into the most likely target.
  const legacyCells = new Set(progress.hintedCells.filter((cell) => cell < gridSize));
  const targets = new Set(puzzle.roundWordIds);
  const legacy = puzzle.words
    .filter((word) => targets.has(word.id) && !progress.foundWordIds.includes(word.id))
    .map((word) => {
      const cells = word.path.map(({ x, y }) => y * puzzle.columns + x);
      let revealedCount = 0;
      while (revealedCount < cells.length && legacyCells.has(cells[revealedCount]!)) revealedCount += 1;
      return { word, revealedCount };
    })
    .filter(({ revealedCount }) => revealedCount >= 2)
    .sort((left, right) => right.revealedCount - left.revealedCount
      || right.word.score - left.word.score
      || right.word.label.length - left.word.label.length
      || left.word.label.localeCompare(right.word.label))[0];
  if (legacy) counts.set(legacy.word.id, legacy.revealedCount);
  return counts;
}

export function wordGridHintCount(puzzle: WordGridPuzzle, progress: PuzzleProgress, wordId: string) {
  return wordGridHintCounts(puzzle, progress).get(wordId) ?? 0;
}

export function recordWordGridHint(puzzle: WordGridPuzzle, progress: PuzzleProgress, hint: WordGridHint) {
  const gridSize = puzzle.rows * puzzle.columns;
  const targetIndex = puzzle.roundWordIds.indexOf(hint.wordId);
  progress.hintedCells = progress.hintedCells.filter((token) => {
    if (token < gridSize) return false;
    return Math.floor((token - gridSize) / WORD_GRID_HINT_STRIDE) !== targetIndex;
  });
  progress.hintedCells.push(hint.token);
}

export function chooseWordGridHint(puzzle: WordGridPuzzle, progress: PuzzleProgress): WordGridHint | null {
  const hinted = wordGridHintCounts(puzzle, progress);
  const targets = new Set(puzzle.roundWordIds);
  const candidates = puzzle.words
    .filter((word) => targets.has(word.id) && !progress.foundWordIds.includes(word.id))
    .map((word) => ({ word, revealedCount: hinted.get(word.id) ?? 0 }))
    .filter(({ word, revealedCount }) => revealedCount < word.label.length)
    .sort((left, right) => {
      const leftInProgress = left.revealedCount > 0 ? 1 : 0;
      const rightInProgress = right.revealedCount > 0 ? 1 : 0;
      return rightInProgress - leftInProgress
        || right.revealedCount - left.revealedCount
        || right.word.score - left.word.score
        || right.word.label.length - left.word.label.length
        || left.word.label.localeCompare(right.word.label);
    });
  const selected = candidates[0];
  if (!selected) return null;

  const revealedCount = selected.revealedCount + 1;
  const targetIndex = puzzle.roundWordIds.indexOf(selected.word.id);
  return {
    kind: "word-grid",
    wordId: selected.word.id,
    wordLength: selected.word.label.length,
    points: selected.word.score,
    revealedCount,
    letter: selected.word.label[revealedCount - 1]!,
    token: puzzle.rows * puzzle.columns + targetIndex * WORD_GRID_HINT_STRIDE + revealedCount,
  };
}
