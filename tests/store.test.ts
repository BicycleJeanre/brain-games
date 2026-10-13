import assert from "node:assert/strict";
import test from "node:test";
import "fake-indexeddb/auto";
import { puzzles, wordSearches } from "./fixtures.ts";
import { DEFAULT_PREFERENCES, MAX_OFFLINE_PUZZLES, newProgress, normalizeData, Store } from "../src/store.ts";

test("new progress has a cell entry for the whole grid", () => {
  const puzzle = wordSearches[0]!;
  const progress = newProgress(puzzle, 42);
  assert.equal(progress.entries.length, puzzle.rows * puzzle.columns);
  assert.equal(progress.startedAt, 42);
  assert.deepEqual(progress.foundWordIds, []);
  assert.deepEqual(progress.hintedCells, []);
});

test("normalization preserves safe preferences and defaults invalid values", () => {
  const data = normalizeData({ version: 99, preferences: { theme: "neon", showTimer: false }, progress: null });
  assert.equal(data.version, 1);
  assert.equal(data.preferences.theme, "system");
  assert.equal(data.preferences.showTimer, false);
  assert.equal(data.preferences.checkAsYouType, DEFAULT_PREFERENCES.checkAsYouType);
  assert.deepEqual(data.progress, {});
});

test("normalization adds hint history to older progress records", () => {
  const puzzle = wordSearches[0]!;
  const progress = newProgress(puzzle, 42);
  const { hintedCells: _removed, ...legacyProgress } = progress;
  const data = normalizeData({ version: 1, preferences: DEFAULT_PREFERENCES, progress: { [puzzle.id]: legacyProgress } });
  assert.deepEqual(data.progress[puzzle.id]?.hintedCells, []);
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

test("puzzle cache keeps only the ten most recently opened payloads", async () => {
  const store = new Store();
  await store.load();
  for (let index = 0; index <= MAX_OFFLINE_PUZZLES; index += 1) await store.cachePuzzle(puzzles[index]!, index + 1);
  const ids = await store.cachedPuzzleIds();
  assert.equal(ids.length, MAX_OFFLINE_PUZZLES);
  assert.equal(ids.includes(puzzles[0]!.id), false);
  assert.equal(ids.includes(puzzles[MAX_OFFLINE_PUZZLES]!.id), true);
});
