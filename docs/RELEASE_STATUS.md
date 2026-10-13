# WTrack release status

Last updated: 2026-10-13

## Current lane

- Production branch: `main` at `19dc61f`
- Active release branch: `codex/catalogue-firestore`
- Active pull request: [#3 — Expand public catalogue and complete Firestore release path](https://github.com/BicycleJeanre/wtrack/pull/3)
- Active release state: implementation and CI complete; cloud provisioning pending

## Production deployment

- Route: [https://bicyclejeanre.github.io/wtrack/](https://bicyclejeanre.github.io/wtrack/)
- Owner/developer: Jeanre Van Wyk
- First deployed: 2026-10-13
- Source: `main` at `629ecb5207b99a39e8852d3420f73422f2e01867`
- Deployment: [GitHub Pages run 38372457404](https://github.com/BicycleJeanre/wtrack/actions/runs/38372457404)
- Verification: deployment workflow passed; public route returned HTTP 200 and rendered the WTrack home screen with four offline puzzles.
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

## Catalogue and Firestore release candidate

- 100 bundled original puzzles: 50 word searches and 50 crosswords.
- Difficulty filters and distribution: 26 Easy, 26 Medium, 24 Hard, and 24 Diabolical.
- Deterministic catalogue generation plus integrity and provenance validation.
- Emulator-backed browser journey that creates an account, saves puzzle progress to Firestore, signs in from a second browser, and restores that progress.
- GitHub Pages deployment now requires and injects the four public Firebase web identifiers.
- Production Firebase activation is pending explicit approval to create the independent `wtrack-9d4c7` project on the no-cost Spark plan, with no Bicycle association or billing account, then enable Authentication and Firestore, deploy rules, and add the public identifiers as repository secrets.

## Validation

- `npm run test:unit`: 9 passing.
- `npm run build`: passing.
- `npm run test:base-path`: passing for `/wtrack/`.
- `npm test`: 11 passing across desktop and mobile Chromium, with one intentional desktop skip for a mobile-only assertion.
- `npm run catalogue:check`: passing for 100 puzzles and all four difficulty tiers.
- `npm run test:rules`: passing in CI with Java 21; this workstation does not have a Java runtime.
- `npm run test:cloud`: configured for CI with Java 21; this workstation does not have a Java runtime.
- Full clean-runner workflow: [CI run 38371495785](https://github.com/BicycleJeanre/wtrack/actions/runs/38371495785) passed.
- Catalogue and Firestore release candidate: [CI run 38375200367](https://github.com/BicycleJeanre/wtrack/actions/runs/38375200367) passed, including the emulator-backed cloud journey.

## Next release-one work

1. Provision the independent Spark-plan Firebase project after explicit owner approval, verify that billing is not linked, and add its public web configuration to GitHub Actions.
2. Open and validate the release pull request, then merge and deploy GitHub Pages.
3. Verify production account creation and cross-browser progress restoration.
4. Add tombstone compaction and a non-destructive backup/cloud conflict flow.
5. Collect first-release feedback before expanding or retiring any production surface.
