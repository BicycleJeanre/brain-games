# WTrack product brief

## Goal

Build a polished word-puzzle application in the FTrack/GTrack/STrack family. WTrack combines two complementary game types—word searches and crosswords—in one installable, offline-first PWA with optional private account sync.

The puzzle board remains the visual centre of gravity. The interface uses the family’s charcoal/cyan palette, disciplined spacing, compact controls, rounded panels, clear hierarchy, practical empty/error/offline states, and responsive phone/desktop layouts.

## Product principles

1. **Offline is a complete mode.** Bundled puzzles, players, progress, settings, and help work without sign-in or connectivity.
2. **Local first, cloud second.** Every move saves to IndexedDB before optional Firestore reconciliation.
3. **Provenance is product data.** A puzzle is not release-ready until its grid, words, clues, generator, licence, and source can be explained.
4. **No universal difficulty claims.** Friendly difficulty labels are catalogue metadata, not an industry-standard score.
5. **Accessible input parity.** Keyboard, pointer, and touch flows expose the same essential actions with visible focus and non-colour status cues.

## Release-one scope

### Home and library

- Resume active puzzles before discovery content.
- Browse 100 bundled puzzles and filter by type or by Easy, Medium, Hard, and Diabolical difficulty.
- Show difficulty, progress, completion, and provenance details.
- Support deterministic daily/weekly challenges once the catalogue is large enough.

### Word-search player

- Eight-direction selection, forwards and backwards.
- Pointer drag, tap endpoint, and keyboard selection modes.
- Persistent found-word highlighting and a textual Found state.
- Optional timer, pause, reset, and completion summary.
- Offline hints identify a useful cell on an unfinished word without completing it.

### Crossword player

- Across/down clue lists, conventional numbering, active clue highlighting, and crossing-aware navigation.
- Keyboard entry, Backspace behavior, arrow navigation, touch input, optional correctness marking, pause, reset, and completion summary.
- Offline hints reveal one unresolved letter in the active clue, then fall back to the rest of the grid.
- Imports for licensed `.puz`, iPUZ, JPZ, and XD puzzles where the parser can preserve required metadata.

### Create and import

- Local word-search generation with `@blex41/word-search`.
- Local crossword answer layout with `crossword-layout-generator`.
- Common crossword-file parsing with `@xwordly/xword-parser`.
- Generated/imported puzzles remain private previews until a human reviews connectivity, clues, answers, provenance, and redistribution rights.

### Accounts and synchronization

- Optional Firebase email/password accounts.
- Store progress and preferences beneath owner-only Firestore paths.
- Reconcile by `updatedAt` with deletion tombstones; never make core play wait on the network.
- Provide JSON export/import before relying on cloud sync as the only backup path.

## Technical conventions

- Vite + strict TypeScript, static GitHub Pages build at `/wtrack/`.
- IndexedDB through `idb`; versioned service-worker app-shell and catalogue cache.
- Deterministic hint selection through the bundled MIT-licensed `pure-rand` library; no live hint API.
- Firebase modular Web SDK with persistent multi-tab Firestore cache.
- Deterministic Node unit tests and Chromium/WebKit Playwright coverage.
- Manual production deployment workflow after checks pass.

## Catalogue and provenance

Catalogue version 2026.10.2 includes 100 WTrack-original puzzles: 50 word searches and 50 crosswords. It preserves the first four demonstration puzzles and adds 96 deterministic puzzles generated from 12 original theme banks. The committed catalogue contains 26 Easy, 26 Medium, 24 Hard, and 24 Diabolical puzzles.

The catalogue is static and validated at build time, so discovery and play never depend on an external puzzle feed. Difficulty labels are intentionally friendly editorial classifications rather than standardized ratings.

## Acceptance criteria

- Builds and serves correctly from `/wtrack/`.
- Installs and restarts offline with the shell, help, active progress, and bundled catalogue.
- Both game types support keyboard, mouse, and touch on desktop and narrow phones.
- Progress saves locally on every meaningful move and optionally synchronizes privately through Firestore.
- Every bundled puzzle exposes provenance and licence details.
- Custom generators work locally and make their review boundary explicit.
- Automated tests cover model validation, persistence, completion, Firestore rules, browser play, offline restart, themes, and base paths.
- README, user guide, provenance documentation, architecture notes, and deployment workflow stay aligned with behavior.
