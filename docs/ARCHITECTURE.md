# Architecture

WTrack is a static Vite application. `src/main.ts` owns the small view router and accessible DOM rendering; `src/catalogue.ts` loads the discovery index, on-demand payloads, and private local imports; `src/puzzles.ts` validates full puzzle data and owns pure puzzle rules; `src/challenges.ts` owns deterministic UTC daily/ISO weekly selection and statistics; `src/hints.ts` chooses deterministic local hints through `pure-rand`; `src/store.ts` owns the versioned IndexedDB progress document, session tombstones, non-destructive backup merge, and ten-puzzle LRU cache; `src/cloud.ts` lazily loads Firebase and reconciles progress with the signed-in owner's Firestore path; and `src/external.ts` isolates third-party generator/parser adapters.

The public catalogue source is committed as JSON. `scripts/generate-catalogue.mjs` deterministically expands the original theme banks, while `scripts/check-catalogue.mjs` prevents malformed grids, missing clue paths, duplicate IDs, incomplete provenance, or an undersized difficulty tier from entering a build. `scripts/export-catalogue.mjs` turns that reviewed source into a metadata-only `catalogue/index.json` plus one `catalogue/puzzles/<id>.json` file per puzzle during development and production builds.

The application bundle does not import the full catalogue. Opening a puzzle checks IndexedDB first, otherwise fetches its same-origin static payload with HTTP caching disabled, validates it, and inserts it into the local LRU store. An eleventh payload evicts the least recently opened payload while progress remains in the separate application document. This makes future catalogue packs additive without increasing the core JavaScript bundle or the ten-puzzle offline ceiling.

## Data flow

1. A move mutates the in-memory progress record.
2. The complete application document is persisted to IndexedDB.
3. The UI renders the saved state immediately.
4. If signed in, synchronization uploads the current document to `users/{uid}/state/app`.
5. Firestore snapshots merge newer progress and settings back into the local document.

This order keeps latency and network availability outside the critical play path.

Ordinary play uses the puzzle ID as its session ID. Challenges use a period-scoped ID containing cadence, period, and difficulty, so a catalogue puzzle can have an ordinary attempt plus independent daily or weekly attempts. Deleted session IDs are retained as bounded tombstones so stale backups or cloud snapshots cannot silently restore them.

Hint history is part of each puzzle progress record. Word-search hints persist highlighted cells without changing found-word state. Crossword hints persist both the revealed answer letter and its hinted-cell marker. Older version-one progress records normalize to an empty hint history, so backups and Firestore documents remain backward compatible.

Preferences are normalized on load so older local backups and cloud documents receive current defaults. The renderer applies theme, text-size, and highlight choices as root `data-*` attributes, while visibility and assistance preferences determine which controls and feedback are rendered. Firestore rules accept both the legacy three-field preference object and the expanded validated schema so an app/rules rollout does not strand older service-worker clients.

Production uses Firebase Email/Password Authentication and one owner-protected Firestore document per account. Pull-request CI exercises the complete two-browser save-and-restore journey against the local Auth and Firestore emulators, in addition to testing the rules directly. Puzzle payloads for private imports are intentionally excluded from sync; only their progress record can travel to another device.

## Offline build

The Vite plugin emits a versioned `sw.js` containing the built asset list. Navigations beneath the configured base path fall back to the cached `index.html`. Static application assets and the metadata-only catalogue index are cache-first after installation. Full puzzle payloads are deliberately excluded from Cache Storage and controlled exclusively by the ten-item IndexedDB LRU.

## Remaining hardening passes

- split rendering into view modules without adding a UI framework;
- add deletion-tombstone compaction and deeper concurrent cloud-merge tests;
- add larger licensed, provenance-complete catalogue packs without increasing the offline payload cap;
- consider per-session cloud documents if catalogue scale makes the current bounded application document inefficient.
