import assert from "node:assert/strict";
import test from "node:test";
import { createBackup, parseBackup } from "../src/backup.ts";
import { wordSearches } from "./fixtures.ts";
import { newProgress, normalizeData } from "../src/store.ts";

test("backup round-trip preserves progress and preferences", () => {
  const data = normalizeData({
    version: 1,
    preferences: { theme: "dark", showTimer: false, checkAsYouType: true },
    progress: { sample: newProgress(wordSearches[0]!, 42) },
    deletedProgress: {},
  });
  const restored = parseBackup(createBackup(data, new Date("2026-10-13T00:00:00Z")));
  assert.deepEqual(restored.preferences, data.preferences);
  assert.deepEqual(restored.progress, data.progress);
});

test("backup parser rejects unrelated and unsupported JSON", () => {
  assert.throws(() => parseBackup("not json"), /valid JSON/);
  assert.throws(() => parseBackup('{"format":"something-else"}'), /not a WTrack backup/);
  assert.throws(() => parseBackup('{"format":"wtrack-backup","data":{"version":2,"preferences":{},"progress":{}}}'), /unsupported/);
  assert.throws(() => parseBackup('{"format":"wtrack-backup","data":{"version":1,"preferences":{},"progress":{"bad":{}},"deletedProgress":{}}}'), /incomplete/);
});
