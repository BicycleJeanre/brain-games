import {
  applyStep,
  bit,
  emptyGrid,
  findNextStep,
  TECH_DOCS,
  TECHS,
  walkFrames,
  type Grid,
  type Step,
} from "../vendor/sudokui/dist/index.js";
import type { Hint as HoDoKuHint } from "../vendor/hodoku-ts/dist/index.js";
import { candidateList } from "./sudoku.ts";
import type { Hint, HintHouseRef, HintInferenceLink, HintInferenceReason, HintPath } from "./types.ts";

export const HINT_ENGINE = "sudokUI 1f7831c6";

interface HintContext {
  visibleCandidates?: readonly (readonly number[])[];
  solution?: string;
  givens?: string;
}

// The existing 21 HoDoKu-authored training fixtures remain available while
// live puzzle hints use sudokUI. This converter is intentionally limited to
// that curated training catalogue.
export function convertHoDoKuHint(hint: HoDoKuHint, _values: readonly string[], _candidates: readonly number[][]): Hint | null {
  const kind: Hint["kind"] = hint.placements.length ? "place" : "eliminate";
  const sourceTargets = kind === "place" ? hint.placements : hint.eliminations;
  const targets = sourceTargets.map(({ index, value }) => ({ cell: index, digit: value }));
  if (!targets.length) return null;
  const targetCells = new Set(targets.map(({ cell }) => cell));
  const evidence = [...new Set([
    ...hint.raw.indices,
    ...hint.raw.fins.map(({ index }) => index),
    ...hint.raw.endoFins.map(({ index }) => index),
    ...hint.raw.cannibalistic.map(({ index }) => index),
    ...hint.raw.alses.flatMap(({ indices }) => indices),
    ...hint.raw.colorCandidates.keys(),
    ...hint.links.flatMap(({ from, to }) => [from.index, to.index]),
  ])].filter((cell) => !targetCells.has(cell));
  const name = hint.technique === "LOCKED_CANDIDATES_1" || hint.technique === "LOCKED_CANDIDATES_2" ? "Locked candidates" : hint.name;
  return {
    id: `hodoku-training-${hint.technique}-${targets.map(({ cell, digit }) => `${cell}-${digit}`).join("-")}`,
    technique: name,
    variant: hint.technique === "LOCKED_CANDIDATES_1" ? "pointing" : hint.technique === "LOCKED_CANDIDATES_2" ? "claiming" : undefined,
    summary: `${name} produces the training deduction.`,
    explanation: hint.explanation,
    kind,
    evidence,
    targets,
    links: hint.links.map(({ from, to, strong }) => ({
      from: { cell: from.index, digit: from.value },
      to: { cell: to.index, digit: to.value },
      strong,
    })),
  };
}

function liveCandidates(
  values: readonly string[],
  eliminated: readonly number[][],
  visibleCandidates?: readonly (readonly number[])[],
): number[][] {
  const calculated = values.map((value, cell) => value ? [] : candidateList(values, cell, eliminated));
  const structural = values.map((value, cell) => value ? [] : candidateList(values, cell));
  const completeVisibleGrid = Boolean(visibleCandidates) && values.every((value, cell) => {
    if (value) return true;
    const shown = visibleCandidates?.[cell] || [];
    return shown.length > 0 && shown.every((digit) => structural[cell].includes(digit));
  });
  return calculated.map((candidates, cell) => completeVisibleGrid ? [...(visibleCandidates?.[cell] || [])] : candidates);
}

function hintStateKey(
  values: readonly string[],
  eliminated: readonly number[][],
  visibleCandidates?: readonly (readonly number[])[],
  givens?: string,
): string {
  const candidates = liveCandidates(values, eliminated, visibleCandidates);
  return `${givens || ""}|${values.map((value) => value || "0").join("")}|${candidates.map((digits) => digits.join("")).join(".")}`;
}

function toGrid(
  values: readonly string[],
  eliminated: readonly number[][],
  visibleCandidates?: readonly (readonly number[])[],
  givens?: string,
): Grid | null {
  const grid = emptyGrid();
  for (let cell = 0; cell < 81; cell++) {
    const digit = Number(values[cell]);
    if (!digit) continue;
    grid.values[cell] = digit;
    grid.cands[cell] = 0;
    if (givens?.[cell] && givens[cell] !== "0" && values[cell] === givens[cell]) grid.given[cell] = 1;
  }
  const candidates = liveCandidates(values, eliminated, visibleCandidates);
  for (let cell = 0; cell < 81; cell++) {
    if (grid.values[cell]) continue;
    if (!candidates[cell].length) return null;
    grid.cands[cell] = candidates[cell].reduce((mask, digit) => mask | bit(digit), 0);
  }
  return grid;
}

function uniqueCells(step: Step): number[] {
  return [...new Set([
    ...(step.primary || []).map(({ cell }) => cell),
    ...(step.secondary || []).map(({ cell }) => cell),
    ...(step.fins || []).map(({ cell }) => cell),
    ...(step.links || []).flatMap(({ from, to }) => [...from, ...to].map(({ cell }) => cell)),
  ])];
}

function rowOf(cell: number): number { return Math.floor(cell / 9); }
function columnOf(cell: number): number { return cell % 9; }
function boxOf(cell: number): number { return Math.floor(rowOf(cell) / 3) * 3 + Math.floor(columnOf(cell) / 3); }

function cellsInHouse(house: HintHouseRef): number[] {
  if (house.kind === "row") return Array.from({ length: 9 }, (_, column) => house.index * 9 + column);
  if (house.kind === "column") return Array.from({ length: 9 }, (_, row) => row * 9 + house.index);
  const firstRow = Math.floor(house.index / 3) * 3;
  const firstColumn = (house.index % 3) * 3;
  return Array.from({ length: 9 }, (_, offset) => (firstRow + Math.floor(offset / 3)) * 9 + firstColumn + (offset % 3));
}

function commonHouses(cells: readonly number[]): HintHouseRef[] {
  if (!cells.length) return [];
  const houses: HintHouseRef[] = [];
  if (cells.every((cell) => rowOf(cell) === rowOf(cells[0]))) houses.push({ kind: "row", index: rowOf(cells[0]) });
  if (cells.every((cell) => columnOf(cell) === columnOf(cells[0]))) houses.push({ kind: "column", index: columnOf(cells[0]) });
  if (cells.every((cell) => boxOf(cell) === boxOf(cells[0]))) houses.push({ kind: "box", index: boxOf(cells[0]) });
  return houses;
}

function inferenceReason(
  link: NonNullable<Step["links"]>[number],
  grid: Grid,
): HintInferenceReason | undefined {
  const nodes = [...link.from, ...link.to];
  const cells = [...new Set(nodes.map(({ cell }) => cell))];
  const digits = [...new Set(nodes.map(({ digit }) => digit))];
  if (cells.length === 1) {
    if (!link.strong) return { kind: "same-cell-conflict", cell: cells[0] };
    const liveDigits = candidateListFromMask(grid.cands[cells[0]]);
    if (liveDigits.length === 2 && digits.every((digit) => liveDigits.includes(digit))) {
      return { kind: "only-candidates-in-cell", cell: cells[0], digits: liveDigits };
    }
    return undefined;
  }
  if (digits.length !== 1) return undefined;
  const digit = digits[0];
  const houses = commonHouses(cells);
  if (link.strong) {
    const nodeCells = new Set(cells);
    const house = houses.find((candidateHouse) => {
      const possible = cellsInHouse(candidateHouse).filter((cell) => !grid.values[cell] && Boolean(grid.cands[cell] & bit(digit)));
      return possible.length > 0 && possible.every((cell) => nodeCells.has(cell));
    });
    return house ? { kind: "only-places-in-house", house, digit } : undefined;
  }
  const house = houses[0];
  return house ? { kind: "shared-house-conflict", house, digit } : undefined;
}

function candidateListFromMask(mask: number): number[] {
  return Array.from({ length: 9 }, (_, index) => index + 1).filter((digit) => Boolean(mask & bit(digit)));
}

export function buildStructuredInference(step: Step, grid: Grid, targets: readonly { cell: number; digit: number }[]): Hint["inference"] | undefined {
  if (!step.links?.length) return undefined;
  const links: HintInferenceLink[] = step.links.map((link) => ({
    from: link.from.map(({ cell, digit }) => ({ cell, digit })),
    to: link.to.map(({ cell, digit }) => ({ cell, digit })),
    strong: link.strong,
    reason: inferenceReason(link, grid),
    sourceText: link.text,
  }));
  if (step.tech !== "NICE_LOOP" && step.tech !== "GROUPED_NICE_LOOP") return { links };
  const target = targets[0];
  if (step.placements.length && target) {
    return { links, premise: { candidate: target, assumed: "false" }, closure: "premise-forces-opposite" };
  }
  const first = links[0]?.from[0];
  const discontinuousTarget = targets.find(({ cell, digit }) => cell === first?.cell && digit === first?.digit);
  if (discontinuousTarget) {
    return { links, premise: { candidate: discontinuousTarget, assumed: "true" }, closure: "premise-forces-opposite" };
  }
  return { links, closure: "continuous-loop" };
}

function targetMatchesContext(target: { cell: number; digit: number }, kind: Hint["kind"], context: HintContext): boolean {
  if (context.solution) {
    const solvedDigit = Number(context.solution[target.cell]);
    if (kind === "place" ? solvedDigit !== target.digit : solvedDigit === target.digit) return false;
  }
  if (kind === "eliminate") {
    const shown = context.visibleCandidates?.[target.cell] || [];
    if (shown.length > 0 && !shown.includes(target.digit)) return false;
  }
  return true;
}

type TailoredInstruction = Pick<NonNullable<Hint["instruction"]>, "what" | "why" | "spot" | "labels" | "frames">;

function cellName(cell: number): string {
  return `R${Math.floor(cell / 9) + 1}C${cell % 9 + 1}`;
}

function cellNames(cells: readonly number[]): string {
  if (cells.length < 2) return cells.map(cellName).join("");
  return `${cells.slice(0, -1).map(cellName).join(", ")} and ${cellName(cells.at(-1)!)}`;
}

function chuteRemotePairInstruction(step: Step, targets: readonly { cell: number; digit: number }[]): TailoredInstruction | null {
  if (step.tech !== "CHUTE_REMOTE_PAIR") return null;
  const pairCells = [...new Set((step.primary || []).map(({ cell }) => cell))];
  const pairDigits = [...new Set((step.primary || []).map(({ digit }) => digit))].sort();
  if (pairCells.length !== 2 || pairDigits.length !== 2) return null;

  const [first, second] = pairCells;
  const firstRow = Math.floor(first / 9);
  const secondRow = Math.floor(second / 9);
  const firstColumn = first % 9;
  const secondColumn = second % 9;
  const horizontal = Math.floor(firstRow / 3) === Math.floor(secondRow / 3);
  const lineOne = horizontal ? firstRow : firstColumn;
  const lineTwo = horizontal ? secondRow : secondColumn;
  const chuteIndex = Math.floor(lineOne / 3);
  const remainingLine = [chuteIndex * 3, chuteIndex * 3 + 1, chuteIndex * 3 + 2]
    .find((line) => line !== lineOne && line !== lineTwo);
  const boxOf = (cell: number) => Math.floor(Math.floor(cell / 9) / 3) * 3 + Math.floor((cell % 9) / 3);
  const boxes = horizontal
    ? [chuteIndex * 3, chuteIndex * 3 + 1, chuteIndex * 3 + 2]
    : [chuteIndex, chuteIndex + 3, chuteIndex + 6];
  const remainingBox = boxes.find((box) => box !== boxOf(first) && box !== boxOf(second));
  if (remainingLine === undefined || remainingBox === undefined) return null;

  const miniLine = Array.from({ length: 9 }, (_, index) => horizontal ? remainingLine * 9 + index : index * 9 + remainingLine)
    .filter((cell) => boxOf(cell) === remainingBox);
  const presentDigits = [...new Set((step.secondary || []).map(({ digit }) => digit))]
    .filter((digit) => pairDigits.includes(digit));
  const missingDigits = pairDigits.filter((digit) => !presentDigits.includes(digit));
  const removedDigits = [...new Set(targets.map(({ digit }) => digit))].sort();
  const pair = `{${pairDigits.join(", ")}}`;
  const pairCellNames = cellNames(pairCells);
  const miniLineNames = cellNames(miniLine);
  const lineKind = horizontal ? "row" : "column";
  const pairLines = [lineOne + 1, lineTwo + 1];
  const chuteNames = horizontal ? ["top band", "middle band", "bottom band"] : ["left stack", "centre stack", "right stack"];
  const chuteDefinition = horizontal
    ? "A band is three adjacent rows crossing three boxes."
    : "A stack is three adjacent columns crossing three boxes.";
  const absent = missingDigits.length === 1
    ? `${missingDigits[0]} is absent`
    : `${missingDigits.join(" and ")} are absent`;
  const forcedDigit = removedDigits[0];

  const what = `${chuteDefinition} ${pairCellNames} are bivalue cells, meaning each has exactly two candidates: ${pair}. They sit in different boxes of the same ${chuteNames[chuteIndex]} and do not see each other.`;
  const why = missingDigits.length === 1
    ? `In box ${remainingBox + 1}, ${missingDigits[0]} cannot go in ${miniLineNames}. Box ${remainingBox + 1} must still contain ${missingDigits[0]}, so it must be placed on ${lineKind} ${pairLines[0]} or ${lineKind} ${pairLines[1]}. A ${missingDigits[0]} on either line removes ${missingDigits[0]} from that line's pair cell, forcing that pair cell to ${forcedDigit}. Therefore at least one of ${pairCellNames} is ${forcedDigit}, and any cell that sees both pair cells cannot contain ${forcedDigit}.`
    : `In box ${remainingBox + 1}, neither ${pairDigits[0]} nor ${pairDigits[1]} can go in ${miniLineNames}. Both digits must therefore use ${lineKind}s ${pairLines[0]} and ${pairLines[1]} in that box. Those placements force ${pairCellNames} to take ${pairDigits[0]} and ${pairDigits[1]} in some order. Any cell that sees both pair cells can contain neither digit.`;
  const spot = `First compare ${pairCellNames}. Then check ${miniLineNames}: ${absent} there. Finally, look for a cell that sees both pair cells and still contains ${removedDigits.join(" or ")}.`;
  const frames = [
    { text: `${pairCellNames} are both restricted to ${pair}; they are in different boxes of the same ${chuteNames[chuteIndex]}.`, show: ["units", "primary"] },
    { text: `${absent[0].toUpperCase()}${absent.slice(1)} from ${miniLineNames} in box ${remainingBox + 1}.`, show: ["units", "primary", "secondary"] },
    ...(missingDigits.length === 1
      ? [{ text: `Box ${remainingBox + 1} must place ${missingDigits[0]} on ${lineKind} ${pairLines[0]} or ${lineKind} ${pairLines[1]}. Whichever line it uses, that line's pair cell is forced to ${forcedDigit}.`, show: ["units", "primary", "secondary"] }]
      : [{ text: `Box ${remainingBox + 1} must place ${pairDigits.join(" and ")} on ${lineKind}s ${pairLines.join(" and ")}, forcing the pair cells to opposite values.`, show: ["units", "primary", "secondary"] }]),
    { text: `So inspect cells that see both ${pairCellNames}; ${removedDigits.join(" and ")} cannot remain in such a cell.`, show: ["units", "primary", "secondary"] },
    { text: step.description, show: ["units", "primary", "secondary", "conclusion"] },
  ];

  return {
    what,
    why,
    spot,
    labels: {
      primary: `${pairCellNames}: the ${pair} pair`,
      secondary: `${miniLineNames}: ${absent}`,
    },
    frames,
  };
}

function convertStep(step: Step, grid: Grid, context: HintContext = {}): Hint | null {
  const kind: Hint["kind"] = step.placements.length ? "place" : "eliminate";
  const targets = (kind === "place" ? step.placements : step.eliminations)
    .filter((target) => targetMatchesContext(target, kind, context));
  if (!targets.length) return null;
  const upstreamName = TECHS[step.tech]?.name || step.tech;
  const name = ({
    "Full House": "Full house",
    "Naked Single": "Naked single",
    "Hidden Single": "Hidden single",
    "Locked Pair": "Locked pair",
    "Locked Triple": "Locked triple",
    "Naked Pair": "Naked pair",
    "Naked Triple": "Naked triple",
    "Naked Quadruple": "Naked quadruple",
    "Hidden Pair": "Hidden pair",
    "Hidden Triple": "Hidden triple",
    "Hidden Quadruple": "Hidden quadruple",
  } as Record<string, string>)[upstreamName] || upstreamName;
  const guide = TECH_DOCS[step.tech];
  const tailored = chuteRemotePairInstruction(step, targets);
  const targetCells = new Set(targets.map(({ cell }) => cell));
  const evidence = uniqueCells(step).filter((cell) => !targetCells.has(cell));
  const targetKey = targets.map(({ cell, digit }) => `${cell}-${digit}`).join("-");
  return {
    id: `sudokui-${step.tech}-${targetKey}`,
    technique: name,
    summary: step.description,
    explanation: guide?.why || step.description,
    kind,
    evidence,
    targets,
    links: (step.links || []).flatMap(({ from, to, strong }) => from.length === 1 && to.length === 1 ? [{ from: from[0], to: to[0], strong }] : []),
    inference: buildStructuredInference(step, grid, targets),
    instruction: {
      provider: "sudokUI",
      revision: "1f7831c6dc0fa118e1c7638e61c99756b1fa9d48",
      techniqueCode: step.tech,
      what: tailored?.what || guide?.what || "This pattern is identified directly from the candidates shown on the board.",
      why: tailored?.why || guide?.why || step.description,
      spot: tailored?.spot || guide?.spot || "Follow the highlighted candidates and their shared houses.",
      aliases: guide?.aka || [],
      specific: step.description,
      labels: tailored?.labels || step.labels || {},
      primary: step.primary || [],
      secondary: step.secondary || [],
      fins: step.fins || [],
      units: step.units || [],
      frames: tailored?.frames || walkFrames(step).map((frame) => ({ text: frame.text, show: [...frame.show] })),
    },
  };
}

export function hintRespectsGivens(hint: Hint, givens: string): boolean {
  return !hint.technique.startsWith("Avoidable Rectangle") || hint.evidence.every((cell) => givens[cell] === "0");
}

export function buildHintPath(values: readonly string[], eliminated: readonly number[][] = [], context: HintContext = {}): HintPath {
  const generatedAt = Date.now();
  const stateKey = hintStateKey(values, eliminated, context.visibleCandidates, context.givens);
  if (context.solution && values.some((value, cell) => value && value !== context.solution?.[cell])) {
    return { engine: HINT_ENGINE, generatedAt, stateKey, complete: false, hints: [] };
  }
  const grid = toGrid(values, eliminated, context.visibleCandidates, context.givens);
  if (!grid) return { engine: HINT_ENGINE, generatedAt, stateKey, complete: false, hints: [] };
  const hints: Hint[] = [];
  for (let guard = 0; guard < 1000 && grid.values.some((value) => !value); guard++) {
    const step = findNextStep(grid);
    if (!step) break;
    const hint = convertStep(step, grid, context);
    if (!hint) break;
    hints.push(hint);
    applyStep(grid, step);
  }
  const solved = !grid.values.some((value) => !value);
  const correct = !context.solution || [...context.solution].every((digit, cell) => Number(digit) === grid.values[cell]);
  return { engine: HINT_ENGINE, generatedAt, stateKey, complete: solved && correct, hints };
}

export function nextHintFromPath(path: HintPath | undefined, values: readonly string[], eliminated: readonly number[][] = [], context: HintContext = {}): Hint | null {
  if (!path || path.engine !== HINT_ENGINE || path.stateKey !== hintStateKey(values, eliminated, context.visibleCandidates, context.givens)) return null;
  const hint = path.hints[0];
  if (!hint || !hint.targets.length || !hint.targets.every(({ cell, digit }) => {
    if (values[cell] || !candidateList(values, cell, eliminated).includes(digit)) return false;
    if (!targetMatchesContext({ cell, digit }, hint.kind, context)) return false;
    const shown = context.visibleCandidates?.[cell] || [];
    return hint.kind !== "eliminate" || shown.length === 0 || shown.includes(digit);
  })) return null;
  return hint;
}

export function findHint(values: readonly string[], eliminated: readonly number[][] = [], context: HintContext = {}): Hint | null {
  return nextHintFromPath(buildHintPath(values, eliminated, context), values, eliminated, context);
}
