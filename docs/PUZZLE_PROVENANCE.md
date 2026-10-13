# Puzzle provenance

## Public catalogue 2026.10.2

All 100 published puzzles are WTrack originals created for this repository. They are not sourced from commercial or newspaper puzzle archives. The catalogue contains 50 word searches and 50 crosswords across four friendly difficulty tiers.

| Difficulty | Puzzle count |
| --- | ---: |
| Easy | 26 |
| Medium | 26 |
| Hard | 24 |
| Diabolical | 24 |

The four initial puzzles remain unchanged. The other 96 puzzles are built deterministically from 12 WTrack-authored theme banks—forest, ocean, space, kitchen, music, garden, weather, travel, art, science, sports, and city—with one word search and one crossword at each difficulty.

| Puzzle | Type | Words/clues | Layout | Licence |
| --- | --- | --- | --- | --- |
| Word craft | Word search | WTrack original | `@blex41/word-search` 1.2.0, reviewed and frozen | AGPL-3.0-or-later |
| Ocean life | Word search | WTrack original | `@blex41/word-search` 1.2.0, reviewed and frozen | AGPL-3.0-or-later |
| Puzzle desk | Crossword | WTrack original | `crossword-layout-generator` 0.1.1, reviewed and frozen | AGPL-3.0-or-later |
| Along the coast | Crossword | WTrack original | `crossword-layout-generator` 0.1.1, reviewed and frozen | AGPL-3.0-or-later |

The generated grids are committed as static catalogue source so reviewed content does not depend on package behavior changing at runtime. `scripts/generate-catalogue.mjs` rebuilds the source from `src/data/catalogue-themes.json`; `scripts/check-catalogue.mjs` verifies identifiers, provenance, paths, crossword coverage, type balance, and difficulty distribution; and `scripts/export-catalogue.mjs` prepares individually downloadable same-origin payloads. Up to ten opened payloads are retained offline.

```sh
npm run catalogue:generate
npm run catalogue:check
```

Generated entries record the WTrack deterministic catalogue generator, catalogue version, WTrack authorship, repository source, AGPL-3.0-or-later licence, and review status. Every crossword answer is connected through a crossing and every open crossword cell belongs to a declared clue path.

## Private on-demand Wikidata generation

The Create screen can make a private puzzle from an explicit English Wikipedia topic-page title. Only after the player submits the form, it reads the page's linked Wikidata item IDs and requests those items' English labels and descriptions through `wbgetentities`. Labels become normalized answers; for crosswords, English Wikidata descriptions become clues. Wikidata structured data is available under CC0-1.0; the discovery page is attributed under CC BY-SA 4.0.

Each saved result records the selected item QIDs, retrieval timestamp, CC0 licence, WTrack public-data generator version, layout-library name and version, generation seed, and lack of editorial review. The complete payload is validated and kept in the normal ten-puzzle IndexedDB LRU, not published into `catalogue/index.json`. A generated puzzle therefore remains playable offline after creation but can be evicted like any other cached payload. Generated payloads do not synchronize through Firestore.

The four generation profiles are relative settings, not standardized ratings. Easier profiles prefer earlier, shorter search results and simpler directions. Harder profiles prefer longer/lower-ranked terms, more answers, larger grids, more directions, and more reversals. Source-data quality and topic familiarity can still make an individual puzzle easier or harder than its label suggests.

## Required metadata for future puzzles

- stable puzzle ID and catalogue version;
- puzzle type, title, friendly difficulty, dimensions, and complete verified solution;
- word-list or clue/answer authorship and source;
- generator/parser name and exact version;
- source URL and redistribution licence or permission;
- human review status, including crossword connectivity and clue-answer agreement.

Public availability is not permission to redistribute a crossword, its clues, or a curated word list. Unknown terms block catalogue publication.
