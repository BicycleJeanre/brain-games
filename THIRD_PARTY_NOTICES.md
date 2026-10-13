# Third-party notices

WTrack depends on the following puzzle libraries. They are installed from npm and are not copied into the source tree.

| Package | Version range | Purpose | Licence | Source |
| --- | --- | --- | --- | --- |
| `@blex41/word-search` | `^1.2.0` | Local word-search generation | MIT | <https://github.com/blex41/word-search> |
| `crossword-layout-generator` | `^0.1.1` | Local crossword answer layout | MIT | <https://github.com/MichaelWehar/Crossword-Layout-Generator> |
| `@xwordly/xword-parser` | `^1.1.0` | `.puz`, iPUZ, JPZ, and XD parsing | MIT | <https://github.com/mjkoo/xword-parser> |
| `buffer` | `^6.0.3` | Browser compatibility for private crossword-file parsing | MIT | <https://github.com/feross/buffer> |
| `firebase` | `^12.19.0` | Optional authentication and Firestore synchronization | Apache-2.0 | <https://github.com/firebase/firebase-js-sdk> |
| `idb` | `^8.0.3` | IndexedDB promise wrapper | ISC | <https://github.com/jakearchibald/idb> |
| `pure-rand` | `^8.4.2` | Deterministic, unbiased offline hint selection | MIT | <https://github.com/dubzzz/pure-rand> |
| `an-array-of-english-words` | `2.0.0` | Build-only Word Grid candidate dictionary | MIT | <https://github.com/words/an-array-of-english-words> |
| `subtlex-word-frequencies` | `2.0.0` | Build-only spoken-English frequency filter for Word Grid quality | ISC | <https://github.com/words/subtlex-word-frequencies> |

Complete dependency metadata is recorded in `package-lock.json`. Puzzle content has separate provenance requirements documented in `docs/PUZZLE_PROVENANCE.md`.

When a player explicitly creates a public-data puzzle, WTrack discovers related item IDs from an English Wikipedia topic page and requests those items' terms from Wikidata. Wikidata structured data is provided under [CC0-1.0](https://www.wikidata.org/wiki/Wikidata:Licensing), while the source topic page is attributed under [CC BY-SA 4.0](https://en.wikipedia.org/wiki/Wikipedia:Copyrights); its URL, selected QIDs, and retrieval details are stored with the local puzzle payload. Wikimedia is a data source, not an npm dependency or a service required for ordinary play.
