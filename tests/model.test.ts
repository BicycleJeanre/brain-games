import assert from "node:assert/strict";
import test from "node:test";
import { crosswords, puzzles, wordGrids, wordSearches } from "./fixtures.ts";
import { findWord, isPuzzleComplete, isWordGridPath, nextEmptyCrosswordIndex, validatePuzzle, wordGridScore, wordGridWordForPath, wordPath } from "../src/puzzles.ts";

test("catalogue contains validated puzzles of all three kinds", () => {
  assert.equal(puzzles.length, 116);
  assert.equal(wordSearches.length, 50);
  assert.equal(crosswords.length, 50);
  assert.equal(wordGrids.length, 16);
  assert.deepEqual(new Set(puzzles.map((puzzle) => puzzle.difficulty)), new Set(["Easy", "Medium", "Hard", "Diabolical"]));
  assert.ok(puzzles.every((puzzle) => puzzle.source.licence && puzzle.source.note && puzzle.catalogueVersion));
  puzzles.forEach(validatePuzzle);
});

test("word paths support straight lines and reject bent selections", () => {
  assert.deepEqual(wordPath({ x: 1, y: 1 }, { x: 4, y: 4 }), [{ x: 1, y: 1 }, { x: 2, y: 2 }, { x: 3, y: 3 }, { x: 4, y: 4 }]);
  assert.deepEqual(wordPath({ x: 4, y: 1 }, { x: 1, y: 1 }), [{ x: 4, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }]);
  assert.deepEqual(wordPath({ x: 1, y: 1 }, { x: 3, y: 4 }), []);
});

test("word lookup accepts either selection direction", () => {
  const puzzle = wordSearches[0]!;
  const word = puzzle.words[0]!;
  assert.equal(findWord(puzzle, word.path)?.id, word.id);
  assert.equal(findWord(puzzle, [...word.path].reverse())?.id, word.id);
});

test("crossword typing skips filled cells within the active clue", () => {
  const puzzle = crosswords[0]!;
  const clue = puzzle.clues.find((candidate) => candidate.number === 1 && candidate.direction === "across")!;
  const entries = Array.from({ length: puzzle.rows * puzzle.columns }, () => "");
  entries[23] = "A";
  entries[25] = "H";
  assert.equal(nextEmptyCrosswordIndex(puzzle, clue, 22, entries), 24);
  entries[24] = "C";
  assert.equal(nextEmptyCrosswordIndex(puzzle, clue, 24, entries), 26);
  entries[26] = "E";
  assert.equal(nextEmptyCrosswordIndex(puzzle, clue, 24, entries), 26);
});

test("completion checks word-search words, crossword cells, and every Word Grid round target", () => {
  const wordSearch = wordSearches[0]!;
  assert.equal(isPuzzleComplete(wordSearch, wordSearch.words.map((word) => word.id), []), true);
  assert.equal(isPuzzleComplete(wordSearch, [], []), false);

  const crossword = crosswords[0]!;
  const entries = crossword.grid.flatMap((row) => [...row]).map((letter) => letter === "#" ? "" : letter);
  assert.equal(isPuzzleComplete(crossword, [], entries), true);
  entries[entries.findIndex(Boolean)] = "X";
  assert.equal(isPuzzleComplete(crossword, [], entries), false);

  const wordGrid = wordGrids[0]!;
  assert.equal(isPuzzleComplete(wordGrid, [], []), false);
  assert.equal(isPuzzleComplete(wordGrid, wordGrid.roundWordIds.slice(0, -1), []), false);
  assert.equal(isPuzzleComplete(wordGrid, wordGrid.roundWordIds, []), true);
  const nonTargetIds = wordGrid.words.filter((word) => !wordGrid.roundWordIds.includes(word.id)).map((word) => word.id);
  assert.equal(isPuzzleComplete(wordGrid, nonTargetIds, []), false);
});

test("Word Grid paths use adjacent unique tiles and classic length scoring", () => {
  const puzzle = wordGrids[0]!;
  const word = puzzle.words.find((candidate) => candidate.label.length >= 5)!;
  assert.equal(isWordGridPath(word.path), true);
  assert.equal(wordGridWordForPath(puzzle, word.path)?.id, word.id);
  assert.equal(isWordGridPath([...word.path, word.path[0]!]), false);
  assert.equal(wordGridScore(3), 1);
  assert.equal(wordGridScore(5), 2);
  assert.equal(wordGridScore(8), 11);
});
