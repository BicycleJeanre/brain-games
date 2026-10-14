# WTrack release status

Last updated: 2026-10-14

## Current lane

- Deployed application commit: `main` at `3f8efe3`
- Latest source pull request: [#27 — Add progressive Word Grid path hints](https://github.com/BicycleJeanre/wtrack/pull/27)
- Active release state: live and production-verified

## Production deployment

- Route: [https://bicyclejeanre.github.io/wtrack/](https://bicyclejeanre.github.io/wtrack/)
- Owner/developer: Jeanre Van Wyk
- First deployed: 2026-10-13
- Source: `main` at `3f8efe3`
- Deployment: [GitHub Pages run 38544166216](https://github.com/BicycleJeanre/wtrack/actions/runs/38544166216)
- Verification: deployment workflow passed. A production reload confirmed Letter Lab II exposes the progressive path-hint control, retains all ten verified round targets, and preserves existing bonus-word and hint progress.
- Cloud smoke test: a disposable synthetic account passed Email/Password creation, owner-only Firestore write/read, unauthenticated denial, and full fixture cleanup.
- Current status: active
- Retirement decision: none

## Completed foundation

- Offline-first word-search, crossword, and Word Grid players.
- IndexedDB progress and preferences, optional owner-protected Firebase synchronization, and service-worker caching.
- Pointer-drag, endpoint, and keyboard word-search selection.
- Keyboard crossword entry and optional correctness feedback.
- JSON device backup and restore with format and data-version validation.
- Lazy Firebase loading so device-only startup does not download the cloud-sync implementation.
- Pull-request CI for unit, base-path, Firestore-rules, and browser checks.

## Catalogue, Firestore, and hints

- 116 published puzzles: 50 word searches, 50 crosswords, and 16 Word Grids, exported as a metadata-only index plus individual on-demand payloads.
- Difficulty filters and distribution: 30 Easy, 30 Medium, 28 Hard, and 28 Diabolical.
- Deterministic catalogue generation plus integrity and provenance validation.
- IndexedDB retains no more than ten puzzle payloads by least-recently-opened order while progress remains stored independently.
- Emulator-backed browser journey that creates an account, saves puzzle progress to Firestore, signs in from a second browser, and restores that progress.
- GitHub Pages deployment now requires and injects the four public Firebase web identifiers.
- Production Firebase project: `wtrack-9d4c7` (activated 2026-10-13; independent Spark plan, `$0/month`, no billing account linked).
- Firestore: Standard default database in `nam5`, `freeTier: true`, deletion protection enabled; owner-only rules and indexes deployed.
- Authentication: Email/Password enabled; `bicyclejeanre.github.io` authorized; no phone provider or paid service enabled.
- Firebase Web app: `1:283171656458:web:d26cce81a969ee907e60f3`; all four public identifiers are present as GitHub Actions secrets.
- Persistent offline hint history is part of each local/cloud progress record and remains backward compatible with existing version-one data.
- Word-search hints mark a useful cell without finding the word; crossword hints reveal one unresolved active-clue letter; Word Grid hints reveal two ordered target-path letters initially and then extend that same path one tile per use.

## Word Grid release candidate

- Original adjacent-letter game mode with 4×4 and 5×5 grids, non-repeating eight-direction paths, length-based scoring, and fixed verified target sets of 8 Easy, 10 Medium, 12 Hard, or 15 Diabolical words.
- Round answers remain hidden as length-matched slots until found, hints stay within the target set, and completion requires every listed target. Other dictionary-valid traces persist as one-time bonus words and add their normal length-based points without advancing target completion.
- Pointer-drag, touch-by-tile, and keyboard play; found-word history, timer, reset, offline hints, saved progress, challenges, backup, and optional Firestore state use the existing local-first model.
- Sixteen deterministic grids use build-only `an-array-of-english-words` 2.0.0 (MIT), quality-filtered with `subtlex-word-frequencies` 2.0.0 (ISC). Only compact pre-solved payloads ship.
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

## Settings-parity release

- Auto-saving appearance, player-visibility, readability, assistance, backup, storage, and help settings aligned with STrack's relevant controls.
- Small, medium, and large grid, clue, and menu text presets plus cyan, amber, violet, and green board-highlight palettes.
- Settings preserves the active player and toggles back to its originating screen; a confirmed current-puzzle reset is available from that context.
- Older local, backup, and cloud preference objects normalize to current defaults. Firestore rules accept the legacy and expanded schemas during rollout.
- Backward-compatible production Firestore rules were compiled and deployed before the Pages client, keeping older service-worker clients valid during rollout.

## Public-data generation release

- Explicit, user-triggered topic generation discovers related QIDs from an English Wikipedia page and fetches English labels and descriptions from Wikidata; startup and ordinary play make no Wikimedia requests.
- Word searches and crosswords are generated in the browser and saved as complete validated payloads in the existing ten-puzzle IndexedDB LRU for offline replay.
- Relative Easy, Medium, Hard, and Diabolical profiles vary answer length/count, grid size, word directions, and reversal probability without claiming a universal rating.
- Every generated puzzle records its source page, selected QIDs, retrieval timestamp, licences, WTrack generator version, layout-library version, selection seed, and unreviewed private status.
- Generated puzzles do not enter daily/weekly challenge selection, the curated public catalogue, or Firestore payload sync. If evicted, the player must generate them again; saved progress remains separate.
- Both players now expose collapsible source and generation details for catalogue, imported, and generated puzzles.

## Validation

- `npm run test:unit`: 26 passing, including all-catalogue Word Grid target-path verification, progressive hints, clue-aware crossword navigation, fixed-target completion, stale-completion migration, deterministic challenges, private import, backup merge, cache eviction, and Wikimedia generation.
- `npm run build`: passing.
- `npm run test:base-path`: passing for `/wtrack/`.
- `npm test`: 39 passing across desktop Chromium, WebKit, and mobile Chromium, with six intentional project-specific skips. Coverage includes Word Grid scoring and hint persistence, auto-saving settings, accessibility, private import, public-data generation, challenge isolation, cache bounds, and offline restart.
- `npm run catalogue:check`: passing for 116 puzzles and all four difficulty tiers.
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
- Previous production release: [deployment run 38387390695](https://github.com/BicycleJeanre/wtrack/actions/runs/38387390695) passed from merge commit `7b7fb8c`; live browser verification confirmed the parity surfaces.
- Settings-parity pull-request CI: [run 38389502833](https://github.com/BicycleJeanre/wtrack/actions/runs/38389502833) passed, including Firestore rules and the two-device cloud-sync journey.
- Settings-parity production release: [deployment run 38389782784](https://github.com/BicycleJeanre/wtrack/actions/runs/38389782784) passed from merge commit `86ef0c0`; live browser verification confirmed the expanded auto-saving Settings surface.
- Public-data generation pull-request CI: [run 38394209878](https://github.com/BicycleJeanre/wtrack/actions/runs/38394209878) passed, including Firestore rules, WebKit, and the two-device cloud-sync journey.
- Public-data generation production release: [deployment run 38394541080](https://github.com/BicycleJeanre/wtrack/actions/runs/38394541080) passed from merge commit `e91821f`; a live browser created a Hard astronomy word search directly from Wikimedia data and opened it from the offline payload cache.
- Word Grid pull-request CI: [run 38426669092](https://github.com/BicycleJeanre/wtrack/actions/runs/38426669092) passed before merge.
- Word Grid production release: [deployment run 38427057844](https://github.com/BicycleJeanre/wtrack/actions/runs/38427057844) passed from merge commit `3a0a529`; production catalogue and payload endpoints confirmed all 16 new grids.
- Word Grid answer-slot pull-request CI: [run 38527427320](https://github.com/BicycleJeanre/wtrack/actions/runs/38527427320) passed before merge.
- Word Grid answer-slot production release: [deployment run 38527763629](https://github.com/BicycleJeanre/wtrack/actions/runs/38527763629) passed from merge commit `342ea92`; the cache-busted production asset confirmed the complete hidden-answer checklist UI.
- Fixed Word Grid target-set pull-request CI: [run 38529252028](https://github.com/BicycleJeanre/wtrack/actions/runs/38529252028) passed before merge, including Firestore rules and the two-device cloud journey.
- Fixed Word Grid target-set production release: [deployment run 38529652290](https://github.com/BicycleJeanre/wtrack/actions/runs/38529652290) passed from merge commit `9920c04`; fresh-browser verification confirmed eight hidden Easy targets, target reveal, non-target handling, and catalogue version `2026.10.4`.
- Post-merge CI [run 38529624455](https://github.com/BicycleJeanre/wtrack/actions/runs/38529624455) passed in full on rerun after an initial transient synthetic Firebase sign-in timeout.
- Word Grid bonus-word pull-request CI: [run 38531192507](https://github.com/BicycleJeanre/wtrack/actions/runs/38531192507) passed before merge, including Firestore rules and the two-device cloud journey.
- Word Grid bonus-word production release: [deployment run 38531486088](https://github.com/BicycleJeanre/wtrack/actions/runs/38531486088) passed from merge commit `b4a5218`; fresh-browser verification confirmed first-award scoring, visible bonus history, unchanged target progress, and duplicate prevention.
- Word Grid bonus-word post-merge CI: [run 38531457149](https://github.com/BicycleJeanre/wtrack/actions/runs/38531457149) passed in full.
- Crossword skip-filled-cell pull-request CI: [run 38532968076](https://github.com/BicycleJeanre/wtrack/actions/runs/38532968076) passed in full on rerun after an initial transient synthetic Firebase sign-in timeout.
- Crossword skip-filled-cell production release: [deployment run 38533750963](https://github.com/BicycleJeanre/wtrack/actions/runs/38533750963) passed from merge commit `0138d84`; fresh-browser verification confirmed a filled crossing at cell 23 was preserved and focus advanced from cell 22 to cell 24.
- Crossword skip-filled-cell post-merge CI: [run 38533718950](https://github.com/BicycleJeanre/wtrack/actions/runs/38533718950) passed in full on rerun after the same transient emulator sign-in timeout.
- Progressive Word Grid hint pull-request CI: [run 38543529695](https://github.com/BicycleJeanre/wtrack/actions/runs/38543529695) passed in full, including Firestore rules and the two-device cloud journey.
- Progressive Word Grid hint post-merge CI: [run 38543921840](https://github.com/BicycleJeanre/wtrack/actions/runs/38543921840) passed in full.
- Progressive Word Grid hint production release: [deployment run 38544166216](https://github.com/BicycleJeanre/wtrack/actions/runs/38544166216) passed from merge commit `3f8efe3`; the deployed asset and a production PWA reload confirmed the new control and preserved Letter Lab II progress.

## Next release-one work

1. Collect feedback on topic-page discovery, generated clue quality, and relative difficulty before adjusting the selection profiles.
2. Add deeper concurrent cloud-merge and long-lived tombstone-compaction coverage.
3. Decide whether cross-device generated-payload transfer is worth its storage and synchronization cost; progress-only sync remains the current boundary.
