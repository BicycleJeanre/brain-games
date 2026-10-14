# WTrack product brief

## Goal

Build a polished word-puzzle application in the FTrack/GTrack/STrack family. WTrack combines word searches, crosswords, and adjacent-letter Word Grids in one installable, offline-first PWA with optional private account sync.

The puzzle board remains the visual centre of gravity. The interface uses the family’s charcoal/cyan palette, disciplined spacing, compact controls, rounded panels, clear hierarchy, practical empty/error/offline states, and responsive phone/desktop layouts.

## Product principles

1. **Offline is a focused mode.** The shell, catalogue index, progress, settings, help, and up to ten recently opened puzzle payloads work without sign-in or connectivity.
2. **Local first, cloud second.** Every move saves to IndexedDB before optional Firestore reconciliation.
3. **Provenance is product data.** A puzzle is not release-ready until its grid, words, clues, generator, licence, and source can be explained.
4. **No universal difficulty claims.** Friendly difficulty labels are catalogue metadata, not an industry-standard score.
5. **Accessible input parity.** Keyboard, pointer, and touch flows expose the same essential actions with visible focus and non-colour status cues.

## Release-one scope

### Home and library

- Resume active puzzles before discovery content, keep completed puzzles in a separate history, and allow either kind of saved session to be deleted individually.
- Browse the expandable public catalogue and filter by type or by Easy, Medium, Hard, and Diabolical difficulty.
- Download a puzzle on first open and retain at most ten playable payloads offline using least-recently-opened eviction.
- Show difficulty, progress, completion, and provenance details.
- Offer deterministic daily and weekly challenges in every rated difficulty, with independent saved sessions and completion, streak, and average-time summaries.

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
- Private imports for licensed or personal `.puz`, iPUZ, JPZ, and XD puzzles where the parser can preserve the required grid and clue metadata. Imports are Unrated and are not published.

### Word Grid player

- Trace horizontal, vertical, or diagonal adjacent letters without reusing a tile; accept words of three or more letters from the puzzle's frozen solution set.
- Score by length (3–4: 1, 5: 2, 6: 3, 7: 5, 8+: 11) and complete the puzzle by reaching its difficulty-specific target.
- Support pointer drag, touch-by-tile, keyboard focus/selection, saved found words, reset, timer, and offline completion.
- Show every accepted round word as length-matched blank character slots, revealing its letters only after it is found; retain unfinished slots for optional bonus play after the target is reached.
- Offline hints reveal only the first two tiles and length/value of a remaining word.

### Create and import

- On-demand word-search and crossword generation from user-requested English Wikipedia topic links and their Wikidata CC0 terms, with no live request during startup or ordinary play.
- Easy, Medium, Hard, and Diabolical generation profiles that vary term rank/length, answer count, grid size, directions, and reversal probability without claiming a universal standard.
- Complete generated payloads retained by the same ten-puzzle local LRU, including QIDs, retrieval time, licence, generator versions, and seed, so later play is offline.
- Local word-search generation with `@blex41/word-search`.
- Local crossword answer layout with `crossword-layout-generator`.
- Common crossword-file parsing with `@xwordly/xword-parser`, normalized into WTrack's validated local puzzle model.
- Generated/imported puzzles remain private previews until a human reviews connectivity, clues, answers, provenance, and redistribution rights.
- Generated/imported puzzle payloads are device-local; progress may synchronize, but another device must generate or import its own playable payload.

### Accounts and synchronization

- Optional Firebase email/password accounts.
- Store progress and preferences beneath owner-only Firestore paths.
- Reconcile by `updatedAt` with deletion tombstones; never make core play wait on the network.
- Provide JSON export and non-destructive merge import before relying on cloud sync as the only backup path.
- Provide separate controls for completed progress, all progress, and downloaded puzzle payloads.

### Settings and readability

- Auto-save theme, timer visibility, hint-control visibility, board-help visibility, crossword correctness feedback, and readable grid, clue, and menu text-size presets.
- Offer multiple accessible highlight palettes without making colour the only signal for selection, hints, or completion.
- Preserve the active puzzle while Settings is open, return to the originating screen, and offer a confirmed current-puzzle reset when Settings was opened from a player.
- Keep preferences local-first, synchronize them through the same optional owner-only account state, and normalize older preference documents to current defaults.

## Technical conventions

- Vite + strict TypeScript, static GitHub Pages build at `/wtrack/`.
- IndexedDB through `idb`; versioned service-worker app-shell/catalogue-index cache and a ten-puzzle payload cache.
- Deterministic hint selection through the bundled MIT-licensed `pure-rand` library; no live hint API.
- Firebase modular Web SDK with persistent multi-tab Firestore cache.
- Deterministic Node unit tests and Chromium/WebKit Playwright coverage.
- Manual production deployment workflow after checks pass.

## Catalogue and provenance

Catalogue version 2026.10.3 includes 116 puzzles: 50 word searches, 50 crosswords, and 16 deterministic Word Grids. It preserves the first four demonstrations, includes 96 puzzles generated from 12 original theme banks, and adds four Word Grids per difficulty. The committed catalogue contains 30 Easy, 30 Medium, 28 Hard, and 28 Diabolical puzzles. Word Grid candidate words are drawn at build time from `an-array-of-english-words` 2.0.0 and filtered through `subtlex-word-frequencies` 2.0.0; only each compact solved payload ships. Players can additionally create device-local puzzles from public data on demand.

The committed source is validated at build time, then exported to one lightweight discovery index and one static payload per puzzle. This creates an expandable catalogue without a live third-party feed or a growing application bundle. Difficulty labels are intentionally friendly editorial classifications rather than standardized ratings.

## Acceptance criteria

- Builds and serves correctly from `/wtrack/`.
- Installs and restarts offline with the shell, help, progress, catalogue index, and no more than ten recently opened playable puzzles.
- All three game types support keyboard, mouse, and touch on desktop and narrow phones.
- Daily and weekly challenge selections stay stable for their UTC period and never overwrite ordinary puzzle progress.
- Progress saves locally on every meaningful move and optionally synchronizes privately through Firestore.
- Every published puzzle exposes provenance and licence details.
- Custom generators work locally and make their review boundary explicit.
- Automated tests cover model validation, persistence, completion, challenge selection, private import, preference migration, Firestore rules, Chromium/WebKit browser play, current-puzzle reset, true server-stop offline restart, accessibility, responsive layout, themes, and base paths.
- README, user guide, provenance documentation, architecture notes, and deployment workflow stay aligned with behavior.
