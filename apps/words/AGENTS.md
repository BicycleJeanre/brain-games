# WTrack Agent Instructions

## Product source of truth

- Read `docs/PRODUCT_BRIEF.md` before planning or implementing product work.
- Keep `README.md` and `docs/USER_GUIDE.md` aligned with implemented behavior.
- Treat `/Users/jay/gr/strack` as the primary reference for Vite/TypeScript PWA conventions, Firebase synchronization, GitHub Pages deployment, offline verification, responsive behavior, and automated testing.
- Treat `/Users/jay/gr/ftrack`, `/Users/jay/gr/gtrack`, and `/Users/jay/gr/strack` as visual-family references. Reuse their formatting language and interaction quality, not domain-specific screens or copied code.

## Licensing and puzzle provenance

- Every bundled or remotely fetched puzzle must have documented provenance and redistribution terms.
- Do not assume that publicly playable crosswords, clues, word lists, or puzzle feeds are redistributable.
- Generated puzzles must record generator/library name and version, input-word provenance, clue authorship, licence, and catalogue version.
- Keep core play independent of live third-party APIs. Review external-library licences and lockfile changes before release.

## Engineering defaults

- Build an original Vite + TypeScript installable PWA, deployable from `/wtrack/` on GitHub Pages.
- The core players, bundled catalogue, saved progress, preferences, and help must work offline.
- Save locally before attempting cloud sync. Use owner-protected Firestore paths for optional signed-in data.
- Use semantic HTML, accessible names, visible focus, keyboard parity, reduced-motion support, and colour-independent state cues.
- Add unit tests for grid validation, word paths, crossword clues, persistence, import/export, and completion; add Playwright coverage for desktop, mobile, offline restart, theme, keyboard play, touch play, and GitHub Pages base paths.

## Git workflow

- Follow the global git-worktree routing skill before file-changing work.
- Use `main` as the protected release branch. Develop substantial changes on focused `codex/*` branches and merge through reviewed pull requests.
- Never commit credentials, private puzzle collections, copyrighted clue banks without permission, or generated browser artifacts.
