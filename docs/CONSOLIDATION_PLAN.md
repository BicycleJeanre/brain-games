# Brain Games consolidation plan

Status: In progress  
Owner: Jeanre Van Wyk  
Started: 2026-10-15

## Source baselines

- STrack: `BicycleJeanre/strack` at `3c4a960` imported under `apps/sudoku/` with history preserved.
- WTrack: `BicycleJeanre/wtrack` at `a7af2c9` imported under `apps/words/` with history preserved.
- Destination: `BicycleJeanre/brain-games`.
- Existing production routes remain active and are not authorized for retirement yet.

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
- [ ] Consolidate theme tokens, header, footer, update messaging, and responsive shell.
- [ ] Establish Play, Train, Learn, Progress, and Library routes.
- [x] Add shell-level accessibility and mobile tests.

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
- [ ] Migrate test accounts and representative state first.
- [ ] Validate one account across phone and desktop before production cutover.

### Stage 5 — Shared services

- [ ] Replace duplicate settings, authentication, cloud, backup, challenge summary, and progress implementations.
- [ ] Consolidate service workers and update behavior.
- [ ] Lazy-load HoDoKu and word-generation/parser dependencies.
- [ ] Retain domain-specific rules, hints, catalogues, provenance, and tests.

### Stage 6 — Production and retirement

- [x] Deploy compatible cloud rules before the client.
- [ ] Deploy Brain Games without redirecting legacy routes.
- [ ] Run fresh-profile, installed-PWA, offline, migration, and cross-device smoke tests.
- [ ] Add migration notices to STrack and WTrack only after Brain Games is accepted.
- [ ] Record explicit retirement authorization before replacing either legacy application with a redirect.

## Rollback rule

Until Stage 6 is explicitly accepted, STrack and WTrack remain the production rollback sources. Brain Games must not delete legacy local databases, overwrite legacy cloud projects, or repurpose their Pages routes.
