# WTrack release status

Last updated: 2026-10-13

## Current lane

- Production branch: `main` at `bfb0316`
- Latest source pull request: [#5 — Add persistent offline puzzle hints](https://github.com/BicycleJeanre/wtrack/pull/5)
- Active release state: live and production-verified

## Production deployment

- Route: [https://bicyclejeanre.github.io/wtrack/](https://bicyclejeanre.github.io/wtrack/)
- Owner/developer: Jeanre Van Wyk
- First deployed: 2026-10-13
- Source: `main` at `bfb03161bb3c4e849586444bbebf7e076ebb176b`
- Deployment: [GitHub Pages run 38380217540](https://github.com/BicycleJeanre/wtrack/actions/runs/38380217540)
- Verification: deployment workflow passed; the public route returned HTTP 200 and rendered the word-search **Give me a hint** and crossword **Reveal a letter** controls alongside the 100-puzzle catalogue and production account controls.
- Cloud smoke test: a disposable synthetic account passed Email/Password creation, owner-only Firestore write/read, unauthenticated denial, and full fixture cleanup.
- Current status: active
- Retirement decision: none

## Completed foundation

- Offline-first word-search and crossword players with four original demonstration puzzles.
- IndexedDB progress and preferences, optional owner-protected Firebase synchronization, and service-worker caching.
- Pointer-drag, endpoint, and keyboard word-search selection.
- Keyboard crossword entry and optional correctness feedback.
- JSON device backup and restore with format and data-version validation.
- Lazy Firebase loading so device-only startup does not download the cloud-sync implementation.
- Pull-request CI for unit, base-path, Firestore-rules, and browser checks.

## Catalogue, Firestore, and hints

- 100 bundled original puzzles: 50 word searches and 50 crosswords.
- Difficulty filters and distribution: 26 Easy, 26 Medium, 24 Hard, and 24 Diabolical.
- Deterministic catalogue generation plus integrity and provenance validation.
- Emulator-backed browser journey that creates an account, saves puzzle progress to Firestore, signs in from a second browser, and restores that progress.
- GitHub Pages deployment now requires and injects the four public Firebase web identifiers.
- Production Firebase project: `wtrack-9d4c7` (activated 2026-10-13; independent Spark plan, `$0/month`, no billing account linked).
- Firestore: Standard default database in `nam5`, `freeTier: true`, deletion protection enabled; owner-only rules and indexes deployed.
- Authentication: Email/Password enabled; `bicyclejeanre.github.io` authorized; no phone provider or paid service enabled.
- Firebase Web app: `1:283171656458:web:d26cce81a969ee907e60f3`; all four public identifiers are present as GitHub Actions secrets.
- Persistent offline hint history is part of each local/cloud progress record and remains backward compatible with existing version-one data.
- Word-search hints mark a useful cell without finding the word; crossword hints reveal one unresolved active-clue letter.
- Hint selection uses bundled `pure-rand` 8.4.2 (MIT, zero dependencies) and makes no runtime network request.

## Validation

- `npm run test:unit`: 12 passing, including deterministic word-search and crossword hint selection.
- `npm run build`: passing.
- `npm run test:base-path`: passing for `/wtrack/`.
- `npm test`: 13 passing across desktop and mobile Chromium, with one intentional desktop skip for a mobile-only assertion. The hint journey covers persistent word-search markers and crossword letter reveals.
- `npm run catalogue:check`: passing for 100 puzzles and all four difficulty tiers.
- `npm run test:rules`: passing in CI with Java 21; this workstation does not have a Java runtime.
- `npm run test:cloud`: configured for CI with Java 21; this workstation does not have a Java runtime.
- Full clean-runner workflow: [CI run 38371495785](https://github.com/BicycleJeanre/wtrack/actions/runs/38371495785) passed.
- Catalogue and Firestore release candidate: [CI run 38375200367](https://github.com/BicycleJeanre/wtrack/actions/runs/38375200367) passed, including the emulator-backed cloud journey.
- Final merged release head: [CI run 38377302555](https://github.com/BicycleJeanre/wtrack/actions/runs/38377302555) passed before merge.
- Production Pages release: [deployment run 38377922212](https://github.com/BicycleJeanre/wtrack/actions/runs/38377922212) passed from merge commit `4896167`.
- Hint release CI: [run 38379978842](https://github.com/BicycleJeanre/wtrack/actions/runs/38379978842) passed before merge.
- Hint production release: [deployment run 38380217540](https://github.com/BicycleJeanre/wtrack/actions/runs/38380217540) passed from merge commit `bfb0316`; live smoke verification confirmed both hint controls.

## Next release-one work

1. Add tombstone compaction and a non-destructive backup/cloud conflict flow.
2. Collect first-release feedback before expanding or retiring any production surface.
