# Restart: Brain Games consolidation

Status: Unified Brain Games experience deployed; legacy routes retained
Owner: Jeanre Van Wyk  
Date: 2026-10-15  
Repo: `BicycleJeanre/brain-games`  
Branch: `main`

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
- Pull request #5 merged the unified experience as `3668ffa`; pull request #6 merged the module-worker migration as `98a2e0a`; Pages run `38727174990` deployed the final package.
- The combined UI uses one Brain Games identity, direct Sudoku/Word games switcher, cross-game Progress dashboard, combined local database and backup, and one root manifest/service worker. Tiny self-retiring compatibility workers remain only at the former module worker URLs for browsers upgrading from the transition release.
- Live desktop and 390×844 phone checks passed for the shell and both modules. A browser with the former Sudoku worker upgraded successfully. Both independent legacy production routes still return HTTP 200 and remain rollback sources.
- User-facing backup filenames and expanded puzzle provenance use Brain Games/Sudoku/word-games terminology; legacy format identifiers and original source URLs remain compatible and traceable internally.

## Next checkpoint

Have the owner import the detected real-device progress, download a combined backup, and review the installed PWA on a physical PC and phone. Then continue shared account/settings/cloud extraction. Keep the previous `/strack/` and `/wtrack/` deployments active until explicit retirement authorization.
