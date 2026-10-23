import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { deductionMatches, findTrainingPosition, patternCells, patternMatches, TRAINING_TECHNIQUES, trainingPracticeCount, trainingTechniqueForHint, validateTrainingPosition } from "../src/training.ts";
import type { Puzzle } from "../src/types.ts";

const catalogue = JSON.parse(readFileSync(new URL("../src/data/puzzles.json", import.meta.url), "utf8")) as Puzzle[];

test("every lesson is a valid HoDoKu library position", () => {
  for (const technique of TRAINING_TECHNIQUES) {
    const example = findTrainingPosition(technique.id, catalogue, "example");
    const practiceCount = trainingPracticeCount(technique.id);
    const practices = Array.from({ length: practiceCount }, (_, index) => findTrainingPosition(technique.id, catalogue, "practice", index));
    assert.ok(example, `${technique.title} needs a worked example`);
    assert.equal(practiceCount, 4, `${technique.title} needs four practice positions`);
    assert.ok(practices.every(Boolean), `${technique.title} needs every practice position`);
    const positions = [example, ...practices] as NonNullable<typeof example>[];
    assert.equal(new Set(positions.map((position) => position.values.join(""))).size, positions.length, `${technique.title} grids must all be visually distinct`);
    assert.equal(new Set(positions.map((position) => position.sourceUrl)).size, positions.length, `${technique.title} positions must have separate provenance links`);
    for (const position of positions) {
      assert.match(position.origin, /^HoDoKu (reglib-1\.3|exemplars-1\.0)/);
      assert.match(position.sourceUrl, /^https:\/\/github\.com\/wyzelli\/Hodoku2\/blob\/405a6843/);
      assert.equal(position.givens.length, 81);
      assert.equal(validateTrainingPosition(position), true, `${technique.title} must have complete evidence and targets`);
      assert.equal(patternMatches(patternCells(position), position), true);
      assert.equal(deductionMatches(position.hint.targets[0].cell, position.hint.targets[0].digit, position), true);
      const wrongDigit = Array.from({ length: 9 }, (_, index) => index + 1).find((digit) => !position.hint.targets.some((target) => target.cell === position.hint.targets[0].cell && target.digit === digit))!;
      assert.equal(deductionMatches(position.hint.targets[0].cell, wrongDigit, position), false);
    }
  }
});

test("hint names link to the matching training lesson", () => {
  assert.equal(trainingTechniqueForHint("Empty Rectangle")?.id, "empty-rectangle");
  assert.equal(trainingTechniqueForHint("Alternating Inference Chain")?.id, "aic");
  assert.equal(trainingTechniqueForHint("Nice Loop")?.id, "aic");
  assert.equal(trainingTechniqueForHint("Continuous Nice Loop")?.id, "aic");
  assert.equal(trainingTechniqueForHint("Discontinuous Nice Loop")?.id, "aic");
  assert.equal(trainingTechniqueForHint("Full house"), null);
});
