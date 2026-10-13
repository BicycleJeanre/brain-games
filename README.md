# WTrack

WTrack is a local-first word-search and crossword PWA in the FTrack/GTrack/STrack visual family. It provides one focused puzzle desk, responsive keyboard and touch play, transparent puzzle provenance, a ten-puzzle offline cache, and optional private Firebase synchronization.

The production build targets `https://bicyclejeanre.github.io/wtrack/`. The catalogue is hosted with the static app rather than fetched from a third-party puzzle API. Browsing metadata and the ten most recently opened puzzles remain available offline.

## Current foundation

- Original Vite + strict TypeScript app with no UI framework.
- 100 original public puzzles: 50 word searches and 50 crosswords, exported as individually downloadable static payloads.
- An IndexedDB least-recently-used cache capped at ten playable offline puzzles; eviction never deletes progress.
- Easy, Medium, Hard, and Diabolical library filters, with at least 24 puzzles in each tier.
- Stable daily and weekly challenges in every rated difficulty, with independent sessions, streaks, completion, and average-time summaries.
- IndexedDB-first progress, completion state, preferences, and timer.
- Separate active/completed history with individual deletion, synchronized tombstones, and scoped local-data controls.
- Optional Firebase email/password accounts and owner-protected Firestore state.
- Word-search generation through `@blex41/word-search`.
- Crossword layout generation through `crossword-layout-generator`.
- User-triggered, browser-local puzzle generation from English Wikipedia topic links and Wikidata CC0 terms, with Easy through Diabolical profiles and complete provenance saved in the ten-puzzle offline cache.
- Private `.puz`, iPUZ, JPZ, and XD file import through `@xwordly/xword-parser`; imported payloads remain local and Unrated.
- Auto-saving STrack-style preferences for light/dark/system themes, timer and hint/help visibility, grid/clue/menu text sizes, four highlight palettes, and crossword correctness feedback.
- Pointer, touch, and keyboard word-search selection plus non-destructive JSON device backup merge and scoped storage controls.
- Persistent offline hints: a highlighted path cell for word searches and a revealed active-clue letter for crosswords.
- Versioned service-worker cache and `/wtrack/` base-path verification.
- Chromium, mobile Chromium, and WebKit browser coverage plus unit, catalogue-integrity, real server-stop offline restart, base-path, Firestore-rules, and emulator-backed cloud-journey checks.

The Create screen can turn an English Wikipedia topic-page title into a playable private puzzle. Only after the user presses Generate, WTrack discovers linked concepts from that page and fetches their public Wikidata labels and descriptions. It saves the resulting grid, answers, source page, selected QIDs, retrieval time, licences, generator versions, and selection seed locally; later play works offline. It also produces manual local previews and opens private crossword files. Generated and imported puzzle payloads do not sync to other devices or enter the curated catalogue automatically.

## Local development

Requirements: Node.js 22.12 or newer and npm.

```sh
npm install
npm run dev
```

The development server runs at `http://127.0.0.1:5174`.

## Checks

```sh
npm run catalogue:check
npm run test:unit
npm run build
npm run test:base-path
npm test
```

Firestore rules require the Firebase CLI and Java runtime:

```sh
npm run test:rules
npm run test:cloud
```

The catalogue is generated deterministically from the original theme banks in
`src/data/catalogue-themes.json`. Run `npm run catalogue:generate` only when intentionally
rebuilding the committed catalogue, then run `npm run catalogue:check` before review.
`npm run build` automatically exports the committed source into a lightweight index and
one static JSON payload per puzzle; `npm run catalogue:export` can run that step directly.

## Firebase setup

Copy `.env.example` to `.env.local` and add the public Firebase web configuration. Enable Email/Password Authentication and deploy `firestore.rules` and `firestore.indexes.json`. These values identify a Firebase app; they are not server credentials. Never commit service-account credentials. Production uses an independent no-cost Spark project with no billing account or Bicycle association; see the [Firebase setup runbook](docs/FIREBASE_SETUP.md) for its guardrails and GitHub Pages configuration.

Cloud state is stored only at `users/{uid}/state/app`. Rules restrict reads and writes to the authenticated owner. Local progress remains authoritative during offline play.

## Documentation

- [Product brief](docs/PRODUCT_BRIEF.md)
- [User guide](docs/USER_GUIDE.md)
- [Puzzle provenance](docs/PUZZLE_PROVENANCE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [STrack parity review](docs/STRACK_PARITY.md)
- [Release status](docs/RELEASE_STATUS.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## Licence

WTrack is licensed under AGPL-3.0-or-later. Third-party packages retain their own licences; see `THIRD_PARTY_NOTICES.md`.
