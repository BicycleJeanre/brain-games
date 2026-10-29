// Brain Games integration surface for sudokUI's framework-independent engine.
// The exact upstream revision is pinned in apps/sudoku/package.json.
export { bit, emptyGrid, setValue } from "sudokui/src/engine/board";
export { applyStep, findNextStep, findStep } from "sudokui/src/engine/humanSolver";
export { describe, walkFrames } from "sudokui/src/engine/hintFrames";
export { TECHS } from "sudokui/src/engine/ratings";
export { TECH_DOCS } from "sudokui/src/content/techniqueDocs";

