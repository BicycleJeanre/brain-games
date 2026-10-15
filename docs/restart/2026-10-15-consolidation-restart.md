# Restart: Brain Games consolidation

Status: Deployment candidate in progress
Owner: Jeanre Van Wyk  
Date: 2026-10-15  
Repo: `BicycleJeanre/brain-games`  
Branch: `codex/deploy-brain-games`

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
- No source application or existing production route has been changed or retired.

## Next checkpoint

Finish browser, offline, and base-path verification; merge the deployment pull request; enable GitHub Pages for workflow deployments; run the manual Pages workflow; and record the production run and live cross-device evidence. Keep `/strack/` and `/wtrack/` active.
