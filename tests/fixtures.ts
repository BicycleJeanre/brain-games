import rawPuzzles from "../src/data/puzzles.json" with { type: "json" };
import type { CrosswordPuzzle, Puzzle, WordSearchPuzzle } from "../src/types.ts";

export const puzzles = rawPuzzles as Puzzle[];
export const wordSearches = puzzles.filter((puzzle): puzzle is WordSearchPuzzle => puzzle.kind === "word-search");
export const crosswords = puzzles.filter((puzzle): puzzle is CrosswordPuzzle => puzzle.kind === "crossword");
