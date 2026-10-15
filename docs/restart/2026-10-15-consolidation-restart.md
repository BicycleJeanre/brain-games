# Restart: Brain Games consolidation

Status: Active  
Owner: Jeanre Van Wyk  
Date: 2026-10-15  
Repo: `BicycleJeanre/brain-games`  
Branch: `codex/unified-shell`

## Purpose

Combine STrack and WTrack into Brain Games without risking either live application or losing local/cloud progress.

## Read first

1. `AGENTS.md`
2. `docs/PRODUCT_BRIEF.md`
3. `docs/CONSOLIDATION_PLAN.md`
4. `docs/DECISIONS.md`

## Current state

- New public destination repository exists.
- STrack and WTrack histories are preserved under `apps/sudoku/` and `apps/words/`.
- Foundation `main` is pushed.
- Combined shell/build work belongs to `codex/unified-shell`.
- The shared launcher and both complete game builds are available in one local `/brain-games/` artifact.
- The production dependency audit is clean; 54 inherited unit tests and four desktop/mobile shell tests pass.
- CI verifies the unit suites, combined build, base paths, and shell navigation.
- No source application, Firebase project, or production route has been changed or retired.

## Next checkpoint

Review and merge the Stage 1 pull request. Next, design the versioned shared local schema and an idempotent preview/import flow for `strack-v1` and `wtrack`. Do not deploy production or create the neutral Firebase project until the transition artifact and migration schema have been reviewed.
