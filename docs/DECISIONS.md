# Brain Games decisions

## BG-001 — Product identity

- Status: Approved
- Date: 2026-10-15
- Decision: Name the combined application **Brain Games**.
- Rationale: The product must accommodate puzzles and future entertainment exercises such as speed reading without being limited to one puzzle family.

## BG-002 — Claims boundary

- Status: Approved
- Date: 2026-10-15
- Decision: Position Brain Games strictly as entertainment. Performance metrics describe activity and must not imply cognitive, medical, therapeutic, educational, intelligence, memory, attention, reading, or health improvement.

## BG-003 — Safe consolidation

- Status: Approved
- Date: 2026-10-15
- Decision: Build in a new neutral repository, preserve both source histories, and leave both existing production deployments active until migration and rollback validation is complete.

## BG-004 — Transition architecture

- Status: Provisional
- Date: 2026-10-15
- Decision: Begin with one repository and deployment artifact containing a shared launcher plus scoped Sudoku and Word Games modules, then extract shared services incrementally.
- Exit condition: Replace scoped legacy shells and workers after shared local data, account, settings, backup, and offline services are validated.

## BG-005 — One game library and settings surface

- Status: Approved
- Date: 2026-10-27
- Decision: Present Sudoku, Crosswords, Word Search, Word Grid, and Letter Mix as peers in one Brain Games library. Keep focused game engines modular, but route application-level Games, Progress, profile, appearance, player preferences, and backup controls through the shared shell.
- Rationale: The product should behave as one application rather than two linked legacy families. Domain-specific player controls remain available in the shared Settings page, and game-specific puzzle, training, creation, and help workflows remain inside their focused players.
