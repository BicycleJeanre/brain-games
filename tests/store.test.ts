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
  const deletedProgress = Object.fromEntries(Array.from({ length: 502 }, (_, index) => [`session-${index}`, index]));
  const data = normalizeData({ version: 99, preferences: { theme: "neon", showTimer: false }, progress: null, deletedProgress: { ...deletedProgress, invalid: "never" } });
  assert.equal(data.version, 1);
  assert.equal(data.preferences.theme, "system");
  assert.equal(data.preferences.showTimer, false);
  assert.equal(data.preferences.checkAsYouType, DEFAULT_PREFERENCES.checkAsYouType);
  assert.deepEqual(data.progress, {});
  assert.equal(Object.keys(data.deletedProgress).length, 500);
  assert.equal(data.deletedProgress.invalid, undefined);
  assert.equal(data.deletedProgress["session-501"], 501);
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

test("challenge sessions, deletion tombstones, and backup merges preserve independent progress", async () => {
  const puzzle = puzzles[0]!;
  const store = new Store();
  await store.load();
  const sessionId = "challenge:daily:2026-10-13:easy";
  await store.start(puzzle, sessionId, { cadence: "daily", periodKey: "2026-10-13", difficulty: "Easy" });
  await store.update(puzzle, (progress) => progress.foundWordIds.push("challenge-word"), sessionId);
  await store.start(puzzle);
  const regularWords = [...(store.data.progress[puzzle.id]?.foundWordIds ?? [])];
  assert.equal(regularWords.includes("challenge-word"), false);
  assert.deepEqual(store.data.progress[sessionId]?.foundWordIds, ["challenge-word"]);

  const imported = normalizeData({
    version: 1,
    preferences: { theme: "light", showTimer: false, checkAsYouType: true },
    progress: {
      [puzzle.id]: { ...newProgress(puzzle, 10), foundWordIds: ["should-not-replace"] },
      imported: newProgress(puzzles[1]!, 11),
    },
    deletedProgress: {},
  });
  assert.deepEqual(await store.importData(imported), { added: 1, skipped: 1 });
  assert.deepEqual(store.data.progress[puzzle.id]?.foundWordIds, regularWords);
  assert.equal(store.data.preferences.theme, "light");

  await store.removeProgress(sessionId, 100);
  assert.equal(store.data.progress[sessionId], undefined);
  assert.equal(store.data.deletedProgress[sessionId], 100);
});
