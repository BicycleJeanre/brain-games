import sudokuMaster, { type Digit, type GridIndex, type SudokuGrid } from "sudoku-master";
import { boxes, candidateList, columns, rows, units } from "./sudoku.ts";
import type { Hint } from "./types.ts";

const {
  SubsetType,
  eliminateBasicFish,
  eliminateHiddenSubset,
  eliminateLockedCandidates,
  eliminateNakedSubset,
  solveFullHouse,
  solveHiddenSingle,
  solveLastDigit,
  solveNakedSingle,
} = sudokuMaster;

interface SolvingResult {
  technique: "Full House" | "Last Digit" | "Naked Single" | "Hidden Single";
  coord: readonly [number, number];
  digit: number;
}

interface EliminationResult {
  technique: string;
  eliminations: ReadonlyArray<{ digit: number; coords: ReadonlyArray<readonly [number, number]> }>;
  implication?:
    | { type: 0; digit: number; house: { type: "row" | "col" | "box"; index: number; cells: readonly number[] } }
    | { type: 1; cells: ReadonlyArray<readonly [number, number]>; digits: readonly number[] }
    | { type: 2; line: "row" | "col"; digit: number; baseSet: readonly number[]; coverSet: readonly number[] };
}

const EliminationImplicationType = { DigitInHouse: 0, Subset: 1, Fish: 2 } as const;

const coordCell = ([row, column]: readonly [number, number]) => row * 9 + column;
const titleCaseTechnique = (technique: string) => technique
  .replace(/^Locked Candidates Type \d \((Pointing|Claiming)\)$/, "Locked candidates")
  .replace(/^(Full House|Last Digit|Naked Single|Hidden Single|Naked Pair|Naked Triple|Naked Quadruple|Hidden Pair|Hidden Triple|Hidden Quadruple|Locked Pair|Locked Triple)$/, (name) => name[0] + name.slice(1).toLowerCase());

function houseCells(type: "row" | "col" | "box", index: number): number[] {
  return type === "row" ? rows[index] : type === "col" ? columns[index] : boxes[index];
}

function houseName(type: "row" | "col" | "box", index: number): string {
  return `${type === "col" ? "column" : type} ${index + 1}`;
}

function commonHouseName(cells: number[]): string {
  const unit = units.find((candidate) => cells.every((cell) => candidate.includes(cell)));
  if (!unit) return "the highlighted unit";
  const index = units.indexOf(unit);
  if (index < 9) return `row ${index + 1}`;
  if (index < 18) return `column ${index - 8}`;
  return `box ${index - 17}`;
}

function toGrid(values: readonly string[], eliminated: readonly number[][]): SudokuGrid {
  const digits = new Map<GridIndex, Digit>();
  const candidates = new Map<GridIndex, readonly Digit[]>();
  for (let cell = 0; cell < 81; cell++) {
    if (values[cell]) digits.set(cell as GridIndex, Number(values[cell]) as Digit);
    else candidates.set(cell as GridIndex, candidateList(values, cell, eliminated) as Digit[]);
  }
  return { digits, candidates };
}

function solvingEvidence(grid: SudokuGrid, result: SolvingResult): number[] {
  const cell = coordCell(result.coord);
  if (result.technique === "Last Digit") {
    return [...grid.digits.entries()].filter(([, digit]) => digit === result.digit).map(([index]) => index);
  }
  if (result.technique === "Full House") {
    return units.find((unit) => unit.includes(cell) && unit.filter((index) => grid.digits.has(index as GridIndex)).length === 8)?.filter((index) => index !== cell) || [];
  }
  if (result.technique === "Hidden Single") {
    return units.find((unit) => unit.includes(cell) && unit.filter((index) => grid.candidates.get(index as GridIndex)?.includes(result.digit as Digit)).length === 1)?.filter((index) => index !== cell) || [];
  }
  return units.flatMap((unit) => unit.includes(cell) ? unit : []).filter((index, position, all) => index !== cell && grid.digits.has(index as GridIndex) && all.indexOf(index) === position);
}

function solvingHint(grid: SudokuGrid, result: SolvingResult): Hint {
  const cell = coordCell(result.coord);
  const technique = titleCaseTechnique(result.technique);
  const location = `row ${result.coord[0] + 1}, column ${result.coord[1] + 1}`;
  const summary = result.technique === "Full House"
    ? `${result.digit} is the only digit missing from a highlighted unit.`
    : result.technique === "Last Digit"
      ? `${result.digit} has only one remaining home in the grid.`
      : result.technique === "Hidden Single"
        ? `${result.digit} has only one possible home in a highlighted unit.`
        : `Only ${result.digit} can fit in ${location}.`;
  const explanation = result.technique === "Naked Single"
    ? "Every other digit has been removed from this cell by its row, column, box, or earlier logical deductions."
    : "The highlighted placed digits and candidates leave exactly one logical placement.";
  return {
    id: `sudoku-master-${result.technique}-${cell}-${result.digit}`,
    technique,
    summary,
    explanation,
    kind: "place",
    evidence: solvingEvidence(grid, result),
    targets: [{ cell, digit: result.digit }],
  };
}

function eliminationEvidence(grid: SudokuGrid, result: EliminationResult, targets: Hint["targets"]): number[] {
  const implication = result.implication;
  if (!implication) return [...new Set(targets.map(({ cell }) => cell))];
  if (implication.type === EliminationImplicationType.DigitInHouse) {
    return houseCells(implication.house.type, implication.house.index)
      .filter((cell) => grid.candidates.get(cell as GridIndex)?.includes(implication.digit as Digit));
  }
  if (implication.type === EliminationImplicationType.Subset) return implication.cells.map(coordCell);
  const baseType = implication.line;
  const coverType = baseType === "row" ? "col" : "row";
  return implication.baseSet.flatMap((base) => implication.coverSet
    .map((cover) => baseType === "row" ? base * 9 + cover : cover * 9 + base)
    .filter((cell) => grid.candidates.get(cell as GridIndex)?.includes(implication.digit as Digit)));
}

function eliminationText(result: EliminationResult, evidence: number[]): { summary: string; explanation: string } {
  const implication = result.implication;
  if (implication?.type === EliminationImplicationType.DigitInHouse) {
    return {
      summary: `${implication.digit} is confined to one intersection inside ${houseName(implication.house.type, implication.house.index)}.`,
      explanation: "Because every possible position lies in the intersecting house, that candidate can be removed from the rest of the intersection.",
    };
  }
  if (implication?.type === EliminationImplicationType.Subset) {
    const digits = implication.digits.join(", ");
    return {
      summary: `${digits} form a ${titleCaseTechnique(result.technique).toLowerCase()} in ${commonHouseName(evidence)}.`,
      explanation: result.technique.startsWith("Hidden")
        ? "Those digits have no other homes in the unit, so every other candidate can be removed from the highlighted cells."
        : "Those digits must occupy the highlighted cells, so they can be removed from every other cell in the unit.",
    };
  }
  if (implication?.type === EliminationImplicationType.Fish) {
    const base = implication.line === "row" ? "rows" : "columns";
    const cover = implication.line === "row" ? "columns" : "rows";
    return {
      summary: `${implication.digit} forms a ${result.technique} across ${base} ${implication.baseSet.map((index) => index + 1).join(", ")}.`,
      explanation: `Those ${base} restrict the candidate to the same ${cover}, so it can be removed elsewhere in the cover set.`,
    };
  }
  return { summary: `${result.technique} produces a logical candidate elimination.`, explanation: "Review the highlighted pattern to see why the target candidates cannot remain." };
}

function eliminationHint(grid: SudokuGrid, result: EliminationResult): Hint | null {
  const targets = result.eliminations.flatMap(({ digit, coords }) => coords.map((coord) => ({ cell: coordCell(coord), digit })));
  if (!targets.length) return null;
  const evidence = eliminationEvidence(grid, result, targets);
  const text = eliminationText(result, evidence);
  return {
    id: `sudoku-master-${result.technique}-${targets.map(({ cell, digit }) => `${cell}-${digit}`).join("-")}`,
    technique: titleCaseTechnique(result.technique),
    summary: text.summary,
    explanation: text.explanation,
    kind: "eliminate",
    evidence,
    targets,
  };
}

export function findHint(values: readonly string[], eliminated: readonly number[][] = []): Hint | null {
  const grid = toGrid(values, eliminated);
  const solvingFinders = [solveFullHouse, solveLastDigit, solveNakedSingle, solveHiddenSingle];
  for (const finder of solvingFinders) {
    const result = finder(grid)[0];
    if (result) return solvingHint(grid, result);
  }

  const eliminationFinders = [
    () => eliminateLockedCandidates(grid),
    () => eliminateNakedSubset(grid, SubsetType.Pair),
    () => eliminateHiddenSubset(grid, SubsetType.Pair),
    () => eliminateNakedSubset(grid, SubsetType.Triple),
    () => eliminateHiddenSubset(grid, SubsetType.Triple),
    () => eliminateNakedSubset(grid, SubsetType.Quadruple),
    () => eliminateHiddenSubset(grid, SubsetType.Quadruple),
    () => eliminateBasicFish(grid, SubsetType.Pair),
    () => eliminateBasicFish(grid, SubsetType.Triple),
    () => eliminateBasicFish(grid, SubsetType.Quadruple),
  ];
  for (const finder of eliminationFinders) {
    const result = finder()[0];
    if (result) return eliminationHint(grid, result);
  }
  return null;
}
