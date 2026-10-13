# Architecture

WTrack is a static Vite application. `src/main.ts` owns the small view router and accessible DOM rendering; `src/catalogue.ts` loads the discovery index and on-demand puzzle payloads; `src/puzzles.ts` validates full puzzle data and owns pure puzzle rules; `src/hints.ts` chooses deterministic local hints through `pure-rand`; `src/store.ts` owns the versioned IndexedDB progress document and ten-puzzle LRU cache; `src/cloud.ts` lazily loads Firebase and reconciles progress with the signed-in owner's Firestore path; and `src/external.ts` isolates third-party generator/parser adapters.

The public catalogue source is committed as JSON. `scripts/generate-catalogue.mjs` deterministically expands the original theme banks, while `scripts/check-catalogue.mjs` prevents malformed grids, missing clue paths, duplicate IDs, incomplete provenance, or an undersized difficulty tier from entering a build. `scripts/export-catalogue.mjs` turns that reviewed source into a metadata-only `catalogue/index.json` plus one `catalogue/puzzles/<id>.json` file per puzzle during development and production builds.

The application bundle does not import the full catalogue. Opening a puzzle checks IndexedDB first, otherwise fetches its same-origin static payload with HTTP caching disabled, validates it, and inserts it into the local LRU store. An eleventh payload evicts the least recently opened payload while progress remains in the separate application document. This makes future catalogue packs additive without increasing the core JavaScript bundle or the ten-puzzle offline ceiling.

## Data flow

1. A move mutates the in-memory progress record.
2. The complete application document is persisted to IndexedDB.
3. The UI renders the saved state immediately.
4. If signed in, synchronization uploads the current document to `users/{uid}/state/app`.
5. Firestore snapshots merge newer progress and settings back into the local document.

This order keeps latency and network availability outside the critical play path.

Hint history is part of each puzzle progress record. Word-search hints persist highlighted cells without changing found-word state. Crossword hints persist both the revealed answer letter and its hinted-cell marker. Older version-one progress records normalize to an empty hint history, so backups and Firestore documents remain backward compatible.

Production uses Firebase Email/Password Authentication and one owner-protected Firestore document per account. Pull-request CI exercises the complete two-browser save-and-restore journey against the local Auth and Firestore emulators, in addition to testing the rules directly.

## Offline build

The Vite plugin emits a versioned `sw.js` containing the built asset list. Navigations beneath the configured base path fall back to the cached `index.html`. Static application assets and the metadata-only catalogue index are cache-first after installation. Full puzzle payloads are deliberately excluded from Cache Storage and controlled exclusively by the ten-item IndexedDB LRU.

## Next hardening passes

- split rendering into view modules without adding a UI framework;
- add deletion-tombstone compaction and deeper concurrent cloud-merge tests;
- normalize all parser formats into the catalogue contract;
- add non-destructive backup/cloud conflict review;
- expand deterministic browser, offline, accessibility, and responsive coverage.
