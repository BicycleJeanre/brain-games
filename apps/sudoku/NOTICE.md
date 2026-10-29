# STrack notices

STrack is licensed under the GNU Affero General Public License, version 3 or
later. The complete corresponding source for the deployed application is
available at <https://github.com/BicycleJeanre/strack>.

## HoDoKu TypeScript

STrack includes a vendored copy of `gil/HoDoKu-ts`, pinned to commit
`e5b01c91b9dca647a5cf276d69f311a1517c7fcb`. HoDoKu-ts is licensed under
GPL-3.0-or-later and derives from HoDoKu, copyright © 2008–2012 Bernhard
Hobiger. Its licence and attribution are preserved under `vendor/hodoku-ts/`.

STrack's integration, candidate-state validation, progressive presentation,
path caching, persistence, and user interface are project-specific changes.

## sudokUI hint engine and learning content

Live puzzle hints include a locally bundled integration surface built from
`AImenes/sudokUI`, pinned to commit
`1f7831c6dc0fa118e1c7638e61c99756b1fa9d48`. sudokUI is licensed under
GPL-3.0. Its licence is preserved under `vendor/sudokui/`, and its complete
corresponding source is available at
<https://github.com/AImenes/sudokUI/tree/1f7831c6dc0fa118e1c7638e61c99756b1fa9d48>.

Brain Games uses only sudokUI's framework-independent solving, technique-guide,
and hint-frame modules. The surrounding player, persistence, progressive
disclosure, and existing HoDoKu training catalogue remain project-specific.

## HoDoKu2 training libraries

STrack's training catalogue contains compact records selected from HoDoKu2's
official `reglib-1.3.txt` regression library and `exemplars-1.0.txt` exemplar
library, pinned to commit `405a68437af277ad31a37106b489079295ad1fca` from
<https://github.com/wyzelli/Hodoku2>. The generated catalogue preserves the
source library, line number, technique code, commit, and upstream link for every
lesson. HoDoKu2 is licensed under GPL-3.0; the GPL-3.0 text distributed at
`vendor/hodoku-ts/COPYING` applies to these records as well.
