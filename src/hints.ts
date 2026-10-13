import { uniformInt } from "pure-rand/distribution/uniformInt";
import { xoroshiro128plus } from "pure-rand/generator/xoroshiro128plus";
import type { CrosswordClue, CrosswordPuzzle, PuzzleProgress, WordSearchPuzzle } from "./types.ts";

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

export type PuzzleHint = WordSearchHint | CrosswordHint;

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
