# WTrack user guide

## Starting and resuming

Open **Puzzles** to browse the public catalogue. Filter by **Word searches** or **Crosswords**, and by **Easy**, **Medium**, **Hard**, or **Diabolical**. Opening a puzzle downloads its grid and clues and marks it **Available offline**. WTrack saves progress on the device after every found word or entered crossword letter. Home separates active and completed sessions, and each saved session can be deleted without removing its downloaded puzzle.

Home also offers a daily and a weekly challenge in every difficulty. A challenge uses its own saved session, so playing it never overwrites your ordinary attempt at the same puzzle. Challenge selections remain stable for their UTC day or ISO week. The cards show current-period completion, streak, and average completion time.

## Word searches

Drag from the first letter of a word to its last, or select the two endpoints individually. WTrack accepts straight horizontal, vertical, and diagonal paths in either direction. A correct find remains highlighted and receives a textual **Found** status in the word list.

With a keyboard, focus the grid, move between letters with the arrow keys, and use Enter or Space to select each endpoint.

Choose **Give me a hint** to highlight one cell crossed by a word you have not found. The hint does not mark the word as found. Used hints are saved with the puzzle and remain visible after a restart.

## Crosswords

Select a clue or grid cell and type a letter. The active clue is highlighted. Arrow keys move to the next open cell. Enable **Mark incorrect crossword letters** in Settings if you want immediate feedback; leave it off for traditional unassisted solving.

Choose **Reveal a letter** to fill one unresolved cell in the active clue. If that clue is already solved, WTrack chooses an unresolved cell elsewhere. Revealed letters have a visible outline, and the hint count is saved with progress.

Hint selection runs locally with a bundled deterministic library. It needs no account, network request, paid service, or third-party puzzle feed.

## Settings and readability

Settings auto-save as soon as you change them. Choose a light, dark, or system theme; show or hide the timer, hint controls, and short board instructions; select small, medium, or large grid, clue, and menu text; choose one of four board-highlight palettes; and optionally mark incorrect crossword letters while typing. Hiding hint controls does not remove previously used hints or change saved puzzle progress.

Open **Settings** again to return to the screen you came from. When you open it during a puzzle, **Reset current puzzle** is also available under Storage and offline data. Resetting is confirmed first and clears only that puzzle attempt.

## Creating previews

The Create screen offers three local tools:

- enter one word per line to generate a word search;
- enter `ANSWER | clue` on each line to generate a crossword layout;
- open a personal or licensed iPUZ, PUZ, JPZ, or XD crossword file.

Generation and file parsing happen in the browser. Imported puzzles are marked **Unrated** and their payload stays on this device. Progress can synchronize when signed in, but another device needs the same source file before it can play that private puzzle. Previews and imports are not added to the public catalogue automatically because answers, clue authorship, layout quality, provenance, and redistribution rights require review.

## Offline use

After the production app has loaded once, its shell and catalogue index are cached. WTrack separately stores the ten most recently opened puzzle payloads in IndexedDB. Opening an eleventh removes the least recently opened payload, but never its progress; reconnect and open that puzzle to download it again and resume. Puzzles labelled **Online only** cannot be opened while disconnected.

Your progress and settings are also stored in IndexedDB. Browser storage can be cleared or evicted, so use **Settings → Backup** to download a private JSON backup. **Merge backup** adds sessions missing from the current device and preserves existing progress instead of replacing it. Settings also has independent controls for completed sessions, all saved progress, and offline puzzle payloads.

The header reports **Online** or **Offline** independently from the account-sync state. This makes it clear whether an uncached puzzle can be downloaded even when you are using WTrack without an account.

## Accounts and privacy

An account is optional. When Firebase is configured, email/password sign-in privately syncs progress and preferences under your user ID. Signing in on another browser restores that saved state after synchronization. Core play contains no analytics or advertising and remains available when signed out.
