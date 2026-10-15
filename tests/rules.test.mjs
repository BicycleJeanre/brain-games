import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after, before } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";

let environment;

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-brain-games",
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });
});

after(async () => environment?.cleanup());

test("each user owns both namespaced game stores", async () => {
  const owner = environment.authenticatedContext("owner").firestore();
  const other = environment.authenticatedContext("other").firestore();
  const guest = environment.unauthenticatedContext().firestore();
  const sudoku = owner.doc("users/owner/sudokuGames/game-1");
  const words = owner.doc("users/owner/wordState/app");
  await assertSucceeds(sudoku.set({ version: 1, id: "game-1", values: Array(81).fill(""), corner: Array(81).fill(""), centre: Array(81).fill(""), updatedAt: 1 }));
  await assertSucceeds(words.set({ version: 1, preferences: {}, progress: {}, deletedProgress: {}, settingsUpdatedAt: 1 }));
  await assertFails(other.doc("users/owner/sudokuGames/game-1").get());
  await assertFails(other.doc("users/owner/wordState/app").get());
  await assertFails(guest.doc("users/owner/wordState/app").set({ version: 1 }));
  assert.equal((await sudoku.get()).data().id, "game-1");
});

test("unknown paths and malformed payloads are rejected", async () => {
  const owner = environment.authenticatedContext("owner").firestore();
  await assertFails(owner.doc("users/owner/unknown/app").set({ version: 1 }));
  await assertFails(owner.doc("users/owner/sudokuGames/bad").set({ version: 1, id: "bad", values: [] }));
  await assertFails(owner.doc("users/owner/wordState/app").set({ version: 2, preferences: {}, progress: {}, deletedProgress: {}, settingsUpdatedAt: 1 }));
  await assertSucceeds(owner.doc("users/owner/sudokuMeta/settings").set({ version: 1, preferences: {}, deletedGames: {}, updatedAt: 1 }));
});
