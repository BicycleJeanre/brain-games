import assert from "node:assert/strict";
import test from "node:test";
import "fake-indexeddb/auto";
import { wordSearches } from "../src/puzzles.ts";
import { DEFAULT_PREFERENCES, newProgress, normalizeData, Store } from "../src/store.ts";

test("new progress has a cell entry for the whole grid", () => {
  const puzzle = wordSearches[0]!;
  const progress = newProgress(puzzle, 42);
  assert.equal(progress.entries.length, puzzle.rows * puzzle.columns);
  assert.equal(progress.startedAt, 42);
  assert.deepEqual(progress.foundWordIds, []);
});

test("normalization preserves safe preferences and defaults invalid values", () => {
  const data = normalizeData({ version: 99, preferences: { theme: "neon", showTimer: false }, progress: null });
  assert.equal(data.version, 1);
  assert.equal(data.preferences.theme, "system");
  assert.equal(data.preferences.showTimer, false);
  assert.equal(data.preferences.checkAsYouType, DEFAULT_PREFERENCES.checkAsYouType);
  assert.deepEqual(data.progress, {});
});

test("store persists found words in IndexedDB", async () => {
  const puzzle = wordSearches[0]!;
  const store = new Store();
  await store.load();
  await store.start(puzzle);
  await store.update(puzzle, (progress) => progress.foundWordIds.push(puzzle.words[0]!.id));

  const reloaded = new Store();
  await reloaded.load();
  assert.deepEqual(reloaded.data.progress[puzzle.id]?.foundWordIds, [puzzle.words[0]!.id]);
});
