import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deductionMatches, findTrainingPosition, patternCells, patternMatches, TRAINING_TECHNIQUES, validateTrainingPosition } from "../src/training.ts";
import type { Puzzle } from "../src/types.ts";

const catalogue = JSON.parse(readFileSync(new URL("../src/data/puzzles.json", import.meta.url), "utf8")) as Puzzle[];

test("every lesson is a valid HoDoKu library position", () => {
  for (const technique of TRAINING_TECHNIQUES) {
    const position = findTrainingPosition(technique.id, catalogue);
    assert.ok(position, `${technique.title} needs a practice position`);
    assert.match(position.origin, /^HoDoKu (reglib-1\.3|exemplars-1\.0)/);
    assert.match(position.sourceUrl, /^https:\/\/github\.com\/wyzelli\/Hodoku2\/blob\/405a6843/);
    assert.equal(position.givens.length, 81);
    assert.equal(validateTrainingPosition(position), true, `${technique.title} must have complete evidence and targets`);
    assert.equal(patternMatches(patternCells(position), position), true);
    assert.equal(deductionMatches(position.hint.targets[0].cell, position.hint.targets[0].digit, position), true);
    const wrongDigit = Array.from({ length: 9 }, (_, index) => index + 1).find((digit) => !position.hint.targets.some((target) => target.cell === position.hint.targets[0].cell && target.digit === digit))!;
    assert.equal(deductionMatches(position.hint.targets[0].cell, wrongDigit, position), false);
  }
});
