# Brain Games

Brain Games is an offline-first entertainment application combining Sudoku and word games behind one shared home, with room for future recreational exercises such as speed reading, memory, attention, and mental arithmetic.

It does not make cognitive, medical, therapeutic, educational-outcome, intelligence, reading-improvement, or health claims. Scores and progress describe recorded play only.

## Current migration stage

The repository preserves the complete STrack and WTrack histories beneath `apps/sudoku/` and `apps/words/`. Stage 1 provides one verified `/brain-games/` build and shared shell while leaving both existing production deployments untouched. The next workstream is the versioned local schema and previewable import of legacy progress.

See [the product brief](docs/PRODUCT_BRIEF.md) and [consolidation plan](docs/CONSOLIDATION_PLAN.md).

## Development

```sh
npm install
npm run build
```

The combined production artifact is written to `dist/` with the launcher at its root, Sudoku beneath `dist/sudoku/`, and word games beneath `dist/words/`.

## Licence

AGPL-3.0-or-later. Third-party notices remain within each imported module until they are consolidated into the shared release package.
