# Restart: Brain Games consolidation

Status: Brain Games deployed; legacy routes retained
Owner: Jeanre Van Wyk  
Date: 2026-10-15  
Repo: `BicycleJeanre/brain-games`  
Branch: `codex/unified-experience`

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
- Pull request #1 merged the combined shell/build work into `main` at `34e3144`.
- The shared launcher and both complete game builds are available in one local `/brain-games/` artifact.
- The production dependency audit is clean; 54 inherited unit tests and four desktop/mobile shell tests pass.
- CI verifies the unit suites, combined build, base paths, and shell navigation.
- The versioned `brain-games-v1` schema, previewable idempotent legacy import, and combined backups are implemented; legacy databases are retained.
- Firebase project `brain-games-jvw` exists on Spark with protected free-tier Firestore, Email/Password Authentication, the GitHub Pages domain, and deployed owner-only namespaced rules.
- A disposable production security smoke passed and removed its test users and data.
- Pull request #3 merged as `22229d7`; Pages deployment run `38723638644` succeeded.
- Live desktop/phone cross-device smoke restored representative Sudoku and Word Games sessions, then removed its disposable account and documents.
- The live migration preview detected the owner's existing 30 STrack and 9 WTrack sessions without importing them.
- No source application or existing production route has been changed or retired; `/strack/` and `/wtrack/` remain active.
- The pending unified-experience release removes the inherited product names from the combined UI, adds a common Brain Games header and direct game switcher, exposes cross-game active/completed/average-time progress, and replaces the two module install/offline scopes with the single Brain Games manifest and service worker.

## Next checkpoint

Complete review, merge, deployment, and desktop/phone production verification of `codex/unified-experience`. Then continue shared account/settings/cloud extraction. Keep the previous `/strack/` and `/wtrack/` deployments active until explicit retirement authorization.
