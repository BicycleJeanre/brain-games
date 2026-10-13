# WTrack release status

Last updated: 2026-10-13

## Current lane

- Deployed application commit: `main` at `c54d1ad`
- Latest source pull requests: [#8 — Add expandable catalogue with ten-puzzle offline cache](https://github.com/BicycleJeanre/wtrack/pull/8) and [#9 — Keep WTrack startup non-blocking](https://github.com/BicycleJeanre/wtrack/pull/9)
- Active source candidate: `codex/strack-parity` (awaiting reviewed merge and deployment)
- Active production state: live and production-verified at the prior release

## Production deployment

- Route: [https://bicyclejeanre.github.io/wtrack/](https://bicyclejeanre.github.io/wtrack/)
- Owner/developer: Jeanre Van Wyk
- First deployed: 2026-10-13
- Source: `main` at `c54d1adb53a18bf2093337213022563063badfc3`
- Deployment: [GitHub Pages run 38384205022](https://github.com/BicycleJeanre/wtrack/actions/runs/38384205022)
- Verification: deployment workflow passed; the public route returned HTTP 200, the metadata-only catalogue exposed 100 entries, individual puzzle payloads loaded on demand, and a fresh browser moved from `0/10 offline` to `1/10 offline` after opening a puzzle.
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

- 100 published original puzzles: 50 word searches and 50 crosswords, exported as a metadata-only index plus individual on-demand payloads.
- Difficulty filters and distribution: 26 Easy, 26 Medium, 24 Hard, and 24 Diabolical.
- Deterministic catalogue generation plus integrity and provenance validation.
- IndexedDB retains no more than ten puzzle payloads by least-recently-opened order while progress remains stored independently.
- Emulator-backed browser journey that creates an account, saves puzzle progress to Firestore, signs in from a second browser, and restores that progress.
- GitHub Pages deployment now requires and injects the four public Firebase web identifiers.
- Production Firebase project: `wtrack-9d4c7` (activated 2026-10-13; independent Spark plan, `$0/month`, no billing account linked).
- Firestore: Standard default database in `nam5`, `freeTier: true`, deletion protection enabled; owner-only rules and indexes deployed.
- Authentication: Email/Password enabled; `bicyclejeanre.github.io` authorized; no phone provider or paid service enabled.
- Firebase Web app: `1:283171656458:web:d26cce81a969ee907e60f3`; all four public identifiers are present as GitHub Actions secrets.
- Persistent offline hint history is part of each local/cloud progress record and remains backward compatible with existing version-one data.
- Word-search hints mark a useful cell without finding the word; crossword hints reveal one unresolved active-clue letter.
- Hint selection uses bundled `pure-rand` 8.4.2 (MIT, zero dependencies) and makes no runtime network request.

## STrack parity release candidate

- Stable daily and weekly challenges across all four rated difficulty bands, with period-scoped sessions and completion, streak, and average-time statistics.
- Separate active and completed history, individual session deletion, bounded cloud tombstones, and scoped data controls.
- Non-destructive backup merge that keeps existing local sessions while adding missing ones.
- Private browser-local iPUZ, PUZ, JPZ, and XD import, with Unrated classification and no automatic publication or payload sync.
- Explicit Online/Offline status alongside the independent cloud-sync state.
- Tightened owner-only Firestore application-document schema and bounded progress/deletion maps.
- Desktop Chromium, WebKit, mobile Chromium, accessibility, landscape, base-path, ten-puzzle cache, and true server-stop offline coverage.
- Detailed comparison and intentional domain differences in `docs/STRACK_PARITY.md`.

## Validation

- `npm run test:unit`: 17 passing, including deterministic challenges, private import, non-destructive backup merge, bounded deletion tombstones, hints, and ten-puzzle least-recently-opened cache eviction.
- `npm run build`: passing.
- `npm run test:base-path`: passing for `/wtrack/`.
- `npm test`: 30 passing across desktop Chromium, WebKit, and mobile Chromium, with six intentional project-specific skips. Coverage includes accessibility, theme persistence, landscape layout, private import, challenge sessions, offline restart after 11 puzzle downloads, and a production build restart after its HTTP server stops.
- `npm run catalogue:check`: passing for 100 puzzles and all four difficulty tiers.
- `npm run test:rules`: passing in CI with Java 21; this workstation does not have a Java runtime.
- `npm run test:cloud`: configured for CI with Java 21; this workstation does not have a Java runtime.
- Full clean-runner workflow: [CI run 38371495785](https://github.com/BicycleJeanre/wtrack/actions/runs/38371495785) passed.
- Catalogue and Firestore release candidate: [CI run 38375200367](https://github.com/BicycleJeanre/wtrack/actions/runs/38375200367) passed, including the emulator-backed cloud journey.
- Final merged release head: [CI run 38377302555](https://github.com/BicycleJeanre/wtrack/actions/runs/38377302555) passed before merge.
- Production Pages release: [deployment run 38377922212](https://github.com/BicycleJeanre/wtrack/actions/runs/38377922212) passed from merge commit `4896167`.
- Hint release CI: [run 38379978842](https://github.com/BicycleJeanre/wtrack/actions/runs/38379978842) passed before merge.
- Hint production release: [deployment run 38380217540](https://github.com/BicycleJeanre/wtrack/actions/runs/38380217540) passed from merge commit `bfb0316`; live smoke verification confirmed both hint controls.
- Expandable-catalogue release CI: [run 38383136981](https://github.com/BicycleJeanre/wtrack/actions/runs/38383136981) passed before merge, including the two-device Firestore journey.
- Non-blocking-startup hotfix CI: [run 38383994345](https://github.com/BicycleJeanre/wtrack/actions/runs/38383994345) passed before merge.
- Current production release: [deployment run 38384205022](https://github.com/BicycleJeanre/wtrack/actions/runs/38384205022) passed from merge commit `c54d1ad`; endpoint and fresh-profile browser smoke tests passed.

## Next release-one work

1. Add licensed, provenance-complete puzzle packs through the expandable catalogue pipeline without increasing the ten-puzzle offline cap.
2. Add deeper concurrent cloud-merge and long-lived tombstone-compaction coverage.
3. Collect first-release feedback before expanding or retiring any production surface.
