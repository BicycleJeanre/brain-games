# Brain Games Agent Instructions

## Product source of truth

- Read `docs/PRODUCT_BRIEF.md` and `docs/CONSOLIDATION_PLAN.md` before product work.
- Keep `README.md`, user-facing help, and migration documentation aligned with implemented behavior.
- Treat `/Users/jay/gr/strack` and `/Users/jay/gr/wtrack` as source applications until their explicit retirement.

## Product boundary

- Brain Games is an entertainment application. Do not make medical, therapeutic, educational-outcome, intelligence, cognition, memory-improvement, attention-improvement, or reading-improvement claims.
- Performance metrics describe recorded activity only.

## Engineering defaults

- Build an original Vite + TypeScript installable PWA deployable from `/brain-games/` on GitHub Pages.
- Preserve STrack and WTrack user data through versioned local, backup, and cloud migrations.
- Keep puzzle families modular and lazy-loaded behind one shared shell, account, settings, progress, and offline layer.
- Develop substantial changes on focused `codex/*` branches and merge through reviewed pull requests.
- Do not modify or retire the existing STrack or WTrack deployments until the combined application has passed migration and production validation.
