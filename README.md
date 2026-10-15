# Brain Games

Brain Games is an offline-first entertainment application combining Sudoku and word games behind one shared home, with room for future recreational exercises such as speed reading, memory, attention, and mental arithmetic.

It does not make cognitive, medical, therapeutic, educational-outcome, intelligence, reading-improvement, or health claims. Scores and progress describe recorded play only.

## Current integration stage

The repository preserves the complete source histories beneath `apps/sudoku/` and `apps/words/`. Brain Games provides one identity, game switcher, progress dashboard, installable offline scope, versioned local database, combined backup, and neutral owner-protected Firebase project. Sudoku and word-game engines remain independently testable modules inside that shared application. The previous production deployments remain active and untouched as rollback sources.

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
