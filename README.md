# WTrack

WTrack is an offline-first word-search and crossword PWA in the FTrack/GTrack/STrack visual family. It provides one focused puzzle desk, responsive keyboard and touch play, transparent puzzle provenance, device-first persistence, and optional private Firebase synchronization.

The production build targets `https://bicyclejeanre.github.io/wtrack/`. Bundled puzzles and core play do not depend on a live puzzle API, an account, or a network connection.

## Current foundation

- Original Vite + strict TypeScript app with no UI framework.
- Two word searches and two compact crosswords bundled for offline play.
- IndexedDB-first progress, completion state, preferences, and timer.
- Optional Firebase email/password accounts and owner-protected Firestore state.
- Word-search generation through `@blex41/word-search`.
- Crossword layout generation through `crossword-layout-generator`.
- `.puz`, iPUZ, JPZ, and XD parsing foundation through `@xwordly/xword-parser`.
- Light, dark, and system themes; visible focus; keyboard-first crossword entry; reduced-motion support.
- Versioned service-worker cache and `/wtrack/` base-path verification.
- Unit, browser, and Firestore-rules test foundations.

The Create screen currently produces local previews. Moving a generated or imported puzzle into the bundled catalogue is deliberately a reviewed process: provenance, clue authorship, redistribution terms, connectivity, and answer correctness must be documented first.

## Local development

Requirements: Node.js 22.12 or newer and npm.

```sh
npm install
npm run dev
```

The development server runs at `http://127.0.0.1:5174`.

## Checks

```sh
npm run test:unit
npm run build
npm run test:base-path
npm test
```

Firestore rules require the Firebase CLI and Java runtime:

```sh
npm run test:rules
```

## Firebase setup

Copy `.env.example` to `.env.local` and add the public Firebase web configuration. Enable Email/Password Authentication and deploy `firestore.rules` and `firestore.indexes.json`. These values identify a Firebase app; they are not server credentials. Never commit service-account credentials.

Cloud state is stored only at `users/{uid}/state/app`. Rules restrict reads and writes to the authenticated owner. Local progress remains authoritative during offline play.

## Documentation

- [Product brief](docs/PRODUCT_BRIEF.md)
- [User guide](docs/USER_GUIDE.md)
- [Puzzle provenance](docs/PUZZLE_PROVENANCE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

## Licence

WTrack is licensed under AGPL-3.0-or-later. Third-party packages retain their own licences; see `THIRD_PARTY_NOTICES.md`.
