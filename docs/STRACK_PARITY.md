# STrack parity review

Last reviewed: 2026-10-13

WTrack follows STrack's reusable product and engineering conventions while retaining a word-puzzle-specific model. Parity means equivalent quality and user guarantees, not copying Sudoku-only controls into a different game.

## Shared parity now present

| Area | WTrack implementation |
| --- | --- |
| Visual family | Shared charcoal/cyan language, dense but readable cards, light/dark/system themes, visible focus, reduced-motion behavior, and phone/landscape layouts. |
| Settings | Auto-saving theme, timer, hint/help visibility, grid/clue/menu sizing, four highlight palettes, crossword correctness assistance, backup, scoped storage controls, and contextual current-puzzle reset. Older preference documents migrate to defaults. |
| Local-first play | Every meaningful move saves to IndexedDB before optional cloud work. Startup and play do not wait for Firebase. |
| Offline PWA | App shell, help, catalogue metadata, settings, progress, and the ten most recently opened puzzle payloads restart after the serving origin is unavailable. |
| Connectivity clarity | The header reports browser connectivity separately from device-only or signed-in cloud state. |
| Challenges | Deterministic daily and weekly selections for Easy, Medium, Hard, and Diabolical, with separate sessions, streaks, completion, and average-time summaries. |
| History and deletion | Home separates active and completed sessions. Individual deletion and scoped bulk controls use tombstones that participate in cloud reconciliation. |
| Backup safety | JSON import is a non-destructive merge: missing sessions are added while current sessions and explicit deletions remain authoritative. |
| Private cloud state | Optional Email/Password sign-in and owner-only Firestore rules with a bounded top-level schema; local state stays authoritative while offline. |
| External puzzle entry | Browser-local generators plus private iPUZ, PUZ, JPZ, and XD import. Imports are Unrated and never enter the public catalogue automatically. |
| Input and accessibility | Keyboard, pointer, and touch play; semantic grids and names; visible focus; colour-independent states; reduced-motion handling. |
| Release evidence | Node unit tests, Chromium, mobile Chromium, WebKit, base-path verification, true server-stop offline restart, catalogue integrity, Firestore rules, and a two-browser cloud journey. |

## Deliberate WTrack adaptations

- WTrack keeps no more than ten full puzzle payloads offline at once, as required for this product. STrack's smaller fixed catalogue can ship all of its puzzle data in the app.
- WTrack hints use word-search and crossword semantics rather than Sudoku solving techniques. They run locally, persist, and never require a paid service.
- Private crossword files do not receive share links. Unlike a typed Sudoku position, a crossword can contain copyrighted clues and answers; its payload stays local unless provenance and redistribution rights are reviewed.
- STrack's notes, candidates, colouring, lines, undo/redo, and training curriculum are Sudoku-domain tools. Their direct controls are not useful parity targets for word searches and crosswords.
- WTrack currently syncs one bounded application document per owner rather than STrack's per-game documents. This remains safe and owner-protected; per-session documents are a future scale option, not a release-one behavior gap.

## Product authority

WTrack's product brief, provenance policy, two player models, and ten-puzzle cache remain authoritative when they differ from STrack. New shared-family behavior should be evaluated here first, then implemented only when it improves a corresponding WTrack journey.
