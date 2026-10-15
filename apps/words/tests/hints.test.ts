import assert from "node:assert/strict";
import test from "node:test";
import { chooseCrosswordHint, chooseWordGridHint, chooseWordSearchHint, recordWordGridHint, wordGridHintCount } from "../src/hints.ts";
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

test("Word Grid hints progressively reveal letters in one verified target", () => {
  const puzzle = wordGrids[0]!;
  const progress = newProgress(puzzle, 42);
  const first = chooseWordGridHint(puzzle, progress);
  assert.ok(first);
  assert.equal(first.revealedCount, 1);
  const target = puzzle.words.find((word) => word.id === first.wordId);
  assert.ok(target);
  assert.ok(puzzle.roundWordIds.includes(target.id));
  assert.equal(first.letter, target.label[0]);

  recordWordGridHint(puzzle, progress, first);
  assert.equal(wordGridHintCount(puzzle, progress, target.id), 1);
  const second = chooseWordGridHint(puzzle, progress);
  assert.ok(second);
  assert.equal(second.wordId, target.id);
  assert.equal(second.revealedCount, 2);
  assert.equal(second.letter, target.label[1]);
  recordWordGridHint(puzzle, progress, second);
  assert.equal(wordGridHintCount(puzzle, progress, target.id), 2);
  progress.foundWordIds = [...puzzle.roundWordIds];
  assert.equal(chooseWordGridHint(puzzle, progress), null);
});

test("Word Grid letter hints migrate an earlier two-tile path hint", () => {
  const puzzle = wordGrids[0]!;
  const progress = newProgress(puzzle, 42);
  const target = [...puzzle.words]
    .filter((word) => puzzle.roundWordIds.includes(word.id))
    .sort((left, right) => right.score - left.score || right.label.length - left.label.length || left.label.localeCompare(right.label))[0]!;
  progress.hintedCells.push(...target.path.slice(0, 2).map(({ x, y }) => y * puzzle.columns + x));
  assert.equal(wordGridHintCount(puzzle, progress, target.id), 2);
  const hint = chooseWordGridHint(puzzle, progress);
  assert.ok(hint);
  assert.equal(hint.wordId, target.id);
  assert.equal(hint.revealedCount, 3);
  recordWordGridHint(puzzle, progress, hint);
  assert.equal(wordGridHintCount(puzzle, progress, target.id), 3);
  assert.ok(progress.hintedCells.every((token) => token >= puzzle.rows * puzzle.columns));
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
