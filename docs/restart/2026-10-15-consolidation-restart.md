# Restart: Brain Games consolidation

Status: Unified Brain Games deployed; sync-performance release live; legacy routes retired
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
- Pull request #8 merged the final visible-label cleanup as `b6fb214`; Pages run `38727973803` is the current successful production deployment.
- Pull request #10 merged the navigation/settings release as `699010f`; Pages run `38729817602` deployed it successfully. It replaces the root page's scrolling anchors with mutually exclusive Home, Play, Progress, and Settings views, preserves browser back/forward behavior, adds persistent system/light/dark shell themes, moves combined backup and migration into Settings, and deep-links into the complete Sudoku and word-game preference screens. The Sudoku module now labels its settings control explicitly instead of using an ellipsis.
- Live verification loaded the deployed Settings deep link and returned to Home as separate views. A browser carrying the previous root worker upgraded after two refreshes. The live migration preview still detected 31 previous Sudoku and 9 previous word-game sessions without importing them; legacy deployments remain untouched.
- Pull request #12 merged the unified profile release as `f48c9f6`; Pages run `38734360809` deployed it successfully. The shared Settings screen now owns profile creation, sign-in, password reset, sign-out, and header status. In the combined app, Sudoku and word-game settings consume the same Firebase session and link back to the shared profile manager instead of presenting duplicate account forms.
- The required check passed all 54 inherited unit tests, nine shell journeys, the combined build and base-path checks, and a targeted Authentication-emulator journey proving that a profile created once is recognized by the shell and both modules.
- Live verification confirmed one account form at `/?view=settings`, no duplicate account form in either game module, and a shared “Manage Brain Games profile” route from both Sudoku and word-game settings. The live root service worker upgraded after two refreshes. Existing `/strack/` and `/wtrack/` deployments remain unchanged.
- On 2026-10-27, pull request #29 merged the sync-performance release as `13bb7a0`. IndexedDB and Firestore now store games/sessions independently, rapid edits are coalesced with bounded concurrency, Sudoku cloud payloads omit local-only undo/hint history, and input paints before local persistence finishes.
- Firestore rules and indexes were deployed to `brain-games-jvw` before Pages workflow run `40468890132`. The required check passed all local, security-rule, profile, and two-device emulator suites. A disposable live desktop/phone account verified shared sign-in and resume in both game families with no horizontal overflow, then its documents and account were removed.

## Next checkpoint

Have the owner confirm the faster number-entry feel and current-game propagation on a physical phone and second device using the owner account. If either still lags, capture the game count, connection type, and approximate delay; the release now exposes independent records and bounded queues, making the remaining path diagnosable without rewriting full history.
