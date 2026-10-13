# Puzzle provenance

## Bundled catalogue 2026.10.1

All four initial puzzles are WTrack originals created for the repository. They establish the catalogue schema and test the two players; they are not sourced from commercial or newspaper puzzle archives.

| Puzzle | Type | Words/clues | Layout | Licence |
| --- | --- | --- | --- | --- |
| Word craft | Word search | WTrack original | `@blex41/word-search` 1.2.0, reviewed and frozen | AGPL-3.0-or-later |
| Ocean life | Word search | WTrack original | `@blex41/word-search` 1.2.0, reviewed and frozen | AGPL-3.0-or-later |
| Puzzle desk | Crossword | WTrack original | `crossword-layout-generator` 0.1.1, reviewed and frozen | AGPL-3.0-or-later |
| Along the coast | Crossword | WTrack original | `crossword-layout-generator` 0.1.1, reviewed and frozen | AGPL-3.0-or-later |

The generated grids are committed as static catalogue data so offline play is deterministic and does not depend on package behavior changing at runtime.

## Required metadata for future puzzles

- stable puzzle ID and catalogue version;
- puzzle type, title, friendly difficulty, dimensions, and complete verified solution;
- word-list or clue/answer authorship and source;
- generator/parser name and exact version;
- source URL and redistribution licence or permission;
- human review status, including crossword connectivity and clue-answer agreement.

Public availability is not permission to redistribute a crossword, its clues, or a curated word list. Unknown terms block catalogue publication.
