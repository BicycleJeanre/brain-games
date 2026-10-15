# Moving existing progress into Brain Games

Brain Games uses `brain-games-v1`, a versioned IndexedDB database with separate stores for Sudoku, word-game progress, word-puzzle cache, and migration metadata. The legacy `strack-v1` and `wtrack` databases are never deleted or modified by migration.

## Same-device migration

1. Open Brain Games on the same browser profile used for STrack or WTrack.
2. Review the STrack and WTrack session counts on the Brain Games home page.
3. Select **Import existing progress**.
4. Download a combined Brain Games backup.
5. Open each game module and confirm active and completed sessions.

Repeating the import is safe. Existing session IDs are not duplicated, newer updates win, and deletion tombstones prevent stale progress from returning.

## Cloud-to-new-account migration

The legacy Firebase projects and the Brain Games Firebase project are intentionally isolated; Firebase user IDs and passwords are not copied between projects.

1. On a device that can sign into the legacy app, open STrack and WTrack and allow each to finish syncing.
2. Open Brain Games in the same browser profile and import the now-local legacy state.
3. Create or sign into the Brain Games account. The same email address may be used, but it is a separate Firebase account.
4. Open Sudoku and Word Games once while online so both namespaces upload.
5. Sign into Brain Games on the second device and confirm both game families restore.

Keep an exported backup until both devices have been checked. The existing deployments remain available throughout this migration period.
