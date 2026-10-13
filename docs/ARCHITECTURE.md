# Architecture

WTrack is a static Vite application. `src/main.ts` owns the small view router and accessible DOM rendering; `src/puzzles.ts` validates catalogue data and pure puzzle rules; `src/store.ts` owns the versioned IndexedDB document; `src/cloud.ts` lazily loads Firebase and reconciles that document with the signed-in owner's Firestore path; and `src/external.ts` isolates third-party generator/parser adapters.

The public catalogue is a committed JSON asset. `scripts/generate-catalogue.mjs` deterministically expands the original theme banks into the release catalogue, while `scripts/check-catalogue.mjs` prevents malformed grids, missing clue paths, duplicate IDs, incomplete provenance, or an undersized difficulty tier from entering a build.

## Data flow

1. A move mutates the in-memory progress record.
2. The complete application document is persisted to IndexedDB.
3. The UI renders the saved state immediately.
4. If signed in, synchronization uploads the current document to `users/{uid}/state/app`.
5. Firestore snapshots merge newer progress and settings back into the local document.

This order keeps latency and network availability outside the critical play path.

Production uses Firebase Email/Password Authentication and one owner-protected Firestore document per account. Pull-request CI exercises the complete two-browser save-and-restore journey against the local Auth and Firestore emulators, in addition to testing the rules directly.

## Offline build

The Vite plugin emits a versioned `sw.js` containing the built asset list. Navigations beneath the configured base path fall back to the cached `index.html`. Static assets and the bundled catalogue are cache-first after installation.

## Next hardening passes

- split rendering into view modules without adding a UI framework;
- add deletion-tombstone compaction and deeper concurrent cloud-merge tests;
- normalize all parser formats into the catalogue contract;
- add non-destructive backup/cloud conflict review;
- expand deterministic browser, offline, accessibility, and responsive coverage.
