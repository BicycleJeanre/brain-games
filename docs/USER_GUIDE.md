# WTrack user guide

## Starting and resuming

Open **Puzzles**, choose a word search or crossword, and select **Start**. WTrack saves progress on the device after every found word or entered crossword letter. Started puzzles appear on Home for quick resume.

## Word searches

Select the first letter of a word, then its last letter. WTrack accepts straight horizontal, vertical, and diagonal paths in either direction. A correct find remains highlighted and receives a textual **Found** status in the word list.

The initial scaffold uses endpoint selection. Pointer-drag and keyboard selection are part of the release-one interaction work described in the product brief.

## Crosswords

Select a clue or grid cell and type a letter. The active clue is highlighted. Arrow keys move to the next open cell. Enable **Mark incorrect crossword letters** in Settings if you want immediate feedback; leave it off for traditional unassisted solving.

## Creating previews

The Create screen offers two local tools:

- enter one word per line to generate a word search;
- enter `ANSWER | clue` on each line to generate a crossword layout.

Generation happens in the browser. Previews are not added to the public catalogue automatically because answers, clue authorship, layout quality, provenance, and redistribution rights require review.

## Offline use

After the production app has loaded once, its shell and bundled catalogue are cached. Your current progress and settings are stored in IndexedDB. Browser storage can be cleared or evicted, so a JSON export remains a planned release-one backup feature.

## Accounts and privacy

An account is optional. When Firebase is configured, email/password sign-in privately syncs progress and preferences under your user ID. Core play contains no analytics or advertising and remains available when signed out.
