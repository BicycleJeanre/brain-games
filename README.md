# Brain Games

Brain Games is an offline-first entertainment application combining Sudoku and word games behind one shared home, with room for future recreational exercises such as speed reading, memory, attention, and mental arithmetic.

It does not make cognitive, medical, therapeutic, educational-outcome, intelligence, reading-improvement, or health claims. Scores and progress describe recorded play only.

## Current integration stage

The repository preserves the complete STrack and WTrack source histories beneath `apps/sudoku/` and `apps/words/`, with the final legacy releases and branch tips retained as archive tags. Brain Games provides one identity, one profile and sign-in, app-style Home, Play, Progress and Settings views, an installable offline scope, versioned local database, combined backup, and neutral owner-protected Firebase project. Home presents Sudoku, Crosswords, Word Search, Word Grid, and Letter Mix as one game library. Settings owns the shared profile, appearance, player preferences, and data controls for every game; module settings URLs return to that single surface. The focused Sudoku and word-game players remain independently testable modules inside the shared application. The former standalone repositories and Pages deployments were retired after the combined application was accepted.

See [the product brief](docs/PRODUCT_BRIEF.md) and [consolidation plan](docs/CONSOLIDATION_PLAN.md).

## Development

```sh
npm install
npm run build
```

The combined production artifact is written to `dist/` with the launcher at its root, Sudoku beneath `dist/sudoku/`, and word games beneath `dist/words/`.

See [migration instructions](docs/MIGRATION.md) and the [deployment inventory and rollback runbook](docs/DEPLOYMENT.md).

## Licence

AGPL-3.0-or-later. Third-party notices remain within each imported module until they are consolidated into the shared release package.
