import { Board, solve, type Hint as HoDoKuHint } from "../vendor/hodoku-ts/dist/index.js";
import { candidateList, units } from "./sudoku.ts";
import type { Hint, HintPath } from "./types.ts";

export const HINT_ENGINE = "HoDoKu TS e5b01c91+fixed-givens.1";

interface HintContext {
  visibleCandidates?: readonly (readonly number[])[];
  solution?: string;
  givens?: string;
}

const forbiddenTechniques = new Set(["BRUTE_FORCE", "GIVE_UP", "INCOMPLETE"]);

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

function toBoard(
  values: readonly string[],
  eliminated: readonly number[][],
  visibleCandidates?: readonly (readonly number[])[],
  givens?: string,
): Board | null {
  const board = Board.fromValues(values.map((value) => Number(value) || 0), false);
  if (givens) {
    for (let cell = 0; cell < 81; cell++) {
      if (givens[cell] && givens[cell] !== "0" && values[cell] === givens[cell]) board.fixed[cell] = 1;
    }
  }
  const candidates = liveCandidates(values, eliminated, visibleCandidates);
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell]) continue;
    if (!candidates[cell].length) return null;
    for (let digit = 1; digit <= 9; digit++) {
      if (!candidates[cell].includes(digit) && !board.setCandidate(cell, digit, false)) return null;
    }
  }
  return board;
}

function unique(items: number[]): number[] {
  return [...new Set(items.filter((cell) => cell >= 0 && cell < 81))];
}

function singleEvidence(
  technique: string,
  cell: number,
  digit: number,
  values: readonly string[],
  candidates: readonly number[][],
): number[] {
  if (technique === "FULL_HOUSE") {
    return units.find((unit) => unit.includes(cell) && unit.filter((index) => values[index]).length === 8)?.filter((index) => index !== cell) || [];
  }
  if (technique === "HIDDEN_SINGLE") {
    return units.find((unit) => unit.includes(cell) && unit.filter((index) => !values[index] && candidates[index].includes(digit)).length === 1)?.filter((index) => index !== cell) || [];
  }
  if (technique === "NAKED_SINGLE") {
    return unique(units.flatMap((unit) => unit.includes(cell) ? unit : []).filter((index) => index !== cell && values[index]));
  }
  return [];
}

function techniqueName(hint: HoDoKuHint): { name: string; variant?: "pointing" | "claiming" } {
  if (hint.technique === "LOCKED_CANDIDATES_1") return { name: "Locked candidates", variant: "pointing" };
  if (hint.technique === "LOCKED_CANDIDATES_2") return { name: "Locked candidates", variant: "claiming" };
  const simple: Record<string, string> = {
    FULL_HOUSE: "Full house",
    NAKED_SINGLE: "Naked single",
    HIDDEN_SINGLE: "Hidden single",
    NAKED_PAIR: "Naked pair",
    NAKED_TRIPLE: "Naked triple",
    NAKED_QUADRUPLE: "Naked quadruple",
    HIDDEN_PAIR: "Hidden pair",
    HIDDEN_TRIPLE: "Hidden triple",
    HIDDEN_QUADRUPLE: "Hidden quadruple",
    LOCKED_PAIR: "Locked pair",
    LOCKED_TRIPLE: "Locked triple",
  };
  return { name: simple[hint.technique] || hint.name };
}

function evidenceFor(hint: HoDoKuHint, targets: Hint["targets"], values: readonly string[], candidates: readonly number[][]): number[] {
  const raw = hint.raw;
  const evidence = [
    ...raw.indices,
    ...raw.fins.map(({ index }) => index),
    ...raw.endoFins.map(({ index }) => index),
    ...raw.cannibalistic.map(({ index }) => index),
    ...raw.alses.flatMap(({ indices }) => indices),
    ...raw.colorCandidates.keys(),
    ...hint.links.flatMap(({ from, to }) => [from.index, to.index]),
  ];
  if (hint.placements.length === 1) evidence.push(...singleEvidence(hint.technique, hint.placements[0].index, hint.placements[0].value, values, candidates));
  const targetCells = new Set(targets.map(({ cell }) => cell));
  return unique(evidence).filter((cell) => !targetCells.has(cell));
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

export function convertHoDoKuHint(hint: HoDoKuHint, values: readonly string[], candidates: readonly number[][], context: HintContext = {}): Hint | null {
  const kind: Hint["kind"] = hint.placements.length ? "place" : "eliminate";
  const sourceTargets = kind === "place" ? hint.placements : hint.eliminations;
  const targets = sourceTargets
    .map(({ index, value }) => ({ cell: index, digit: value }))
    .filter((target) => targetMatchesContext(target, kind, context));
  if (!targets.length) return null;
  const technique = techniqueName(hint);
  const evidence = evidenceFor(hint, targets, values, candidates);
  if (technique.name.startsWith("Avoidable Rectangle") && context.givens && evidence.some((cell) => context.givens?.[cell] !== "0")) return null;
  const targetKey = targets.map(({ cell, digit }) => `${cell}-${digit}`).join("-");
  return {
    id: `hodoku-${hint.technique}-${targetKey}`,
    technique: technique.name,
    variant: technique.variant,
    summary: `${technique.name} produces the next logical ${kind === "place" ? "placement" : "candidate elimination"}.`,
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

export function hintRespectsGivens(hint: Hint, givens: string): boolean {
  return !hint.technique.startsWith("Avoidable Rectangle") || hint.evidence.every((cell) => givens[cell] === "0");
}

export function buildHintPath(values: readonly string[], eliminated: readonly number[][] = [], context: HintContext = {}): HintPath {
  const generatedAt = Date.now();
  const stateKey = hintStateKey(values, eliminated, context.visibleCandidates, context.givens);
  if (context.solution && values.some((value, cell) => value && value !== context.solution?.[cell])) {
    return { engine: HINT_ENGINE, generatedAt, stateKey, complete: false, hints: [] };
  }
  const board = toBoard(values, eliminated, context.visibleCandidates, context.givens);
  if (!board) return { engine: HINT_ENGINE, generatedAt, stateKey, complete: false, hints: [] };
  const result = solve(board);
  const forbiddenIndex = result.steps.findIndex((step) => forbiddenTechniques.has(step.technique));
  const logical = result.steps.slice(0, forbiddenIndex < 0 ? result.steps.length : forbiddenIndex);
  const pathValues = [...values];
  const pathEliminated = Array.from({ length: 81 }, (_, cell) => [...(eliminated[cell] || [])]);
  const hints: Hint[] = [];
  for (const step of logical) {
    const pathCandidates = liveCandidates(pathValues, pathEliminated);
    const hint = convertHoDoKuHint(step, pathValues, pathCandidates, context);
    if (!hint) continue;
    hints.push(hint);
    for (const { cell, digit } of hint.targets) {
      if (hint.kind === "place") pathValues[cell] = String(digit);
      else if (!pathEliminated[cell].includes(digit)) pathEliminated[cell].push(digit);
    }
  }
  return { engine: HINT_ENGINE, generatedAt, stateKey, complete: result.solved && forbiddenIndex < 0, hints };
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
  const path = buildHintPath(values, eliminated, context);
  return nextHintFromPath(path, values, eliminated, context);
}
