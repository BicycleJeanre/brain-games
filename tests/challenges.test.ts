import assert from "node:assert/strict";
import test from "node:test";
import { challengePeriodKey, challengePuzzle, challengeSessionId, challengeSet, challengeStats } from "../src/challenges.ts";
import { puzzles } from "./fixtures.ts";
import { newProgress } from "../src/store.ts";

const now = new Date("2026-10-13T10:00:00Z");

test("daily and weekly challenges are stable across all difficulties", () => {
  assert.equal(challengePeriodKey("daily", now), "2026-10-13");
  assert.match(challengePeriodKey("weekly", now), /^2026-W\d{2}$/);
  assert.equal(challengeSet(puzzles, "daily", now).length, 4);
  assert.equal(challengePuzzle(puzzles, "Easy", "daily", now).id, challengePuzzle(puzzles, "Easy", "daily", now).id);
  assert.notEqual(challengePuzzle(puzzles, "Easy", "weekly", now).id, challengePuzzle(puzzles, "Easy", "daily", now).id);
});

test("challenge sessions and statistics remain independent from ordinary progress", () => {
  const puzzle = puzzles.find((item) => item.difficulty === "Easy")!;
  const daily = newProgress(puzzle, 1, { cadence: "daily", periodKey: "2026-10-13", difficulty: "Easy" });
  daily.completedAt = 2;
  daily.elapsedSeconds = 90;
  const regular = newProgress(puzzle, 1);
  regular.completedAt = 2;
  assert.match(challengeSessionId("daily", "Easy", now), /^challenge:daily:/);
  assert.deepEqual(challengeStats([daily, regular], "daily", now), { completed: 1, currentPeriodCompleted: 1, streak: 1, averageSeconds: 90 });
});
