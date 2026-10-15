# Brain Games deployment and route inventory

## Active routes

| Route | Owner | Source | Status | Retirement decision |
| --- | --- | --- | --- | --- |
| `https://bicyclejeanre.github.io/brain-games/` | Jeanre Van Wyk | `BicycleJeanre/brain-games`, `main` | Live production | None |
| `https://bicyclejeanre.github.io/strack/` | Jeanre Van Wyk | `BicycleJeanre/strack` | Retained production rollback | Must remain active until explicit authorization |
| `https://bicyclejeanre.github.io/wtrack/` | Jeanre Van Wyk | `BicycleJeanre/wtrack` | Retained production rollback | Must remain active until explicit authorization |

First recorded: 2026-10-15.

## Release order

1. Merge a reviewed Brain Games release pull request into `main`.
2. Confirm the required `Check` workflow succeeds.
3. Deploy `firestore.rules` and `firestore.indexes.json` to `brain-games-jvw` before any matching client release.
4. Run the manual **Deploy to GitHub Pages** workflow from `main`.
5. Verify the launcher, both module routes, migration preview/import, sign-in, cross-device sync, and offline restart.
6. Record the merge commit, workflow run, live verification, and rollback state in this file and the restart note.

## Rollback

- A Brain Games client rollback redeploys the previously accepted `main` commit through the Pages workflow.
- The new client never deletes `strack-v1` or `wtrack`; those databases remain local recovery sources.
- STrack and WTrack keep their independent Pages routes and Firebase projects. A Brain Games rollback does not require changing either legacy deployment.
- Firestore rules may be rolled back only to a previously compiled Brain Games ruleset that retains owner isolation for all active client paths.

## Production record

- Firebase project: `brain-games-jvw` (Spark, no-cost, no billing account intended).
- Firestore: `(default)`, `nam5`, Standard edition, free tier, deletion protection enabled.
- Authentication: Email/Password enabled; `bicyclejeanre.github.io` authorized.
- Cloud paths: `users/{uid}/sudokuGames/{id}`, `users/{uid}/sudokuMeta/settings`, and `users/{uid}/wordState/app`.
- 2026-10-15 security smoke: disposable owner write/read succeeded; cross-user and unauthenticated reads were denied; disposable documents and accounts were removed.
- Release pull request: [#3](https://github.com/BicycleJeanre/brain-games/pull/3), merged as `22229d7`.
- Pages deployment: [workflow run 38723638644](https://github.com/BicycleJeanre/brain-games/actions/runs/38723638644), successful on 2026-10-15.
- Live release: `https://bicyclejeanre.github.io/brain-games/`.
- Live verification: launcher and both module routes loaded; the existing-browser migration preview detected 30 STrack and 9 WTrack sessions without importing them.
- Cross-device verification: a disposable account restored one Sudoku session and one Word Games session between isolated desktop and phone-sized touch profiles. Horizontal overflow was zero; the account and its test documents were removed.
- Offline verification: the production artifact passed a real server-stop relaunch of the shell and both visited module scopes before deployment. A physical installed-PWA check remains an acceptance follow-up.
- Unified-experience pull request: [#5](https://github.com/BicycleJeanre/brain-games/pull/5), merged as `3668ffa`.
- Unified-experience deployment: [workflow run 38726394578](https://github.com/BicycleJeanre/brain-games/actions/runs/38726394578), successful on 2026-10-15.
- Module-worker migration pull request: [#6](https://github.com/BicycleJeanre/brain-games/pull/6), merged as `98a2e0a` after the required check passed.
- Current Pages deployment: [workflow run 38727174990](https://github.com/BicycleJeanre/brain-games/actions/runs/38727174990), successful on 2026-10-15.
- Current live verification: the Brain Games home, shared Progress dashboard, Sudoku route, and Word games route loaded with no inherited product branding. The direct game switcher worked in both directions. A browser already controlled by the former Sudoku worker consumed its retirement worker and reopened under the root Brain Games scope. Desktop and 390×844 phone layouts had no observed horizontal overflow.
- Rollback verification: `https://bicyclejeanre.github.io/strack/` and `https://bicyclejeanre.github.io/wtrack/` both continued to return HTTP 200 after the Brain Games release.
- Final visible-label cleanup: [pull request #8](https://github.com/BicycleJeanre/brain-games/pull/8), merged as `b6fb214`; user-facing domain backup filenames and expanded word-puzzle provenance now use Brain Games terminology while legacy format identifiers and source URLs remain compatible.
- Current final Pages deployment: [workflow run 38727973803](https://github.com/BicycleJeanre/brain-games/actions/runs/38727973803), successful on 2026-10-15 after its build and full test jobs passed.
- App-navigation and settings release: [pull request #10](https://github.com/BicycleJeanre/brain-games/pull/10), merged as `699010f`. The root shell now uses mutually exclusive Home, Play, Progress, and Settings views with browser history; Settings owns the shared theme, combined backup, migration, and game-preference discovery surface.
- Current Pages deployment: [workflow run 38729817602](https://github.com/BicycleJeanre/brain-games/actions/runs/38729817602), successful on 2026-10-15 after the shared and inherited tests and combined build passed.
- Live navigation verification: a previously open browser consumed the new root worker after two refreshes, loaded the Settings deep link, returned to Home without page scrolling, exposed direct Sudoku and word-game settings links, and retained the detected 31 previous Sudoku and 9 previous word-game sessions without importing them. The independent `/strack/` and `/wtrack/` deployments were not changed.
- Unified-profile release: [pull request #12](https://github.com/BicycleJeanre/brain-games/pull/12), merged as `f48c9f6`. The root Settings page is the single account-management surface for profile creation, sign-in, password reset, and sign-out; both game modules consume that Firebase Authentication session and route account management back to the root.
- Current Pages deployment: [workflow run 38734360809](https://github.com/BicycleJeanre/brain-games/actions/runs/38734360809), successful on 2026-10-15 after the required check passed.
- Unified-profile verification: the Authentication-emulator journey created one profile in the shell and observed the same signed-in email in Sudoku and word games. Live production showed the single root account form and no duplicate game-level forms. Existing-browser service-worker activation required two refreshes; the independent `/strack/` and `/wtrack/` deployments were not changed.
