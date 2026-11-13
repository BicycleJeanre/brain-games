# Sudoku strategy checklist release restart note

## Released state

- Production source: `main` at `7d93772afec90b018fab0f52853db40a203a074f`
- Feature pull request: [#44](https://github.com/BicycleJeanre/brain-games/pull/44)
- Required main check: [43428963884](https://github.com/BicycleJeanre/brain-games/actions/runs/43428963884), successful
- Production Pages deployment: [43429416940](https://github.com/BicycleJeanre/brain-games/actions/runs/43429416940), successful
- Firebase project: `brain-games-jvw`; rules compiled and were already current, and indexes deployed successfully before the client release

## Live acceptance

- The canonical Brain Games Settings page shows the optional **Strategy checklist** preference.
- An active Sudoku puzzle shows 21 techniques in beginner-to-advanced curriculum order and a training action for every row when the preference is enabled.
- The Naked single training action opened the correct lesson, and **Back to puzzle** returned to the active grid.
- The temporary production verification preference was restored to its original off state.

## Rollback

Redeploy the previously accepted `main` commit `3f52c408347a90804e86ad9e4d5c4cfabbd874c6` through the manual Pages workflow. No Firestore rollback is required because the released production rules content was unchanged.
