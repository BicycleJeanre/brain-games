# WTrack user guide

## Starting and resuming

Open **Puzzles** to browse the public catalogue. Filter by **Word searches**, **Crosswords**, or **Word Grids**, and by **Easy**, **Medium**, **Hard**, or **Diabolical**. Opening a puzzle downloads its compact payload and marks it **Available offline**. WTrack saves progress after every meaningful move. Home separates active and completed sessions, and each saved session can be deleted without removing its downloaded puzzle.

Home also offers a daily and a weekly challenge in every difficulty. A challenge uses its own saved session, so playing it never overwrites your ordinary attempt at the same puzzle. Challenge selections remain stable for their UTC day or ISO week. The cards show current-period completion, streak, and average completion time.

## Word searches

Drag from the first letter of a word to its last, or select the two endpoints individually. WTrack accepts straight horizontal, vertical, and diagonal paths in either direction. A correct find remains highlighted and receives a textual **Found** status in the word list.

With a keyboard, focus the grid, move between letters with the arrow keys, and use Enter or Space to select each endpoint.

Choose **Give me a hint** to highlight one cell crossed by a word you have not found. The hint does not mark the word as found. Used hints are saved with the puzzle and remain visible after a restart.

## Crosswords

Select a clue or grid cell and type a letter. The active clue is highlighted. After each letter, focus moves to the next empty cell in that clue and skips crossing letters that are already filled. Arrow keys still move one open grid cell at a time. Enable **Mark incorrect crossword letters** in Settings if you want immediate feedback; leave it off for traditional unassisted solving.

Choose **Reveal a letter** to fill one unresolved cell in the active clue. If that clue is already solved, WTrack chooses an unresolved cell elsewhere. Revealed letters have a visible outline, and the hint count is saved with progress.

Hint selection runs locally with a bundled deterministic library. It needs no account, network request, paid service, or third-party puzzle feed.

## Word Grid

Trace through adjacent letters horizontally, vertically, or diagonally. A tile cannot be used twice in one word, and accepted words have at least three letters. You can drag through a path or tap its letters in order, then choose **Submit word**. With a keyboard, use arrow keys to move focus and Enter or Space to add a tile.

The **Round words** checklist is a fixed set of words verified to exist in that grid: 8 on Easy, 10 on Medium, 12 on Hard, or 15 on Diabolical. Each answer appears as blank character slots grouped by length. Finding a target replaces its slots with the letters and updates the found count. Words of 3–4 letters score 1 point, 5 score 2, 6 score 3, 7 score 5, and 8 or more score 11. Find every listed target to complete the round. Other dictionary-valid traces are saved as bonus words and award the same length-based points, but they do not replace a missing target. **Show a starting path** highlights the first two tiles of one remaining target and reports its length and value without revealing the answer.

## Settings and readability

Settings auto-save as soon as you change them. Choose a light, dark, or system theme; show or hide the timer, hint controls, and short board instructions; select small, medium, or large grid, clue, and menu text; choose one of four board-highlight palettes; and optionally mark incorrect crossword letters while typing. Hiding hint controls does not remove previously used hints or change saved puzzle progress.

Open **Settings** again to return to the screen you came from. When you open it during a puzzle, **Reset current puzzle** is also available under Storage and offline data. Resetting is confirmed first and clears only that puzzle attempt.

## Creating and importing puzzles

The first Create card can make a complete playable puzzle from a topic:

1. Enter an English Wikipedia topic-page title such as **astronomy**.
2. Choose **Word search** or **Crossword** and a friendly difficulty profile.
3. Choose **Create public-data puzzle** while online.

That button requests linked item IDs from the matching English Wikipedia page, then asks Wikidata for the selected items' English CC0 labels and descriptions. WTrack builds the layout in the browser, records the source page, selected QIDs, retrieval time, licences, generator versions, and selection seed, and stores the complete puzzle in the same ten-item offline cache used by catalogue puzzles. Reopening and playing it needs no Wikimedia connection. Difficulty profiles affect term selection, answer count, grid size, directions, and reversals; they are useful relative settings rather than universal ratings.

The Create screen also offers three local tools:

- enter one word per line to generate a word search;
- enter `ANSWER | clue` on each line to generate a crossword layout;
- open a personal or licensed iPUZ, PUZ, JPZ, or XD crossword file.

Generation and file parsing happen in the browser. Imported puzzles are marked **Unrated** and their payload stays on this device. Public-data and imported puzzle payloads do not synchronize: progress can synchronize when signed in, but another device must generate again or use the same source file before it can play that private puzzle. Generated puzzles, previews, and imports are not added to the public catalogue automatically because answers, clue authorship, layout quality, provenance, and redistribution rights require review.

## Offline use

After the production app has loaded once, its shell and catalogue index are cached. WTrack separately stores the ten most recently opened or generated puzzle payloads in IndexedDB. Opening or generating an eleventh removes the least recently opened payload, but never its progress. Catalogue puzzles can be downloaded again; a removed private generated/imported payload must be generated or imported again. Puzzles labelled **Online only** cannot be opened while disconnected.

Your progress and settings are also stored in IndexedDB. Browser storage can be cleared or evicted, so use **Settings → Backup** to download a private JSON backup. **Merge backup** adds sessions missing from the current device and preserves existing progress instead of replacing it. Settings also has independent controls for completed sessions, all saved progress, and offline puzzle payloads.

The header reports **Online** or **Offline** independently from the account-sync state. This makes it clear whether an uncached puzzle can be downloaded even when you are using WTrack without an account.

## Accounts and privacy

An account is optional. When Firebase is configured, email/password sign-in privately syncs progress and preferences under your user ID. Signing in on another browser restores that saved state after synchronization. Core play contains no analytics or advertising and remains available when signed out.
