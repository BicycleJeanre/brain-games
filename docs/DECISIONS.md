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

## BG-006 — Canonical shell and theme authority

- Status: Approved
- Date: 2026-10-29
- Decision: Render one shared Brain Games header and palette on the home, Sudoku, and word-game routes. Home, Play, Progress, Settings, profile access, theme, timers, and player-instruction visibility are application settings; domain modules may expose only contextual puzzle, training, creation, import, and help tools beneath the canonical shell.
- Rationale: Repeating similar but independently implemented headers and theme preferences still makes navigation feel like separate linked products. A shared component and one canonical settings record keep the application identity stable while preserving modular game engines.

## BG-007 — Wing hints must teach their own vocabulary

- Status: Approved from player feedback
- Date: 2026-10-29
- Decision: When an XY-Wing, XYZ-Wing, or W-Wing hint reveals its pattern, define the technique in plain language, label every reconstructed pattern cell by role on both the grid and the explanation panel, define relational terms such as “sees” and “strong link,” and trace the exact candidate branches to the elimination. Never assign a role such as pivot, wing, or link end unless that role can be derived from the displayed candidates and units.
- Rationale: A technique name and list of coordinates do not teach the rule. In particular, W-Wing has no pivot; grouping all highlighted cells as “pivot and wing cells” is both unclear and wrong.
