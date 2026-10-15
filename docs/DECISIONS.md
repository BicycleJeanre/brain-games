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
