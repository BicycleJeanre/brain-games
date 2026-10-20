# STrack user guide

## Start and resume

The home screen offers **Daily challenges** and **Weekly challenges**, each with one puzzle in Easy, Medium, Hard, and Diabolical. Daily selections change at midnight UTC; weekly selections use the ISO week. The choice is deterministic, so every player sees the same challenge from the bundled offline catalogue during that period. A weekly puzzle stays fixed from Monday through Sunday and is not reused by any daily slot in that week. Today’s four daily puzzles and the four current weekly puzzles are also reserved from regular quick-start, next-puzzle, and Surprise me selection. A challenge always creates or resumes its own session instead of converting an unfinished regular game. If you already started or completed it, its card shows that status and opens the same saved game. After completing a challenge, the completion button advances to the next difficulty in that same day or week; after Diabolical, it returns to the challenge summary. Signed-in sessions therefore continue naturally between a PC and phone.

The challenge summary tracks how many of the current four puzzles you completed, your total challenge solves, and your average completed solve time separately for daily and weekly challenges. A streak advances when you complete at least one challenge in consecutive UTC days or ISO weeks. It remains visible during the next day or week before you have completed that period's first challenge, then resets when a full period is missed. Tracking begins when a puzzle is opened from a challenge card; older ordinary games are not retroactively counted.

Home also keeps recent games on this device. If a puzzle is in progress, **Resume puzzle** returns to it. The library filters all 80 bundled puzzles by friendly band, exact SE range, and local progress.

Every bundled puzzle works offline after the first successful production load. The status above the home title says whether the browser is online; it does not affect core play.

## Technique training

Open **Train** to follow a 21-technique curriculum from singles to expert forcing logic. It includes naked and hidden singles; locked candidates; naked pairs and triples; X-Wing, Swordfish, and Jellyfish; Skyscraper, two-string kite, and Empty Rectangle; XY-, XYZ-, and W-Wings; simple coloring; X-Chains, XY-Chains, and alternating inference chains; unique rectangles; ALS-XZ; and forcing chains.

The **Curriculum filters** at the bottom are interactive. Choose a family such as **Wings** or **Coloring & chains** to show only those lesson cards; the page returns to the filtered lesson list automatically. Choose the active family again or select **Show all techniques** to restore the complete curriculum.

Every lesson uses a compact position from HoDoKu2's official regression or exemplar library, pinned to a specific upstream commit. STrack rebuilds the candidate state from the original HoDoKu record and asks the local HoDoKu engine for that exact technique before showing the exercise. The Learn step translates the engine result into grid-specific reasoning with named cells, units, branches, and conclusions instead of exposing HoDoKu's compact notation. The source link below each board opens the precise upstream record. Chain diagrams use HoDoKu's structured links: solid for strong links and dashed for weak links. The records and engine are bundled, so training works offline.

In the puzzle grid, double-click or double-tap an empty cell containing exactly one centre note to promote that note to the full digit. The action clears both note types in the cell, cleans the digit from peer notes when candidate cleanup is enabled, and can be undone normally. Cells with no centre notes or more than one centre note are left unchanged.

Every available lesson uses a genuine position derived from the bundled, documented puzzle catalogue and has four stages:

1. **Learn** explains the pattern on a fully marked worked example. For advanced chains, the link path is drawn directly on the grid.
2. **Find** opens a different HoDoKu-verified position, removes the answer markings, and asks you to select the cells that make the pattern. **Show a clue** identifies those cells without revealing the candidate deduction.
3. **Deduce** asks you to choose the candidate to place or eliminate. **Show the answer** is an explicit fallback and never changes a puzzle.
4. **Complete** records the session and offers repetition or the next technique.

Three independent completions with at least two-thirds independent accuracy mark a technique as mastered. Assisted completions still count as explored practice. Training progress saves to IndexedDB, is included in JSON backups, and synchronizes between signed-in devices with preferences.

Every technique has one worked example and four different HoDoKu-verified practice positions. The exercise counter shows which position is active. After completing one, choose **Practice another position** to move directly to the next grid; reopening the lesson also resumes with the next exercise based on your completion count.

## Enter digits, notes, and colours

Select a cell, choose an entry mode, then choose a number:

- **Digit** enters an answer.
- **Corner** stores short Snyder-style marks in the top-left corner, using the warm note colour. The marks stay on one line until they need to wrap.
- **Centre** stores a high-contrast candidate list in the middle: near-white on the dark board and near-black on the light board. It wraps only when necessary and is cleared when the cell receives an answer.
- **Colour** applies one of nine cell shades. Each coloured cell also has a bordered dot, so the state is not conveyed by colour alone.

Turn on **Multi-select** to add or remove individual cells from the selection. On a keyboard, Shift + arrow extends the selection; Shift-, Ctrl-, or Command-click also adds or removes a cell. An entry or clear action applies to every selected editable cell.

Given cells cannot be changed. If **Clean notes after entry** is on, entering a final digit removes it from corner and centre notes in peer cells.

Entering a final digit clears both corner and centre notes from that cell, because both note types describe an unanswered cell.

When several cells are selected, entering a digit from normal **Digit** mode defaults to corner notation across those cells. Explicit **Corner** and **Centre** modes keep their usual behavior.

Multi-cell notes use one selection-wide toggle: if any selected cell is missing the digit, STrack adds it to every selected cell. A second press removes it from every selected cell only once all of them contain it. Mixed selections therefore converge instead of swapping notes between cells.

**Calculate all candidates** removes corner notes and writes the candidates currently allowed by each empty editable cell's row, column, box, and recorded eliminations as centre notes. The entire calculation is one undoable action.

The number buttons use a 3×3 keypad. The most recently entered digit stays active and highlights matching placed values in the grid. Note digits are enlarged on phone screens. Matching corner, centre, and automatic candidate notes keep their original warm or neutral text color and become slightly larger and bold, without a circle around the digit. Every matching cell uses the same highlight shade, whether the match is a placed value or a note. Turn on **Highlight values** to deselect cells and make keypad digits toggle independently, allowing several values to be highlighted together without changing the puzzle. Choose **Any digit · OR** to find cells containing at least one selected note, or **All digits · AND** to focus only on note cells containing every selected digit. Clicking blank space outside the grid and buttons clears the cell selection, highlight mode, and every active value highlight.

Colour and line controls include three levels of cleanup: selected cell colours, every instance of one chosen colour, or all annotations of the current type. Every clear action is undoable.

**Colour** offers nine colors. Each color toggles independently on every selected cell, so a cell can retain several colors at once; its background is divided into equal color segments and small dots provide a second cue. **Lines** uses the same palette. Choose a line color, then drag from one cell to another. Drawing the same colored connection again removes it, while drawing it in another color recolors it. For keyboard use, select exactly two cells and choose **Connect selected cells**. Cell colors and lines are included in undo, redo, local saves, JSON backups, and signed-in synchronization.

On a phone in portrait orientation, the player removes the redundant page heading and tightens its spacing so the board and complete number keypad remain available in the initial screen. Secondary selection and candidate tools continue below and can be reached by scrolling.

Solving the final cell triggers a short board pulse, animated completion banner, confetti, and a gentle vibration on supported devices. Reduced-motion preferences shorten these effects to an effectively static confirmation.

Once all nine instances of a digit are placed, its number-pad button turns grey. Clearing or undoing one of those values restores the button immediately; the grey state is informational and does not block note entry or corrections.

Given and entered values share the normal cell background. The separate peer shade identifies the selected cell's row, column, and box without implying that filled cells have a special state.

Peer shading is contextual: it appears only when the selected cell contains a placed value. Selecting an empty cell or a notes-only cell leaves its row, column, and box unshaded.

The puzzle board automatically expands when more screen width and height are available. It remains square and height-aware on desktop, tablet, phone, and short landscape screens so the grid grows without forcing the puzzle controls off-screen.

## Recent and completed puzzles

The home screen places unfinished games under **Active puzzles** directly below the hero so they are quick to resume. Solved games remain separate under **Completed puzzles**. Each card has a delete control. Deletion removes the saved values, notes, colours, undo history, elapsed time, and any associated challenge result; while signed in, it also propagates through the private Firestore session to your other devices.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| Arrow keys | Move the active cell |
| Shift + arrow | Extend the selection |
| 1–9 | Enter in the current mode |
| Backspace, Delete, or 0 | Clear in the current mode |
| N / C / M / V | Digit / corner / centre / colour mode |
| Ctrl/Command + Z | Undo |
| Ctrl/Command + Y or Command + Shift + Z | Redo |

## Hints

**Hint** is intentionally progressive:

1. The first hint names only the technique, without changing or highlighting the grid.
2. **Show pattern** highlights the evidence and focus cells and explains what to inspect, without naming the exact elimination or placement.
   Open **Why is this a …?** for a grid-specific trace using the highlighted cell coordinates, candidates, houses, and links. For an Empty Rectangle, it identifies the row-and-column arms inside the box and the outside strong link that drives the deduction. For an Avoidable Rectangle Type 1, it identifies the four corners, shows the forbidden two-digit swap, and states the candidate to remove. When a matching lesson is available, choose **Practice [strategy]** to open that technique directly in Training.
3. **Show answer** explicitly exposes the exact placement or elimination without changing the grid.
4. Only after that reveal, **Apply deduction** places the forced value or records candidate eliminations.

You can **Dismiss hint** without applying it. Each puzzle keeps a private hint notebook. Open **Previous hints** and choose **Review hint** to replay an earlier hint through the same three tiers: technique name first, pattern and grid location second, and exact answer last. Historical reviews cannot apply an old deduction to the current board. STrack distinguishes pointing and claiming locked candidates, rebuilds the current pattern after every board or centre-note change, checks every deduction against the verified solution and exact displayed candidates, and removes applied eliminations from the displayed notes as well as the solver state.

The offline HoDoKu engine covers singles, subsets, intersections, fish, wings, single-digit patterns, coloring, uniqueness, chains and loops, ALS techniques, Sue de Coq, and forcing logic. STrack uses full ordered paths to verify the catalogue, but offers only the first step valid for the exact current state. Cached paths are discarded whenever values or centre candidates change, so a hint cannot jump ahead to a pattern that exists only in a future state. Every bundled Easy, Medium, and Hard puzzle and 10 of the 20 Diabolical puzzles are automatically verified to have a complete logical path. The remaining Diabolical cards disclose that their paths can exceed the enabled logical set; STrack still supplies every verified logical step it can find before reporting that limit.

## Ratings

`SE 2.8` is a SukakuExplainer rating. It represents the hardest logical technique used on that engine's selected solve path. It is a useful reproducible convention, not a universal or official Sudoku scale.

| Friendly label | SE value |
| --- | ---: |
| Easy | below 1.5 |
| Medium | 1.5–2.4 |
| Hard | 2.5–4.9 |
| Diabolical | 5.0 and above |

Open a puzzle's information button to see its exact rating, engine, upstream rating-version disclosure, source, licence, and catalogue version.

## Import and share

Open **Open** in the header and paste exactly 81 cells, using `1`–`9` for givens and `0` or `.` for blanks. Whitespace and common separators are ignored. STrack checks shape, conflicting givens, whether a solution exists, and whether it is unique.

Validation happens on the device. A copied share link stores only the givens in the `p` URL parameter. Imported puzzles are labelled **Unrated** because STrack does not pretend its uniqueness solver is an SE rating engine.

## Preferences, progress, and backups

Settings include system/light/dark theme, timer visibility, automatic candidates, note cleanup, peer highlights, matching-digit highlights, optional immediate mistake highlighting, and the mistake limit. **Highlight mistakes immediately** is off by default. When enabled, an incorrect placed digit receives an outline, an `!` marker, and an accessible incorrect label as soon as it is entered. The separate three-mistake limit is on by default: the first three incorrect full-digit entries are allowed, while a fourth marks that puzzle attempt as failed and stops the timer. Notes never count as mistakes, and undoing a board entry does not erase a recorded mistake. Turn **Three-mistake limit** off for unlimited mistakes.

The top-right **Settings & help** button is a toggle. Select it again to close the menu and return to the screen you opened it from, including an active puzzle.

STrack saves edits and training progress to IndexedDB on this device before attempting cloud synchronization. JSON backup import validates the file, adds missing game IDs, preserves existing games, and imports preferences and training progress. Reset actions are separately scoped to the current puzzle, completed history, or all local data.

### Continue between a PC and phone

Open **Settings & help → Cross-device sessions** and create an email/password account. Sign in with the same email on another device. STrack synchronizes each puzzle's entries, notes, colours, undo/redo state, elapsed time, completion state, active puzzle, preferences, and technique-training progress through private owner-only Firestore documents.

Each edit remains usable offline. When connectivity returns, each puzzle reconciles by its newest saved version; a newer cloud puzzle is never overwritten by an older device copy. The current board and completion always sync. If extensive annotations make the serialized session too large for one Firestore document, STrack keeps the full local session but omits regenerable hint data and the oldest cloud undo/redo entries. A sync status appears in the desktop header and account panel. Signing out does not delete device data. Local reset actions do not delete cloud copies.

Browser storage can be cleared or evicted by the browser or operating system. Cloud sync is continuity, not an archival backup. Download JSON backups periodically, especially before clearing browser data.

## Install and use offline

On a supported browser, install STrack from the browser's install or Add to Home Screen action after the first online production load. The versioned service worker caches the app shell, styles, help content, solver, and 80-puzzle catalogue. Current progress and preferences remain in IndexedDB; signed-in sessions synchronize when a connection is available.

Development mode does not register a service worker; use the production build or the published HTTPS site for installation checks.
