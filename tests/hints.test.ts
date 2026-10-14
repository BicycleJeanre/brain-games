import assert from "node:assert/strict";
import test from "node:test";
import { chooseCrosswordHint, chooseWordGridHint, chooseWordSearchHint } from "../src/hints.ts";
import { crosswords, wordGrids, wordSearches } from "./fixtures.ts";
import { newProgress } from "../src/store.ts";

test("word-search hints identify unused cells on unfinished words", () => {
  const puzzle = wordSearches[0]!;
  const progress = newProgress(puzzle, 42);
  const first = chooseWordSearchHint(puzzle, progress);
  assert.ok(first);
  assert.ok(puzzle.words.some((word) => word.path.some(({ x, y }) => y * puzzle.columns + x === first.cellIndex)));

  progress.hintedCells.push(first.cellIndex);
  const second = chooseWordSearchHint(puzzle, progress);
  assert.ok(second);
  assert.notEqual(second.cellIndex, first.cellIndex);

  progress.foundWordIds = puzzle.words.map((word) => word.id);
  assert.equal(chooseWordSearchHint(puzzle, progress), null);
});

test("Word Grid hints progressively reveal one verified target path", () => {
  const puzzle = wordGrids[0]!;
  const progress = newProgress(puzzle, 42);
  const first = chooseWordGridHint(puzzle, progress);
  assert.ok(first);
  assert.equal(first.revealedCount, 2);
  assert.equal(first.cellIndexes.length, 2);
  const target = puzzle.words.find((word) => word.id === first.wordId);
  assert.ok(target);
  assert.ok(puzzle.roundWordIds.includes(target.id));
  assert.equal(first.pattern, [...target.label].map((letter, index) => index < 2 ? letter : "_").join(" "));

  progress.hintedCells.push(...first.cellIndexes);
  const second = chooseWordGridHint(puzzle, progress);
  assert.ok(second);
  assert.equal(second.wordId, target.id);
  assert.equal(second.revealedCount, 3);
  assert.deepEqual(second.cellIndexes.slice(0, 2), first.cellIndexes);
  assert.equal(second.cellIndexes[2], target.path[2]!.y * puzzle.columns + target.path[2]!.x);
  progress.foundWordIds = [...puzzle.roundWordIds];
  assert.equal(chooseWordGridHint(puzzle, progress), null);
});

test("crossword hints reveal an unused letter from the active clue", () => {
  const puzzle = crosswords[0]!;
  const progress = newProgress(puzzle, 42);
  const activeClue = puzzle.clues[0]!;
  const hint = chooseCrosswordHint(puzzle, progress, activeClue);
  assert.ok(hint);
  const activeIndexes = [...activeClue.answer].map((_, offset) =>
    (activeClue.row + (activeClue.direction === "down" ? offset : 0)) * puzzle.columns
    + activeClue.column + (activeClue.direction === "across" ? offset : 0),
  );
  assert.ok(activeIndexes.includes(hint.cellIndex));
  assert.equal(puzzle.grid[hint.row]![hint.column], hint.letter);
  assert.equal(progress.entries[hint.cellIndex], "");
});
