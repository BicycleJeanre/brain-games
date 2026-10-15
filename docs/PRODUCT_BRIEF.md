# Brain Games product brief

## Goal

Brain Games is an installable, offline-first entertainment application for puzzles and performance-based activities. Its initial library combines the complete STrack Sudoku experience with WTrack's word searches, crosswords, connected Word Grids, and Letter Mix games. Future modules may include speed-reading games, memory games, attention games, mental arithmetic, and other recreational exercises.

Brain Games does not make medical, therapeutic, educational-outcome, intelligence, cognition, memory-improvement, attention-improvement, reading-improvement, or health claims. Scores and progress describe recorded play only.

## Product structure

- **Play:** Sudoku, Crosswords, Word Search, Word Grid, Letter Mix, and future games.
- **Train:** recreational timed exercises such as speed reading, memory, attention, and mental arithmetic.
- **Learn:** optional technique instruction, beginning with the HoDoKu-backed Sudoku curriculum.
- **Progress:** personal streaks, completions, time, speed, accuracy, and game-specific statistics without benefit claims.
- **Library:** browse available games, difficulties, and locally available content.

## Experience principles

1. One coherent application shell, account, settings surface, backup format, progress area, and deployment.
2. Puzzle and exercise modules remain independently testable and lazy-loaded.
3. Every meaningful action saves locally before optional cloud synchronization.
4. Existing STrack and WTrack progress is preserved through explicit, versioned migration.
5. Core play remains useful offline after installation.
6. Provenance and redistribution terms remain visible for every published puzzle catalogue.
7. Keyboard, pointer, touch, reduced-motion, visible-focus, and non-colour cues have feature parity.

## Initial migration boundary

The first combined milestone provides one repository, one deployment artifact, and one Brain Games entry point. The proven STrack and WTrack applications are mounted as Sudoku and Word Games modules while their domain logic remains intact. Subsequent milestones replace duplicate shell, settings, authentication, synchronization, backup, and service-worker code with shared Brain Games services.

The existing `/strack/` and `/wtrack/` deployments remain active until local-data migration, account migration, offline behavior, phone/desktop behavior, and rollback have been production-verified.

## Technical direction

- Vite + strict TypeScript.
- GitHub Pages base path `/brain-games/`.
- A modular shell with lazy domain entry points.
- Versioned IndexedDB migrations that can read the legacy `strack-v1` and `wtrack` databases because all three applications share the `bicyclejeanre.github.io` origin.
- A new neutral Firebase project and namespaced owner-only Firestore model before account cutover.
- A single versioned service-worker strategy after module consolidation; transition builds may retain scoped module workers.
- AGPL-3.0-or-later, with consolidated third-party notices and source availability.

## Release acceptance

- One Brain Games URL exposes both complete game families.
- Existing STrack and WTrack URLs remain usable during migration.
- Legacy local data can be detected, previewed, imported once, and left recoverable.
- Signed-in data can be reconciled into one Brain Games account without cross-user exposure.
- Sudoku and word-game unit, browser, offline, accessibility, and base-path suites remain green.
- The combined home and every module work on phone and desktop.
- Documentation records current migration stage, source commits, deployment, rollback, and retirement status.
