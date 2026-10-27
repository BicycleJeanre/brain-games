import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { openDB } from "idb";
import { createGame } from "../src/game.ts";
import type { AnnotationColour, BoardSnapshot, Puzzle } from "../src/types.ts";

const puzzle: Puzzle = { id: "store-test", givens: "0".repeat(81), solution: "123456789".repeat(9), source: "Imported", sourceUrl: "", provenance: "test", licence: "test", seRating: null, ratingEngine: "Not rated", ratingVersion: "Not rated", difficulty: "Unrated", catalogueVersion: "test", fullHints: false };

test("player preference presets migrate missing values and reject invalid values", async () => {
  const { normalizePreferences } = await import("../src/store.ts");
  const preferences = normalizePreferences({ theme: "dark", noteStyle: "simple", showLines: false, noteSize: "huge", highlightColour: "green" });
  assert.equal(preferences.theme, "dark");
  assert.equal(preferences.noteStyle, "simple");
  assert.equal(preferences.showLines, false);
  assert.equal(preferences.noteSize, "medium");
  assert.equal(preferences.highlightColour, "green");
  assert.equal(preferences.showColours, true);
  assert.equal(preferences.showMistakes, false, "immediate mistake highlighting defaults off for existing profiles");
  assert.equal(preferences.mistakeLimit, true, "the three-mistake limit defaults on for existing profiles");
  assert.equal(normalizePreferences({ showMistakes: true }).showMistakes, true);
  assert.equal(normalizePreferences({ mistakeLimit: false }).mistakeLimit, false);
});

test("IndexedDB persists active progress and backup import preserves existing IDs", async () => {
  const { Store } = await import("../src/store.ts");
  const first = new Store();
  await first.load();
  const game = createGame(puzzle, 100);
  game.values[0] = "1";
  (game as unknown as { colours: string[] }).colours = ["cyan", ...Array(80).fill("")];
  delete (game as unknown as { lines?: unknown }).lines;
  await first.putGame(game);
  const second = new Store();
  await second.load();
  assert.equal(second.activeGame()?.values[0], "1");
  assert.deepEqual(second.activeGame()?.colours[0], ["cyan"], "legacy single colours migrate to colour arrays");
  assert.deepEqual(second.activeGame()?.lines, [], "legacy games gain an empty line collection");
  const result = await second.importJson(first.exportJson());
  assert.deepEqual(result, { added: 0, skipped: 1 });
  await second.clear("all");
  assert.equal(second.activeGame(), null);
});

test("Sudoku games use independent IndexedDB records", async () => {
  const { Store } = await import("../src/store.ts");
  const store = new Store();
  await store.clear("all");
  const first = createGame({ ...puzzle, id: "partition-first" }, 120);
  const second = createGame({ ...puzzle, id: "partition-second" }, 121);
  await store.putGame(first);
  await store.putGame(second);

  const database = await openDB("strack-v1", 1);
  const keys = await database.getAllKeys("state");
  assert.equal(keys.includes("app"), false, "the legacy monolithic record is removed");
  assert.equal(keys.includes("meta"), true);
  assert.equal(keys.includes(`game:${first.id}`), true);
  assert.equal(keys.includes(`game:${second.id}`), true);
  const untouched = structuredClone(await database.get("state", `game:${second.id}`));

  first.values[0] = "1";
  first.updatedAt = 122;
  await store.putGame(first);
  assert.deepEqual(await database.get("state", `game:${second.id}`), untouched, "saving one game does not rewrite another game");
  database.close();
  await store.clear("all");
});

test("legacy Sudoku state migrates without losing games", async () => {
  const { Store, emptyData } = await import("../src/store.ts");
  const game = createGame({ ...puzzle, id: "legacy-partition" }, 130);
  game.values[0] = "1";
  const legacy = { ...emptyData(), activeGameId: game.id, games: { [game.id]: game } };
  const database = await openDB("strack-v1", 1);
  await database.clear("state");
  await database.put("state", legacy, "app");
  database.close();

  const migrated = new Store();
  await migrated.load();
  assert.equal(migrated.activeGame()?.values[0], "1");
  const reopened = await openDB("strack-v1", 1);
  const keys = await reopened.getAllKeys("state");
  assert.equal(keys.includes("app"), false);
  assert.equal(keys.includes(`game:${game.id}`), true);
  reopened.close();
  await migrated.clear("all");
});

test("local UI saves stay off the cloud queue while durable changes retain retry state", async () => {
  const { Store } = await import("../src/store.ts");
  const store = new Store();
  await store.clear("all");
  let queuedGames = 0;
  store.onGameSaved = () => { queuedGames++; };
  const game = createGame(puzzle, 150);

  game.selected = [12];
  game.mode = "centre";
  await store.putGame(game, false, false);
  assert.equal(queuedGames, 0);
  assert.equal(game.cloudDirty, undefined);

  game.values[0] = "1";
  game.updatedAt = 160;
  await store.putGame(game, false, true);
  const savedAt = game.updatedAt;
  assert.equal(queuedGames, 1);
  assert.equal(game.cloudDirty, true, "an interrupted upload remains discoverable after restart");

  await store.markGameSynced(game.id, 4, savedAt);
  assert.equal(game.cloudRevision, 4);
  assert.equal(game.cloudDirty, false);
});

test("rapid cloud-bound saves keep a strict order and stale acknowledgements stay dirty", async () => {
  const { Store } = await import("../src/store.ts");
  const store = new Store();
  await store.load();
  const game = createGame(puzzle, 1);
  await store.putGame(game);
  const firstSavedAt = game.updatedAt;
  await store.putGame(game);
  assert.ok(game.updatedAt > firstSavedAt);
  await store.markGameSynced(game.id, 1, firstSavedAt);
  assert.equal(game.cloudDirty, true);
});

test("cloud merge keeps the newest puzzle and settings versions", async () => {
  const { Store } = await import("../src/store.ts");
  const store = new Store();
  await store.clear("all");
  const local = createGame(puzzle, 200);
  local.updatedAt = 300;
  local.values[0] = "1";
  await store.putGame(local);
  await store.markGameSynced(local.id, 1, local.updatedAt);
  const older = structuredClone(local); older.updatedAt = 250; older.values[0] = "2";
  assert.equal(await store.mergeCloudGame(older), false);
  assert.equal(store.data.games[local.id].values[0], "1");
  const newer = structuredClone(local); newer.cloudRevision = 2; newer.updatedAt = 350; newer.values[0] = "3";
  assert.equal(await store.mergeCloudGame(newer), true);
  assert.equal(store.data.games[local.id].values[0], "3");
  await store.markSettingsSynced(1, store.data.settingsUpdatedAt);
  const remotePreferences = { ...store.data.preferences, theme: "dark" as const };
  assert.equal(await store.mergeCloudSettings({ cloudRevision: 2, preferences: remotePreferences, activeGameId: local.id, trainingProgress: { "naked-single": { attempts: 3, correct: 3, completed: 3, mastered: true, lastPracticedAt: 123 } }, updatedAt: store.data.settingsUpdatedAt + 10 }), true);
  assert.equal(store.data.preferences.theme, "dark");
  assert.equal(store.data.trainingProgress["naked-single"]?.mastered, true);
});

test("deleted puzzles stay deleted when a stale cloud game arrives", async () => {
  const { Store } = await import("../src/store.ts");
  const store = new Store();
  await store.clear("all");
  const game = createGame(puzzle, 400);
  await store.putGame(game);
  await store.removeGame(game.id, 500);
  assert.equal(store.activeGame(), null);
  assert.equal(store.data.deletedGames[game.id], 500);

  const staleCloudCopy = structuredClone(game);
  staleCloudCopy.updatedAt = 600;
  assert.equal(await store.mergeCloudGame(staleCloudCopy), false);
  assert.equal(store.data.games[game.id], undefined);

  const otherDevice = new Store();
  await otherDevice.clear("all");
  await otherDevice.putGame(structuredClone(staleCloudCopy));
  assert.equal(await otherDevice.mergeCloudSettings({
    preferences: otherDevice.data.preferences,
    activeGameId: game.id,
    deletedGames: { [game.id]: 500 },
    updatedAt: 500,
  }), true);
  assert.equal(otherDevice.activeGame(), null);
  assert.equal(otherDevice.data.games[game.id], undefined);
});

test("cloud encoding preserves authoritative play state without local history payloads", async () => {
  const { decodeCloudGame, encodeCloudGame, encodeCloudSettings, MAX_SYNCED_GAME_BYTES } = await import("../src/cloud.ts");
  const { emptyData } = await import("../src/store.ts");
  const gameWithoutHints = createGame(puzzle, 699);
  const encodedWithoutHints = encodeCloudGame(gameWithoutHints);
  assert.equal("hintPath" in encodedWithoutHints, false, "absent hint paths are omitted instead of sent as undefined");
  const game = createGame(puzzle, 700);
  game.cloudRevision = 7;
  game.cloudDirty = true;
  game.selected = [4, 5];
  game.anchor = 5;
  game.mode = "centre";
  game.challenge = { cadence: "daily", periodKey: "2026-10-10" };
  game.mistakes = 4;
  game.failedAt = 703;
  game.paused = true;
  game.colours[0] = ["cyan", "amber", "indigo"];
  game.lines = [{ from: 0, to: 10, colour: "rose" }];
  game.hintPath = {
    engine: "HoDoKu TS test",
    generatedAt: 701,
    complete: true,
    hints: [{ id: "hodoku-test", technique: "Naked single", summary: "Test", explanation: "Test", kind: "place", evidence: [1], targets: [{ cell: 0, digit: 1 }] }],
  };
  const encoded = encodeCloudGame(game);
  assert.equal(encoded.cloudRevision, 7);
  assert.equal("selected" in encoded, false, "transient selection state is not uploaded");
  assert.equal("anchor" in encoded, false, "the local cursor is not uploaded");
  assert.equal("mode" in encoded, false, "the local input mode is not uploaded");
  assert.equal("cloudDirty" in encoded, false, "local queue metadata is not uploaded");
  assert.equal(encoded.colours[0], "cyan|amber|indigo");
  assert.deepEqual(encoded.lines, [{ from: 0, to: 10, colour: "rose" }]);
  assert.equal("hintPath" in encoded, false, "regenerable hint paths stay on the device");
  assert.deepEqual(encoded.history, [], "undo history stays on the device");
  assert.deepEqual(encoded.future, [], "redo history stays on the device");
  assert.deepEqual(encoded.hintHistory, [], "hint review history stays on the device");
  const decoded = decodeCloudGame(encoded);
  assert.deepEqual(decoded?.colours[0], ["cyan", "amber", "indigo"]);
  assert.deepEqual(decoded?.lines, [{ from: 0, to: 10, colour: "rose" }]);
  assert.deepEqual(decoded?.challenge, { cadence: "daily", periodKey: "2026-10-10" });
  assert.equal(decoded?.mistakes, 4, "the mistake count syncs with the puzzle session");
  assert.equal(decoded?.failedAt, 703, "the failed-at timestamp syncs across devices");
  assert.equal(decoded?.hintPath, undefined);
  assert.equal(decoded?.cloudRevision, 7);
  assert.deepEqual(decoded?.selected, []);
  assert.equal(decoded?.anchor, -1);
  assert.equal(decoded?.mode, "normal");
  const settingsData = emptyData();
  settingsData.settingsUpdatedAt = 702;
  const settings = encodeCloudSettings(settingsData);
  assert.deepEqual(settings.preferences, settingsData.preferences, "the rules test can use the exact expanded settings payload");
  assert.equal(settings.updatedAt, 702);

  const largeGame = createGame(puzzle, 703);
  const allColours: AnnotationColour[] = ["cyan", "amber", "violet", "green", "rose", "slate", "lime", "orange", "indigo"];
  const largeSnapshot: BoardSnapshot = {
    values: [...largeGame.values],
    corner: Array.from({ length: 81 }, () => [1, 2, 3, 4, 5, 6, 7, 8, 9]),
    centre: Array.from({ length: 81 }, () => [1, 2, 3, 4, 5, 6, 7, 8, 9]),
    colours: Array.from({ length: 81 }, () => [...allColours]),
    lines: Array.from({ length: 160 }, (_, index) => ({ from: index % 80, to: index % 80 + 1, colour: "cyan" as const })),
    eliminated: Array.from({ length: 81 }, () => [1, 2, 3, 4, 5, 6, 7, 8, 9]),
  };
  largeGame.history = Array.from({ length: 80 }, () => structuredClone(largeSnapshot));
  largeGame.completedAt = 704;
  largeGame.updatedAt = 704;
  const budgeted = encodeCloudGame(largeGame);
  assert.ok(new TextEncoder().encode(JSON.stringify(budgeted)).byteLength <= MAX_SYNCED_GAME_BYTES, "cloud games stay below the conservative Firestore document budget");
  assert.deepEqual(budgeted.history, [], "large local undo histories do not enter the cloud payload");
  const budgetedRoundTrip = decodeCloudGame(budgeted);
  assert.deepEqual(budgetedRoundTrip?.values, largeGame.values, "the current board survives cloud budgeting");
  assert.equal(budgetedRoundTrip?.completedAt, 704, "completion survives cloud budgeting");
});
