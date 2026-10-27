# Brain Games consolidation plan

Status: In progress  
Owner: Jeanre Van Wyk  
Started: 2026-10-15

## Source baselines

- STrack: `BicycleJeanre/strack` at `3c4a960` imported under `apps/sudoku/` with history preserved.
- WTrack: `BicycleJeanre/wtrack` at `a7af2c9` imported under `apps/words/` with history preserved.
- Destination: `BicycleJeanre/brain-games`.
- The owner explicitly authorized retirement of both standalone repositories and deployments on 2026-10-27. Their exact final releases and branch tips are preserved in Brain Games archive tags.

## Approved core decisions

- Product name: **Brain Games**.
- Positioning: entertainment games only; no cognitive, medical, therapeutic, health, intelligence, or improvement claims.
- Destination route: `/brain-games/` on the existing `bicyclejeanre.github.io` origin.
- Preserve both repository histories and both live applications until migration validation is complete.
- Use one shared shell and progressively extract shared account, settings, persistence, backup, progress, challenge, and offline services.
- Keep game engines and game-specific state models modular rather than forcing every activity into one generic model.

## Provisional technical decisions

- Transition milestone: one build artifact containing a Brain Games launcher plus scoped Sudoku and Word Games modules.
- Create a new neutral Firebase project rather than making either legacy project the permanent owner.
- Prefer namespaced Firestore data beneath one user, with separate Sudoku games, word sessions, shared settings, and domain settings.
- Preserve legacy IndexedDB databases until the user explicitly confirms migration and independently exports a backup.

## Delivery stages

### Stage 1 — Repository and combined build

- [x] Create the public destination repository.
- [x] Import both complete histories beneath domain module paths.
- [x] Add the shared Brain Games shell and combined build orchestration.
- [x] Add CI for the shell and both inherited unit/build suites.
- [x] Produce one local `/brain-games/` artifact without changing production.

### Stage 2 — Shared navigation and presentation

- [x] Add consistent Brain Games navigation inside both modules.
- [x] Replace inherited app identities with one Brain Games header, game switcher, footer language, and responsive shell navigation.
- [ ] Consolidate all remaining domain-specific theme tokens and update messaging.
- [ ] Establish Play, Train, Learn, Progress, and Library routes.
- [x] Add shell-level accessibility and mobile tests.
- [x] Add a cross-game Progress dashboard for active sessions, completions, and recorded average times.
- [x] Replace the scrolling launcher anchors with distinct Home, Play, Progress, and Settings views, including browser history and direct settings deep links.
- [x] Replace separate Sudoku and Word Games family cards with one first-class game list for Sudoku, Crosswords, Word Search, Word Grid, and Letter Mix.
- [x] Consolidate player preferences into the shared Settings surface and redirect older module settings links to it.

### Stage 3 — Local persistence and backups

- [x] Define a versioned Brain Games local schema.
- [x] Detect `strack-v1` and `wtrack` IndexedDB databases.
- [x] Preview and import legacy state idempotently.
- [x] Define a combined backup envelope and accept both legacy formats.
- [x] Keep legacy databases intact through a documented rollback period.

### Stage 4 — Accounts and cloud data

- [x] Create and document the neutral Firebase project.
- [x] Define and test owner-only namespaced Firestore rules.
- [x] Resolve duplicate emails and legacy UID mappings.
- [x] Migrate test accounts and representative state first.
- [x] Validate one account across phone and desktop before production cutover.
- [x] Move sign-in, profile creation, password reset, and sign-out into one shared Brain Games profile surface used by every module.

### Stage 5 — Shared services

- [x] Use one Brain Games local database, combined backup surface, and cross-game progress summary.
- [ ] Replace the remaining game-specific cloud-data and challenge implementations; the shared shell now owns authentication/profile state, top-level appearance, backup, migration, and settings discovery.
- [x] Consolidate installation and offline caching under one Brain Games manifest and service worker, with self-retiring compatibility workers for browsers that previously installed a module scope.
- [ ] Lazy-load HoDoKu and word-generation/parser dependencies.
- [ ] Retain domain-specific rules, hints, catalogues, provenance, and tests.

### Stage 6 — Production and retirement

- [x] Deploy compatible cloud rules before the client.
- [x] Deploy Brain Games without redirecting legacy routes.
- [ ] Run fresh-profile, installed-PWA, offline, migration, and cross-device smoke tests.
- [x] Retire the standalone repositories instead of adding interim migration notices or redirects.
- [x] Record explicit retirement authorization before removing either legacy application (authorized 2026-10-27).

## Rollback rule

Brain Games is now the sole source and deployment. Client rollback uses an earlier accepted Brain Games release. The final legacy release commits remain reachable as `legacy-strack-final-2026-10-27` and `legacy-wtrack-final-2026-10-27`, and every retained local or remote branch tip is preserved below `archive/strack/*` or `archive/wtrack/*`. Retirement does not delete the browser's legacy `strack-v1` or `wtrack` IndexedDB databases, so migration and recovery remain available.
