import assert from "node:assert/strict";
import test from "node:test";
import { importCrosswordFile } from "../src/external.ts";

export const sampleIpuz = {
  version: "http://ipuz.org/v2",
  kind: ["http://ipuz.org/crossword#1"],
  dimensions: { width: 3, height: 3 },
  puzzle: [[1, 2, 3], [4, 0, 0], [5, 0, 0]],
  solution: [["C", "A", "T"], ["A", "R", "E"], ["R", "E", "D"]],
  clues: {
    Across: [[1, "Feline"], [4, "Exist"], [5, "Colour"]],
    Down: [[1, "Vehicle"], [2, "Exist"], [3, "Completed an action"]],
  },
};

test("crossword files become private unrated WTrack puzzles", async () => {
  const buffer = new TextEncoder().encode(JSON.stringify(sampleIpuz)).buffer;
  const puzzle = await importCrosswordFile(buffer, "sample.ipuz");
  assert.equal(puzzle.kind, "crossword");
  assert.equal(puzzle.difficulty, "Unrated");
  assert.equal(puzzle.catalogueVersion, "local-import-1");
  assert.deepEqual(puzzle.grid, ["CAT", "ARE", "RED"]);
  assert.equal(puzzle.clues.length, 6);
});
