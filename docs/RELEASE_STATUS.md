# WTrack release status

Last updated: 2026-10-13

## Current lane

- Deployed application commit: `main` at `7b7fb8c`
- Latest source pull request: [#11 — Bring WTrack closer to STrack parity](https://github.com/BicycleJeanre/wtrack/pull/11)
- Active release state: settings-parity release candidate on `codex/strack-settings-parity`; current production remains verified

## Production deployment

- Route: [https://bicyclejeanre.github.io/wtrack/](https://bicyclejeanre.github.io/wtrack/)
- Owner/developer: Jeanre Van Wyk
- First deployed: 2026-10-13
- Source: `main` at `7b7fb8cb7711c9740f2877642beb9126fa853b6d`
- Deployment: [GitHub Pages run 38387390695](https://github.com/BicycleJeanre/wtrack/actions/runs/38387390695)
- Verification: deployment workflow passed. A cache-busted production browser reload showed the explicit Online state, active-session deletion, four daily and four weekly challenges, private crossword-file import, non-destructive backup merge, and separate completed-progress, all-progress, and offline-payload controls.
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

## STrack parity release

- Stable daily and weekly challenges across all four rated difficulty bands, with period-scoped sessions and completion, streak, and average-time statistics.
- Separate active and completed history, individual session deletion, bounded cloud tombstones, and scoped data controls.
- Non-destructive backup merge that keeps existing local sessions while adding missing ones.
- Private browser-local iPUZ, PUZ, JPZ, and XD import, with Unrated classification and no automatic publication or payload sync.
- Explicit Online/Offline status alongside the independent cloud-sync state.
- Tightened owner-only Firestore application-document schema and bounded progress/deletion maps.
- Desktop Chromium, WebKit, mobile Chromium, accessibility, landscape, base-path, ten-puzzle cache, and true server-stop offline coverage.
- Detailed comparison and intentional domain differences in `docs/STRACK_PARITY.md`.

## Settings-parity release candidate

- Auto-saving appearance, player-visibility, readability, assistance, backup, storage, and help settings aligned with STrack's relevant controls.
- Small, medium, and large grid, clue, and menu text presets plus cyan, amber, violet, and green board-highlight palettes.
- Settings preserves the active player and toggles back to its originating screen; a confirmed current-puzzle reset is available from that context.
- Older local, backup, and cloud preference objects normalize to current defaults. Firestore rules accept the legacy and expanded schemas during rollout.

## Validation

- `npm run test:unit`: 17 passing, including deterministic challenges, private import, non-destructive backup merge, bounded deletion tombstones, hints, and ten-puzzle least-recently-opened cache eviction.
- `npm run build`: passing.
- `npm run test:base-path`: passing for `/wtrack/`.
- `npm test`: 33 passing across desktop Chromium, WebKit, and mobile Chromium, with six intentional project-specific skips. Coverage includes auto-saving settings, contextual puzzle reset, accessibility, theme persistence, landscape layout, private import, challenge sessions, offline restart after 11 puzzle downloads, and a production build restart after its HTTP server stops.
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
- Previous production release: [deployment run 38384205022](https://github.com/BicycleJeanre/wtrack/actions/runs/38384205022) passed from merge commit `c54d1ad`; endpoint and fresh-profile browser smoke tests passed.
- STrack parity pull-request CI: [run 38386771834](https://github.com/BicycleJeanre/wtrack/actions/runs/38386771834) passed, including WebKit, Firestore rules, and the two-device sync journey.
- STrack parity merged-main CI: [run 38387042269](https://github.com/BicycleJeanre/wtrack/actions/runs/38387042269) passed from merge commit `7b7fb8c`.
- Current production release: [deployment run 38387390695](https://github.com/BicycleJeanre/wtrack/actions/runs/38387390695) passed from merge commit `7b7fb8c`; live browser verification confirmed the parity surfaces.

## Next release-one work

1. Add licensed, provenance-complete puzzle packs through the expandable catalogue pipeline without increasing the ten-puzzle offline cap.
2. Add deeper concurrent cloud-merge and long-lived tombstone-compaction coverage.
3. Collect first-release feedback before expanding or retiring any production surface.
