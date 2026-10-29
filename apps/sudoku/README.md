# STrack

STrack is an offline-first Sudoku PWA in the FTrack/GTrack product family. It combines a focused responsive puzzle desk with transparent Sudoku Explainer ratings, separate notation systems, progressive logical hints, and device-local privacy.

The production build is designed for `https://bicyclejeanre.github.io/strack/`. Core play has no runtime server or third-party puzzle API dependency; optional Firebase accounts privately synchronize puzzle sessions between devices. There are no analytics or ads.

## Release 1

- 80 public-domain, uniquely solvable puzzles: 20 each in Easy, Medium, Hard, and Diabolical.
- Deterministic daily and weekly challenges for every difficulty, selected from the offline catalogue using UTC periods and connected to resumable local/Firestore game sessions. A weekly puzzle stays fixed for its full ISO week and is never reused by any of that week’s daily slots. The eight current challenge puzzles are also reserved from regular quick-start, next-puzzle, and surprise selection. Home tracks current-period completion, daily and weekly streaks, solve counts, and average completion times. Challenge completion advances through Easy, Medium, Hard, and Diabolical within the same day or week before returning to the summary.
- Exact `SE` ratings, friendly bands, stable source IDs, catalogue version, and provenance visible for every bundled puzzle.
- Normal digits that replace both note types in their cell, double-click or double-tap promotion of a sole centre note, note entry restricted to empty cells, warm top-left corner/Snyder marks, high-contrast centred candidate marks, one-click undoable centre-candidate calculation, AND/OR multi-digit highlighting, nine stackable cell colours, coloured lines between cells, targeted or complete annotation clearing, click-drag multi-cell selection, and deterministic selection-wide corner notation when entering digits across several cells.
- Mouse, touch, and keyboard parity, including arrows, Shift-selection, number entry, notation shortcuts, and undo/redo.
- Player preferences for simple centre-only notes or advanced corner-and-centre notation; optional colour, line, value-selection, candidate, and help controls; three practical font-size presets; and curated high-contrast palettes for entered digits, notes, menu text, and highlighted cells.
- A compact mobile player keeps the board and full 3×3 number keypad in the initial portrait viewport at supported phone sizes.
- Live puzzle hints are powered by a pinned local bundle of sudokUI's GPL-3.0 engine and reviewed learning content. The player rebuilds the next step from the displayed board and centre candidates whenever either changes. A minimal first tier names only the technique; Show pattern reveals the authored definition, why the rule works, how to spot it, exact pattern roles, and a step-by-step walk through this grid; Show answer alone exposes the final deduction. Previous hints retain the same progressive disclosure without allowing an old deduction to be applied again.
- Structured hint data drives the board instead of inferred generic prose: pattern, support, and fin candidates retain their engine-assigned roles, while base and cover houses come directly from the finder. Walkthrough frames stop before the conclusion, leaving the player to reason from the evidence. The Finned Jellyfish regression fixture verifies all four base rows, four cover columns, three fins, and the R2C7 elimination. Techniques covered by the existing curriculum still link to interactive HoDoKu-sourced practice; other supported techniques receive the complete sudokUI guide and in-puzzle walkthrough without pretending that an interactive lesson exists.
- A 21-technique offline curriculum driven by the official HoDoKu regression and exemplar libraries, pinned to a reproducible upstream commit. Every exercise is revalidated by the same local HoDoKu engine used for hints, and its exact source record is linked in the player. Each lesson explains one worked example, then rotates through four separate verified practice positions for Find and Deduce so the answer is not exposed before practice. Training reuses the player’s clickable value, peer, matching-candidate, 3×3 digit, multi-value OR/AND, keyboard, theme, and readability highlighting. Lessons span singles through Empty Rectangles and forcing chains, translate compact engine results into grid-specific reasoning, draw structured chain links from the engine, record independent or assisted completion, and synchronize progress for signed-in users.
- Automatic candidates, larger phone-note digits, bold color-preserving note matches with the same cell highlight used for placed digits, an explicit multi-value highlight mode, a 3×3 number keypad, completed-digit cues, candidate cleanup, optional immediate mistake feedback that is off by default (including its running counter and notifications), a default three-mistake allowance that marks the attempt failed on the fourth incorrect digit (and can be disabled), completion fanfare, pause, optional timer, and light/dark/system themes.
- IndexedDB save/resume, active puzzles placed near the top of Home, a separate completed section, per-puzzle deletion, non-destructive JSON backup import, and scoped reset controls.
- Optional email/password accounts with owner-only Firestore sessions, offline-first writes, persistent retry state, coalesced background updates, server-ordered revisions, and cross-device puzzle, preference, and training progress. Cell selection and input mode remain device-local so ordinary navigation does not create cloud traffic.
- Local puzzle import with shape, conflict, solution, and uniqueness checks plus URL-only sharing.
- Installable manifest and versioned app-shell cache. The app shell, help, solver, current progress, preferences, and full bundled catalogue relaunch offline.
- Responsive phone, desktop, portrait, and landscape layouts with a Sudoku board that expands to use available viewport width and height, plus visible focus, semantic names, reduced-motion support, and colour-independent status cues.

See [the user guide](docs/USER_GUIDE.md) and [puzzle provenance](docs/PUZZLE_PROVENANCE.md) for details.

## Run locally

Use Node 24 LTS (minimum 22.12):

```sh
npm ci
npm run dev
```

Development mode intentionally does not register a service worker. Verify install/offline behavior against a production build:

```sh
npm run build
npm run preview
```

## Verification

```sh
npm run catalogue:check
npm run test:unit
npm test
npm run test:base-path
```

`npm test` builds a relative-path production bundle and runs Chromium and WebKit, including a server-stop/reload check against the real service worker. `npm run test:base-path` separately proves that the deployable bundle uses `/strack/` for GitHub Pages assets and includes the offline shell.

The unit suite covers parsing, validation, uniqueness, solving, candidates, complete hint and training positions, ratings metadata, entry modes, undo/redo, IndexedDB persistence, and non-destructive backup handling. Browser coverage exercises desktop and narrow/landscape layouts, training, notation, colours, multi-select, keyboard controls, themes, help, import/share, offline progress, catalogue access, and provenance.

Before relying on a release on a real phone, smoke-test installation from HTTPS, airplane-mode launch, touch selection, rotation, OS theme changes, and backup restore. Desktop WebKit does not replace a physical iPhone check.

## Deployment

`.github/workflows/check.yml` runs catalogue, unit, production build, Chromium, WebKit, offline-restart, and base-path checks for pull requests and `main` pushes.

`.github/workflows/deploy.yml` is manual. It builds with `BASE_PATH=/strack/`, uploads `dist/`, and deploys through GitHub Pages. In repository settings, select **GitHub Actions** as the Pages source.

The deployment requires the four public Firebase web identifiers as Actions secrets: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID`. Firestore Rules keep every `users/{uid}` game and settings document private to that authenticated user. `npm run test:rules` validates isolation, and `npm run test:cloud` proves a puzzle started in one browser context resumes in another through the local Auth/Firestore emulators.

The required pull-request check stays intentionally lean: catalogue integrity, unit tests, Firestore rules, and the production Pages build/base path. The Chromium/WebKit UI suite and emulator-backed cloud journey remain available as explicit pre-release or local checks without downloading browser engines on every push.

When `firestore.rules` changes, deploy it separately with `npx firebase deploy --only firestore:rules --project strack-bicycle` before publishing the matching Pages release. The Pages workflow does not authenticate to Firebase or deploy backend rules.

## Local data and privacy

STrack always stores preferences, training progress, active boards, elapsed time, notation, colours, undo history, and completions in IndexedDB first. Games use independent local records, so entering a digit never rewrites the user's whole history. Signed-in users synchronize the authoritative current board, annotations, elapsed time, and completion state into private per-game Firestore documents. Durable edits are coalesced for a fraction of a second with a two-second maximum propagation interval, unsent changes survive a reload, and Firestore revisions determine the newest committed version without relying on device clocks. Selection, cursor, input mode, undo/redo stacks, hint review history, and regenerable hint paths stay on the current device. Imports merge only missing game IDs and never replace an existing game. Browser storage can be cleared or evicted; a downloaded JSON export remains the independent backup and the only backup for device-only play.

Share links contain the 81-character givens in the URL and do not upload a puzzle. Imported puzzles are solved and validated locally, labelled `Unrated`, and never assigned a fabricated SE value.

## Licence and source

STrack is licensed under [AGPL-3.0-or-later](LICENSE). The deployed application links back to this repository so its complete corresponding source remains available. The bundled sudokUI hint engine, vendored HoDoKu TypeScript engine, and HoDoKu2 training records remain GPL-compatible; their pinned sources, licences, and attribution are summarized in [NOTICE.md](NOTICE.md).

## Project references

- Product requirements: [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)
- User behavior: [docs/USER_GUIDE.md](docs/USER_GUIDE.md)
- Catalogue source, licence, ratings, and refresh procedure: [docs/PUZZLE_PROVENANCE.md](docs/PUZZLE_PROVENANCE.md)
