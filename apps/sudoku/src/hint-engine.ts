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
import type { Hint, HintPath } from "./types.ts";

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

function convertStep(step: Step, context: HintContext = {}): Hint | null {
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
    instruction: {
      provider: "sudokUI",
      revision: "1f7831c6dc0fa118e1c7638e61c99756b1fa9d48",
      techniqueCode: step.tech,
      what: guide?.what || "This pattern is identified directly from the candidates shown on the board.",
      why: guide?.why || step.description,
      spot: guide?.spot || "Follow the highlighted candidates and their shared houses.",
      aliases: guide?.aka || [],
      specific: step.description,
      labels: step.labels || {},
      primary: step.primary || [],
      secondary: step.secondary || [],
      fins: step.fins || [],
      units: step.units || [],
      frames: walkFrames(step).map((frame) => ({ text: frame.text, show: [...frame.show] })),
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
    const hint = convertStep(step, context);
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
