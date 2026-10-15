import assert from "node:assert/strict";
import test from "node:test";
import { mergeSudokuState, mergeWordsState, parseBackup } from "../src/storage.ts";

test("Sudoku migration is idempotent and keeps the newest session", () => {
  const current = { version: 1, settingsUpdatedAt: 20, preferences: { theme: "dark" }, games: { a: { id: "a", updatedAt: 20 } }, deletedGames: {} };
  const incoming = { version: 1, settingsUpdatedAt: 10, preferences: { theme: "light" }, games: { a: { id: "a", updatedAt: 10 }, b: { id: "b", updatedAt: 30 } }, deletedGames: {} };
  const first = mergeSudokuState(current, incoming);
  assert.equal(first.added, 1);
  assert.equal(first.updated, 0);
  assert.equal((first.data.games as Record<string, { updatedAt: number }>).a.updatedAt, 20);
  assert.equal((first.data.preferences as { theme: string }).theme, "dark");
  const second = mergeSudokuState(first.data, incoming);
  assert.equal(second.added, 0);
  assert.equal(second.updated, 0);
});

test("word migration respects deletion tombstones", () => {
  const current = { version: 1, settingsUpdatedAt: 1, preferences: {}, progress: {}, deletedProgress: { retired: 50 } };
  const incoming = { version: 1, settingsUpdatedAt: 2, preferences: { theme: "light" }, progress: { retired: { puzzleId: "retired", updatedAt: 40 }, active: { puzzleId: "active", updatedAt: 60 } }, deletedProgress: {} };
  const result = mergeWordsState(current, incoming);
  assert.deepEqual(Object.keys(result.data.progress as object), ["active"]);
  assert.equal(result.added, 1);
});

test("combined backup parser accepts both legacy formats", () => {
  assert.equal(parseBackup(JSON.stringify({ format: "strack-backup", data: { version: 1 } })).source, "strack-backup");
  assert.equal(parseBackup(JSON.stringify({ format: "wtrack-backup", data: { version: 1 } })).source, "wtrack-backup");
  const combined = parseBackup(JSON.stringify({ format: "brain-games-backup", version: 1, data: { sudoku: { version: 1 }, words: null } }));
  assert.equal(combined.source, "brain-games-backup");
  assert.throws(() => parseBackup("{}"), /not a Brain Games/);
});
