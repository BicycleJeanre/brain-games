# WTrack release status

Last updated: 2026-10-13

## Current lane

- Branch: `codex/initial-app`
- Base: `main` at `6f2a21e`
- Pull request: [#1 — Bootstrap offline-first WTrack puzzle PWA](https://github.com/BicycleJeanre/wtrack/pull/1)
- Release state: foundation hardening; not yet deployed

## Completed foundation

- Offline-first word-search and crossword players with four original demonstration puzzles.
- IndexedDB progress and preferences, optional owner-protected Firebase synchronization, and service-worker caching.
- Pointer-drag, endpoint, and keyboard word-search selection.
- Keyboard crossword entry and optional correctness feedback.
- JSON device backup and restore with format and data-version validation.
- Lazy Firebase loading so device-only startup does not download the cloud-sync implementation.
- Pull-request CI for unit, base-path, Firestore-rules, and browser checks.

## Validation

- `npm run test:unit`: 9 passing.
- `npm run build`: passing.
- `npm run test:base-path`: passing for `/wtrack/`.
- `npm test`: 11 passing across desktop and mobile Chromium, with one intentional desktop skip for a mobile-only assertion.
- `npm run test:rules`: passing in CI with Java 21; this workstation does not have a Java runtime.
- Full clean-runner workflow: [CI run 38371495785](https://github.com/BicycleJeanre/wtrack/actions/runs/38371495785) passed.

## Next release-one work

1. Add transactional cloud-merge tests, tombstone compaction, and a non-destructive backup/cloud conflict flow.
2. Normalize supported crossword import formats into the catalogue contract.
3. Expand offline restart, accessibility, touch, and responsive browser coverage.
4. Grow the reviewed catalogue beyond the four schema-demonstration puzzles.
5. Merge PR #1 after review, configure GitHub Pages, and perform the first manual deployment.
