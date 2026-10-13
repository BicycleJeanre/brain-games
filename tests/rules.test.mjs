import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { after, before } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";

let environment;
const validState = {
  version: 1,
  catalogueVersion: "2026.10.2",
  settingsUpdatedAt: 1,
  preferences: { theme: "system", showTimer: true, checkAsYouType: false },
  progress: {},
  deletedProgress: {},
  activePuzzleId: null,
};
before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-wtrack",
    firestore: { rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8") },
  });
});
after(async () => environment?.cleanup());

test("owners can write their app state and other users cannot read it", async () => {
  const owner = environment.authenticatedContext("owner").firestore();
  const other = environment.authenticatedContext("other").firestore();
  const anonymous = environment.unauthenticatedContext().firestore();
  const reference = owner.doc("users/owner/state/app");
  await assertSucceeds(reference.set(validState));
  await assertFails(other.doc("users/owner/state/app").get());
  await assertFails(anonymous.doc("users/owner/state/app").get());
  assert.equal((await reference.get()).data().version, 1);
  await assertSucceeds(reference.delete());
});

test("rules reject unknown state documents and schema versions", async () => {
  const owner = environment.authenticatedContext("owner").firestore();
  await assertFails(owner.doc("users/owner/state/other").set({ version: 1 }));
  await assertFails(owner.doc("users/owner/state/app").set({ ...validState, version: 2 }));
  await assertFails(owner.doc("users/owner/state/app").set({ ...validState, preferences: { ...validState.preferences, theme: "ultraviolet" } }));
  await assertFails(owner.doc("users/owner/state/app").set({ ...validState, unexpected: true }));
});
