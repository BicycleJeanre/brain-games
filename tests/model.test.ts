import assert from "node:assert/strict";
import test from "node:test";
import { crosswords, findWord, isPuzzleComplete, puzzles, wordPath, wordSearches } from "../src/puzzles.ts";

test("catalogue contains validated puzzles of both kinds", () => {
  assert.equal(puzzles.length, 100);
  assert.equal(wordSearches.length, 50);
  assert.equal(crosswords.length, 50);
  assert.deepEqual(new Set(puzzles.map((puzzle) => puzzle.difficulty)), new Set(["Easy", "Medium", "Hard", "Diabolical"]));
  assert.ok(puzzles.every((puzzle) => puzzle.source.licence && puzzle.source.note && puzzle.catalogueVersion));
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

test("completion checks every word-search word and crossword cell", () => {
  const wordSearch = wordSearches[0]!;
  assert.equal(isPuzzleComplete(wordSearch, wordSearch.words.map((word) => word.id), []), true);
  assert.equal(isPuzzleComplete(wordSearch, [], []), false);

  const crossword = crosswords[0]!;
  const entries = crossword.grid.flatMap((row) => [...row]).map((letter) => letter === "#" ? "" : letter);
  assert.equal(isPuzzleComplete(crossword, [], entries), true);
  entries[entries.findIndex(Boolean)] = "X";
  assert.equal(isPuzzleComplete(crossword, [], entries), false);
});
