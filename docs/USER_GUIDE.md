# WTrack user guide

## Starting and resuming

Open **Puzzles** to browse the 100-puzzle public catalogue. Filter by **Word searches** or **Crosswords**, and by **Easy**, **Medium**, **Hard**, or **Diabolical**. Choose a puzzle and select **Start**. WTrack saves progress on the device after every found word or entered crossword letter. Started puzzles appear on Home for quick resume.

## Word searches

Drag from the first letter of a word to its last, or select the two endpoints individually. WTrack accepts straight horizontal, vertical, and diagonal paths in either direction. A correct find remains highlighted and receives a textual **Found** status in the word list.

With a keyboard, focus the grid, move between letters with the arrow keys, and use Enter or Space to select each endpoint.

Choose **Give me a hint** to highlight one cell crossed by a word you have not found. The hint does not mark the word as found. Used hints are saved with the puzzle and remain visible after a restart.

## Crosswords

Select a clue or grid cell and type a letter. The active clue is highlighted. Arrow keys move to the next open cell. Enable **Mark incorrect crossword letters** in Settings if you want immediate feedback; leave it off for traditional unassisted solving.

Choose **Reveal a letter** to fill one unresolved cell in the active clue. If that clue is already solved, WTrack chooses an unresolved cell elsewhere. Revealed letters have a visible outline, and the hint count is saved with progress.

Hint selection runs locally with a bundled deterministic library. It needs no account, network request, paid service, or third-party puzzle feed.

## Creating previews

The Create screen offers two local tools:

- enter one word per line to generate a word search;
- enter `ANSWER | clue` on each line to generate a crossword layout.

Generation happens in the browser. Previews are not added to the public catalogue automatically because answers, clue authorship, layout quality, provenance, and redistribution rights require review.

## Offline use

After the production app has loaded once, its shell and bundled catalogue are cached. Your current progress and settings are stored in IndexedDB. Browser storage can be cleared or evicted, so use **Settings → Device backup** to download a private JSON backup and restore it later on any WTrack installation.

## Accounts and privacy

An account is optional. When Firebase is configured, email/password sign-in privately syncs progress and preferences under your user ID. Signing in on another browser restores that saved state after synchronization. Core play contains no analytics or advertising and remains available when signed out.
