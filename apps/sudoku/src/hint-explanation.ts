import type { Hint } from "./types.ts";

export interface ContextualHintExplanation {
  title: string;
  definition?: string;
  roles?: HintCellRole[];
  steps: string[];
  conclusion: string;
}

export interface HintCellRole {
  cell: number;
  label: string;
  badge: string;
  detail: string;
}

export interface ContextualHintContext {
  values?: readonly string[];
  givens?: string;
  candidates?: readonly (readonly number[])[];
}

const compactCell = (cell: number) => `R${Math.floor(cell / 9) + 1}C${cell % 9 + 1}`;
const rowOf = (cell: number) => Math.floor(cell / 9);
const columnOf = (cell: number) => cell % 9;
const boxOf = (cell: number) => Math.floor(rowOf(cell) / 3) * 3 + Math.floor(columnOf(cell) / 3);

function lineHouse(a: number, b: number): string | null {
  if (rowOf(a) === rowOf(b)) return `Row ${rowOf(a) + 1}`;
  if (columnOf(a) === columnOf(b)) return `Column ${columnOf(a) + 1}`;
  return null;
}

function sharedHouse(a: number, b: number): string | null {
  return lineHouse(a, b) || (boxOf(a) === boxOf(b) ? `Box ${boxOf(a) + 1}` : null);
}

function cellList(cells: readonly number[]): string {
  const labels = [...new Set(cells)].map(compactCell);
  if (labels.length <= 1) return labels[0] || "the highlighted cell";
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function targets(hint: Hint): string {
  return hint.targets.map(({ cell, digit }) => `${digit} at ${compactCell(cell)}`).join(", ");
}

function actionConclusion(hint: Hint): string {
  if (hint.kind === "place") return `Place ${targets(hint)}.`;
  return `Remove ${targets(hint)}.`;
}

const candidateText = (digits: readonly number[]) => digits.join("/");

function viewFrom(cell: number, other: number): string {
  return sharedHouse(cell, other) || "a shared unit";
}

function xyWingExplanation(hint: Hint, context: ContextualHintContext): ContextualHintExplanation | null {
  const targetDigit = hint.targets[0]?.digit;
  const evidence = [...new Set(hint.evidence)];
  if (!targetDigit || evidence.length !== 3 || !context.candidates) return null;
  const pivot = evidence.find((cell) => {
    const digits = context.candidates?.[cell] || [];
    return digits.length === 2 && !digits.includes(targetDigit);
  });
  const wings = evidence.filter((cell) => cell !== pivot && (context.candidates?.[cell] || []).length === 2 && (context.candidates?.[cell] || []).includes(targetDigit));
  if (pivot === undefined || wings.length !== 2 || wings.some((wing) => !sharedHouse(pivot, wing))) return null;
  const pivotDigits = context.candidates[pivot];
  const firstOther = context.candidates[wings[0]].find((digit) => digit !== targetDigit);
  const secondOther = context.candidates[wings[1]].find((digit) => digit !== targetDigit);
  if (!firstOther || !secondOther || firstOther === secondOther || !pivotDigits.includes(firstOther) || !pivotDigits.includes(secondOther)) return null;
  const sightLines = hint.targets.map(({ cell }) => `${compactCell(cell)} sees Wing A through ${viewFrom(cell, wings[0])} and Wing B through ${viewFrom(cell, wings[1])}`);
  return {
    title: "How this XY-Wing works",
    definition: `An XY-Wing has one two-candidate pivot and two two-candidate wings. The pivot sees both wings. Each wing shares one pivot digit, and both wings share a third digit. “Sees” means sharing a row, column, or box.`,
    roles: [
      { cell: pivot, label: "Pivot", badge: "P", detail: `${compactCell(pivot)} · candidates ${candidateText(pivotDigits)}` },
      { cell: wings[0], label: "Wing A", badge: "W1", detail: `${compactCell(wings[0])} · candidates ${candidateText(context.candidates[wings[0]])}` },
      { cell: wings[1], label: "Wing B", badge: "W2", detail: `${compactCell(wings[1])} · candidates ${candidateText(context.candidates[wings[1]])}` },
    ],
    steps: [
      `${compactCell(pivot)} is the pivot because it contains ${candidateText(pivotDigits)} and sees both wings: ${compactCell(wings[0])} through ${viewFrom(pivot, wings[0])}, and ${compactCell(wings[1])} through ${viewFrom(pivot, wings[1])}.`,
      `If the pivot is ${firstOther}, Wing A cannot be ${firstOther}, so Wing A must be ${targetDigit}. If the pivot is ${secondOther}, Wing B cannot be ${secondOther}, so Wing B must be ${targetDigit}. The pivot must take one of those two values, so at least one wing is ${targetDigit}.`,
      `${sightLines.join("; ")}. Each target therefore sees whichever wing becomes ${targetDigit}.`,
    ],
    conclusion: `Remove ${targetDigit} from ${cellList(hint.targets.map(({ cell }) => cell))}.`,
  };
}

function xyzWingExplanation(hint: Hint, context: ContextualHintContext): ContextualHintExplanation | null {
  const targetDigit = hint.targets[0]?.digit;
  const evidence = [...new Set(hint.evidence)];
  if (!targetDigit || evidence.length !== 3 || !context.candidates) return null;
  const pivot = evidence.find((cell) => (context.candidates?.[cell] || []).length === 3 && (context.candidates?.[cell] || []).includes(targetDigit));
  const wings = evidence.filter((cell) => cell !== pivot && (context.candidates?.[cell] || []).length === 2 && (context.candidates?.[cell] || []).includes(targetDigit));
  if (pivot === undefined || wings.length !== 2 || wings.some((wing) => !sharedHouse(pivot, wing))) return null;
  const pivotDigits = context.candidates[pivot];
  const firstOther = context.candidates[wings[0]].find((digit) => digit !== targetDigit);
  const secondOther = context.candidates[wings[1]].find((digit) => digit !== targetDigit);
  if (!firstOther || !secondOther || firstOther === secondOther || !pivotDigits.includes(firstOther) || !pivotDigits.includes(secondOther)) return null;
  const sightLines = hint.targets.map(({ cell }) => `${compactCell(cell)} sees the pivot through ${viewFrom(cell, pivot)}, Wing A through ${viewFrom(cell, wings[0])}, and Wing B through ${viewFrom(cell, wings[1])}`);
  return {
    title: "How this XYZ-Wing works",
    definition: `An XYZ-Wing has a three-candidate pivot and two two-candidate wings. Each wing shares one non-Z digit with the pivot, while the pivot and both wings all contain Z. A target that sees all three pattern cells cannot be Z.`,
    roles: [
      { cell: pivot, label: "Pivot", badge: "P", detail: `${compactCell(pivot)} · candidates ${candidateText(pivotDigits)}` },
      { cell: wings[0], label: "Wing A", badge: "W1", detail: `${compactCell(wings[0])} · candidates ${candidateText(context.candidates[wings[0]])}` },
      { cell: wings[1], label: "Wing B", badge: "W2", detail: `${compactCell(wings[1])} · candidates ${candidateText(context.candidates[wings[1]])}` },
    ],
    steps: [
      `${compactCell(pivot)} is the pivot because it has the three candidates ${candidateText(pivotDigits)} and sees both two-candidate wings. The shared Z digit is ${targetDigit}.`,
      `If the pivot is ${targetDigit}, Z is already in the pivot. If it is ${firstOther}, Wing A is forced to ${targetDigit}. If it is ${secondOther}, Wing B is forced to ${targetDigit}. One of the three highlighted pattern cells must therefore be ${targetDigit}.`,
      `${sightLines.join("; ")}. Each target sees all three possible places for ${targetDigit}.`,
    ],
    conclusion: `Remove ${targetDigit} from ${cellList(hint.targets.map(({ cell }) => cell))}.`,
  };
}

function wWingExplanation(hint: Hint, context: ContextualHintContext): ContextualHintExplanation | null {
  const targetDigit = hint.targets[0]?.digit;
  const evidence = [...new Set(hint.evidence)];
  if (!targetDigit || evidence.length < 4 || !context.candidates) return null;
  let wings: [number, number] | null = null;
  for (let first = 0; first < evidence.length && !wings; first++) {
    const firstDigits = context.candidates[evidence[first]] || [];
    if (firstDigits.length !== 2 || !firstDigits.includes(targetDigit)) continue;
    for (let second = first + 1; second < evidence.length; second++) {
      const secondDigits = context.candidates[evidence[second]] || [];
      if (secondDigits.length === 2 && firstDigits.every((digit) => secondDigits.includes(digit))) {
        wings = [evidence[first], evidence[second]];
        break;
      }
    }
  }
  if (!wings) return null;
  const wingDigits = context.candidates[wings[0]];
  const linkDigit = wingDigits.find((digit) => digit !== targetDigit);
  const linkEnds = evidence.filter((cell) => !wings?.includes(cell) && (context.candidates?.[cell] || []).includes(linkDigit || 0));
  if (!linkDigit || linkEnds.length < 2) return null;
  let linked: { first: number; second: number; house: string } | null = null;
  for (let first = 0; first < linkEnds.length && !linked; first++) {
    for (let second = first + 1; second < linkEnds.length; second++) {
      const house = sharedHouse(linkEnds[first], linkEnds[second]);
      if (!house) continue;
      const direct = sharedHouse(linkEnds[first], wings[0]) && sharedHouse(linkEnds[second], wings[1]);
      const crossed = sharedHouse(linkEnds[first], wings[1]) && sharedHouse(linkEnds[second], wings[0]);
      if (direct) linked = { first: linkEnds[first], second: linkEnds[second], house };
      else if (crossed) linked = { first: linkEnds[second], second: linkEnds[first], house };
    }
  }
  if (!linked) return null;
  const sightLines = hint.targets.map(({ cell }) => `${compactCell(cell)} sees Wing A through ${viewFrom(cell, wings[0])} and Wing B through ${viewFrom(cell, wings[1])}`);
  return {
    title: "How this W-Wing works",
    definition: `A W-Wing has no pivot. It uses two separated two-candidate wings with the same pair (${candidateText(wingDigits)}). A strong link on ${linkDigit} connects them indirectly: in ${linked.house}, ${linkDigit} can go in exactly one of two link-end cells. That forces at least one wing to take the other digit, ${targetDigit}.`,
    roles: [
      { cell: wings[0], label: "Wing A", badge: "W1", detail: `${compactCell(wings[0])} · candidates ${candidateText(wingDigits)}` },
      { cell: wings[1], label: "Wing B", badge: "W2", detail: `${compactCell(wings[1])} · candidates ${candidateText(context.candidates[wings[1]])}` },
      { cell: linked.first, label: "Link end A", badge: "L1", detail: `${compactCell(linked.first)} · sees Wing A through ${viewFrom(linked.first, wings[0])}` },
      { cell: linked.second, label: "Link end B", badge: "L2", detail: `${compactCell(linked.second)} · sees Wing B through ${viewFrom(linked.second, wings[1])}` },
    ],
    steps: [
      `${compactCell(wings[0])} and ${compactCell(wings[1])} are the wings because both contain only ${candidateText(wingDigits)}. Unlike an XY-Wing, a W-Wing does not have a pivot.`,
      `${compactCell(linked.first)} and ${compactCell(linked.second)} are the two ends of the strong link for ${linkDigit} in ${linked.house}. “Strong link” means ${linkDigit} must be in one of those two cells.`,
      `If ${compactCell(linked.first)} is ${linkDigit}, Wing A sees it and cannot be ${linkDigit}, so Wing A is ${targetDigit}. If ${compactCell(linked.second)} is ${linkDigit}, Wing B is forced to ${targetDigit}. Therefore at least one wing is ${targetDigit}.`,
      `${sightLines.join("; ")}. Each target sees both wings, so it sees whichever wing becomes ${targetDigit}.`,
    ],
    conclusion: `Remove ${targetDigit} from ${cellList(hint.targets.map(({ cell }) => cell))}.`,
  };
}

function skyscraperExplanation(hint: Hint): ContextualHintExplanation | null {
  const digit = hint.targets[0]?.digit;
  const evidence = [...new Set(hint.evidence)];
  if (!digit || hint.kind !== "eliminate" || evidence.length !== 4 || hint.targets.some((target) => target.digit !== digit)) return null;

  let shape: { bases: [number, number]; roofs: [number, number]; strongHouses: [string, string]; baseHouse: string } | null = null;
  for (let first = 0; first < evidence.length && !shape; first++) {
    for (let second = first + 1; second < evidence.length && !shape; second++) {
      const bases: [number, number] = [evidence[first], evidence[second]];
      const baseHouse = lineHouse(...bases);
      if (!baseHouse) continue;
      const remaining = evidence.filter((cell) => !bases.includes(cell));
      for (const roofs of [remaining, [...remaining].reverse()] as number[][]) {
        const firstHouse = lineHouse(bases[0], roofs[0]);
        const secondHouse = lineHouse(bases[1], roofs[1]);
        if (!firstHouse || !secondHouse || firstHouse === baseHouse || secondHouse === baseHouse || firstHouse === secondHouse) continue;
        shape = { bases, roofs: roofs as [number, number], strongHouses: [firstHouse, secondHouse], baseHouse };
        break;
      }
    }
  }
  if (!shape) return null;

  const [firstBase, secondBase] = shape.bases;
  const [firstRoof, secondRoof] = shape.roofs;
  const sightLines = hint.targets.map(({ cell }) => {
    const firstView = sharedHouse(cell, firstRoof);
    const secondView = sharedHouse(cell, secondRoof);
    return firstView && secondView
      ? `${compactCell(cell)} sees ${compactCell(firstRoof)} through ${firstView} and ${compactCell(secondRoof)} through ${secondView}`
      : `${compactCell(cell)} sees both roofs`;
  });

  return {
    title: "Why does this Skyscraper eliminate these candidates?",
    steps: [
      `In ${shape.strongHouses[0]}, ${digit} is restricted to ${compactCell(firstBase)} or ${compactCell(firstRoof)}. In ${shape.strongHouses[1]}, it is restricted to ${compactCell(secondBase)} or ${compactCell(secondRoof)}. These are the two strong links.`,
      `${compactCell(firstBase)} and ${compactCell(secondBase)} are the bases. They share ${shape.baseHouse}, so they cannot both be ${digit}; at least one base must be false.`,
      `If ${compactCell(firstBase)} is not ${digit}, its strong link forces ${compactCell(firstRoof)} to be ${digit}. If ${compactCell(secondBase)} is not ${digit}, its strong link forces ${compactCell(secondRoof)} to be ${digit}. Therefore at least one roof is ${digit}.`,
      `${sightLines.join("; ")}. Because every target sees both roofs, it sees whichever roof becomes ${digit}.`,
    ],
    conclusion: `Remove ${digit} from ${cellList(hint.targets.map(({ cell }) => cell))}.`,
  };
}

function emptyRectangleExplanation(hint: Hint): ContextualHintExplanation | null {
  const digit = hint.targets[0]?.digit;
  const target = hint.targets[0]?.cell;
  if (!digit || target === undefined) return null;

  const byBox = new Map<number, number[]>();
  for (const cell of hint.evidence) {
    const box = boxOf(cell);
    byBox.set(box, [...(byBox.get(box) || []), cell]);
  }
  const blockEntry = [...byBox.entries()].sort((a, b) => b[1].length - a[1].length).find(([, cells]) => cells.length >= 2);
  if (!blockEntry) return null;
  const [box, blockCells] = blockEntry;
  const blockSet = new Set(blockCells);
  const outside = hint.evidence.filter((cell) => !blockSet.has(cell));

  let armRow = -1;
  let armColumn = -1;
  const rows = [...new Set(blockCells.map(rowOf))];
  const columns = [...new Set(blockCells.map(columnOf))];
  for (const row of rows) {
    for (const column of columns) {
      const coversPattern = blockCells.every((cell) => rowOf(cell) === row || columnOf(cell) === column);
      const hasRowArm = blockCells.some((cell) => rowOf(cell) === row && columnOf(cell) !== column);
      const hasColumnArm = blockCells.some((cell) => columnOf(cell) === column && rowOf(cell) !== row);
      if (coversPattern && hasRowArm && hasColumnArm) {
        armRow = row;
        armColumn = column;
        break;
      }
    }
    if (armRow >= 0) break;
  }

  const linked = outside.length >= 2 ? outside.slice(0, 2) : [];
  const sharedColumn = linked.length === 2 && columnOf(linked[0]) === columnOf(linked[1]);
  const sharedRow = linked.length === 2 && rowOf(linked[0]) === rowOf(linked[1]);
  if (armRow < 0 || armColumn < 0 || (!sharedColumn && !sharedRow)) return null;

  const rowArm = `Row ${armRow + 1}`;
  const columnArm = `Column ${armColumn + 1}`;
  const linkHouse = sharedColumn ? `Column ${columnOf(linked[0]) + 1}` : `Row ${rowOf(linked[0]) + 1}`;
  const armEnd = linked.find((cell) => sharedColumn ? rowOf(cell) === armRow : columnOf(cell) === armColumn);
  const otherEnd = linked.find((cell) => cell !== armEnd);
  if (armEnd === undefined || otherEnd === undefined) return null;

  const directHouse = rowOf(otherEnd) === rowOf(target)
    ? `Row ${rowOf(target) + 1}`
    : `Column ${columnOf(target) + 1}`;
  const forcedArm = sharedColumn ? columnArm : rowArm;
  const clearedArm = sharedColumn ? rowArm : columnArm;

  return {
    title: "Why is this an Empty Rectangle?",
    steps: [
      `In Box ${box + 1}, every highlighted ${digit} candidate (${cellList(blockCells)}) lies on ${rowArm} or ${columnArm}. Those two arms inside one box are the Empty Rectangle shape.`,
      `${compactCell(armEnd)} and ${compactCell(otherEnd)} form the outside strong link for ${digit} in ${linkHouse}: one of those two ends must contain ${digit}.`,
      `If ${compactCell(armEnd)} is ${digit}, it clears the ${clearedArm} arm and forces the box's ${digit} onto ${forcedArm}, which sees ${compactCell(target)}. If ${compactCell(otherEnd)} is ${digit}, it sees ${compactCell(target)} directly through ${directHouse}.`,
      `Both possible ends affect the same outlined target. That is the candidate you can now test yourself.`,
    ],
    conclusion: `Remove ${digit} from ${compactCell(target)}.`,
  };
}

function avoidableRectangleType1Explanation(hint: Hint, context: ContextualHintContext): ContextualHintExplanation | null {
  const target = hint.targets[0];
  const cells = [...new Set([...hint.evidence, ...hint.targets.map(({ cell }) => cell)])].sort((a, b) => a - b);
  const rows = [...new Set(cells.map(rowOf))];
  const columns = [...new Set(cells.map(columnOf))];
  const boxes = [...new Set(cells.map(boxOf))];
  if (!target || hint.kind !== "eliminate" || cells.length !== 4 || rows.length !== 2 || columns.length !== 2 || boxes.length !== 2 || !context.values) return null;

  const filledCorners = cells.filter((cell) => cell !== target.cell && context.values?.[cell]);
  const digits = [...new Set(filledCorners.map((cell) => Number(context.values?.[cell])))];
  const otherDigit = digits.find((digit) => digit !== target.digit);
  if (filledCorners.length !== 3 || digits.length !== 2 || !otherDigit) return null;

  const cornerValues = filledCorners.map((cell) => `${compactCell(cell)}=${context.values?.[cell]}`).join(", ");
  const editable = context.givens ? filledCorners.every((cell) => context.givens?.[cell] === "0") : true;
  const remaining = (context.candidates?.[target.cell] || []).filter((digit) => digit !== target.digit);
  const result = remaining.length === 1
    ? `With ${target.digit} removed, the only displayed candidate left is ${remaining[0]}, so ${compactCell(target.cell)} becomes ${remaining[0]}.`
    : `Therefore ${target.digit} must be eliminated from ${compactCell(target.cell)}.`;

  return {
    title: "Why is this an Avoidable Rectangle Type 1?",
    steps: [
      `${cellList(cells)} are the four corners in Rows ${rows.map((row) => row + 1).join(" and ")} and Columns ${columns.map((column) => column + 1).join(" and ")}. The three filled corners are ${cornerValues}.`,
      `If ${compactCell(target.cell)} were ${target.digit}, the rectangle would alternate ${target.digit}–${otherDigit} / ${otherDigit}–${target.digit}.`,
      `${editable ? "Because the three filled corners are player entries rather than original givens, " : ""}all four ${target.digit}s and ${otherDigit}s could then be swapped while every row, column, box, and original clue still worked. That would give the puzzle a second solution. It is called “avoidable” because the filled editable corners let us prevent that ambiguity.`,
    ],
    conclusion: result,
  };
}

function hiddenRectangleExplanation(hint: Hint, context: ContextualHintContext): ContextualHintExplanation | null {
  const target = hint.targets[0];
  const cells = [...new Set([...hint.evidence, ...hint.targets.map(({ cell }) => cell)])].sort((a, b) => a - b);
  const rows = [...new Set(cells.map(rowOf))];
  const columns = [...new Set(cells.map(columnOf))];
  const boxes = [...new Set(cells.map(boxOf))];
  if (!target || hint.kind !== "eliminate" || cells.length !== 4 || rows.length !== 2 || columns.length !== 2 || boxes.length !== 2 || !context.candidates) return null;

  const opposite = cells.find((cell) => rowOf(cell) !== rowOf(target.cell) && columnOf(cell) !== columnOf(target.cell));
  const rowMate = cells.find((cell) => rowOf(cell) === rowOf(target.cell) && cell !== target.cell);
  const columnMate = cells.find((cell) => columnOf(cell) === columnOf(target.cell) && cell !== target.cell);
  if (opposite === undefined || rowMate === undefined || columnMate === undefined) return null;

  const pair = [...(context.candidates[opposite] || [])];
  const strongDigit = pair.find((digit) => digit !== target.digit);
  if (pair.length !== 2 || !pair.includes(target.digit) || !strongDigit) return null;

  const rowStrongCells = context.candidates
    .map((digits, cell) => ({ digits, cell }))
    .filter(({ digits, cell }) => rowOf(cell) === rowOf(target.cell) && digits.includes(strongDigit))
    .map(({ cell }) => cell);
  const columnStrongCells = context.candidates
    .map((digits, cell) => ({ digits, cell }))
    .filter(({ digits, cell }) => columnOf(cell) === columnOf(target.cell) && digits.includes(strongDigit))
    .map(({ cell }) => cell);
  const expectedRow = new Set([rowMate, target.cell]);
  const expectedColumn = new Set([columnMate, target.cell]);
  if (rowStrongCells.length !== 2 || columnStrongCells.length !== 2 || rowStrongCells.some((cell) => !expectedRow.has(cell)) || columnStrongCells.some((cell) => !expectedColumn.has(cell))) return null;

  return {
    title: "Why is this a Hidden Rectangle?",
    steps: [
      `${cellList(cells)} are the four corners of a rectangle in Rows ${rows.map((row) => row + 1).join(" and ")} and Columns ${columns.map((column) => column + 1).join(" and ")}. The opposite corner ${compactCell(opposite)} is restricted to the pair ${pair.join("/")}.`,
      `In Row ${rowOf(target.cell) + 1}, ${strongDigit} can appear only at ${compactCell(rowMate)} or ${compactCell(target.cell)}. In Column ${columnOf(target.cell) + 1}, ${strongDigit} can appear only at ${compactCell(columnMate)} or ${compactCell(target.cell)}. Those are the two strong links that make the rectangle “hidden.”`,
      `Assume ${compactCell(target.cell)} were ${target.digit}. It could not be ${strongDigit}, so the row strong link would force ${compactCell(rowMate)}=${strongDigit}, and the column strong link would force ${compactCell(columnMate)}=${strongDigit}. That leaves ${compactCell(opposite)}=${target.digit}.`,
      `The four corners would then use only ${target.digit} and ${strongDigit}, and all four values could be swapped ${target.digit}↔${strongDigit} while every row, column, box, and clue still worked. That would give the puzzle two solutions.`,
      `Because this puzzle has one solution, that assumption is impossible. Use the contradiction to decide which candidate cannot remain in the outlined corner.`,
    ],
    conclusion: `Remove ${target.digit} from ${compactCell(target.cell)}.`,
  };
}

function bugPlusOneExplanation(hint: Hint, context: ContextualHintContext): ContextualHintExplanation | null {
  if (hint.technique !== "Bivalue Universal Grave + 1" || hint.kind !== "eliminate" || !context.candidates) return null;
  const targetCells = [...new Set(hint.targets.map(({ cell }) => cell))];
  if (targetCells.length !== 1) return null;
  const focus = targetCells[0];
  const focusCandidates = context.candidates[focus] || [];
  const removed = [...new Set(hint.targets.map(({ digit }) => digit))];
  const survivors = focusCandidates.filter((digit) => !removed.includes(digit));
  if (focusCandidates.length !== 3 || survivors.length !== 1) return null;
  const extra = survivors[0];
  const row = rowOf(focus);
  const column = columnOf(focus);
  const box = boxOf(focus);
  const rowCells = Array.from({ length: 9 }, (_, offset) => row * 9 + offset);
  const columnCells = Array.from({ length: 9 }, (_, offset) => offset * 9 + column);
  const boxRow = Math.floor(row / 3) * 3;
  const boxColumn = Math.floor(column / 3) * 3;
  const boxCells = Array.from({ length: 9 }, (_, offset) => (boxRow + Math.floor(offset / 3)) * 9 + boxColumn + (offset % 3));
  const occurrenceCount = (cells: readonly number[]) => cells.filter((cell) => (context.candidates?.[cell] || []).includes(extra)).length;
  const counts = [occurrenceCount(rowCells), occurrenceCount(columnCells), occurrenceCount(boxCells)];
  const shownCandidates = context.candidates.filter((digits) => digits.length > 0);
  const otherShownCellsAreBivalue = shownCandidates.every((digits) => digits === focusCandidates || digits.length === 2);

  return {
    title: "How this BUG +1 works",
    definition: "Bivalue means a cell has two candidates. A BUG is a near-finished grid where every unsolved cell is bivalue and every candidate is paired evenly in its row, column, and box. That balanced pattern would allow two solutions. BUG +1 has one exceptional cell with a third candidate; that extra candidate must break the ambiguity.",
    roles: [{
      cell: focus,
      label: "The +1 cell",
      badge: "+1",
      detail: `${compactCell(focus)} · the only cell with three candidates: ${candidateText(focusCandidates)}`,
    }],
    steps: [
      `${compactCell(focus)} is the exception because it has ${candidateText(focusCandidates)}. ${otherShownCellsAreBivalue ? "Every other unsolved cell shown has exactly two candidates." : "The remaining candidate cells form the bivalue pattern checked by the solver."}`,
      `The candidate ${extra} is the “+1”: it appears ${counts[0]} times in Row ${row + 1}, ${counts[1]} times in Column ${column + 1}, and ${counts[2]} times in Box ${box + 1}. Those odd counts are what break the otherwise paired pattern.`,
      `If ${compactCell(focus)} used one of its other candidates (${removed.join(" or ")}), ${extra} would disappear from this cell. The grid would fall back to the balanced BUG pattern, leaving two interchangeable solutions.`,
      `This puzzle has one solution, so the balanced alternative is impossible. The +1 candidate is therefore the value that must remain in ${compactCell(focus)}.`,
    ],
    conclusion: `Remove ${removed.join(" and ")} from ${compactCell(focus)}. ${extra} is the only candidate left.`,
  };
}

export function contextualHintExplanation(hint: Hint, context: ContextualHintContext = {}): ContextualHintExplanation {
  if (hint.technique === "Bivalue Universal Grave + 1") {
    const explanation = bugPlusOneExplanation(hint, context);
    if (explanation) return explanation;
  }
  if (hint.technique === "XY-Wing") {
    const explanation = xyWingExplanation(hint, context);
    if (explanation) return explanation;
  }
  if (hint.technique === "XYZ-Wing") {
    const explanation = xyzWingExplanation(hint, context);
    if (explanation) return explanation;
  }
  if (hint.technique === "W-Wing") {
    const explanation = wWingExplanation(hint, context);
    if (explanation) return explanation;
  }
  if (hint.technique === "Skyscraper") {
    const explanation = skyscraperExplanation(hint);
    if (explanation) return explanation;
  }
  if (hint.technique === "Empty Rectangle") {
    const explanation = emptyRectangleExplanation(hint);
    if (explanation) return explanation;
  }
  if (hint.technique === "Avoidable Rectangle Type 1") {
    const explanation = avoidableRectangleType1Explanation(hint, context);
    if (explanation) return explanation;
  }
  if (hint.technique === "Hidden Rectangle") {
    const explanation = hiddenRectangleExplanation(hint, context);
    if (explanation) return explanation;
  }

  const evidence = cellList(hint.evidence);
  if (hint.technique === "Full house" || hint.technique === "Last digit" || hint.technique.includes("single")) {
    return {
      title: `Why is this a ${hint.technique}?`,
      steps: [
        `The highlighted cells around ${evidence} leave the focus cell with the defining restriction for a ${hint.technique}.`,
        `Use that restriction to decide which value belongs in the outlined cell.`,
      ],
      conclusion: actionConclusion(hint),
    };
  }
  if (hint.technique === "Locked candidates") {
    return {
      title: "Why are these Locked Candidates?",
      steps: [
        hint.variant === "pointing"
          ? `The highlighted occurrences at ${evidence} all lie in one box and on the same row or column.`
          : `The highlighted occurrences at ${evidence} all lie on one row or column and inside the same box.`,
        `Because the candidate must stay in that overlap, it cannot also remain in the outlined cell outside the overlap.`,
      ],
      conclusion: actionConclusion(hint),
    };
  }
  if (hint.technique.includes("pair") || hint.technique.includes("triple") || hint.technique.includes("quadruple")) {
    return {
      title: `Why is this a ${hint.technique}?`,
      steps: [
        `${evidence} are the highlighted cells that contain the restricted candidate set defining this ${hint.technique}.`,
        `That set occupies all of its available places, so the same candidates cannot remain in the outlined target outside the set.`,
      ],
      conclusion: actionConclusion(hint),
    };
  }
  if (hint.technique.includes("Wing")) {
    return {
      title: `How this ${hint.technique} works`,
      definition: "A wing pattern links a small set of restricted candidate cells so that every possible branch forces the same candidate outcome.",
      steps: [
        `${evidence} are the cells HoDoKu identified as the ${hint.technique} pattern. Their exact roles could not be reconstructed from the displayed candidates, so they are not labelled as a pivot or wing without proof.`,
        `Brain Games does not yet have a verified cell-by-cell walkthrough for this variant. The exact deduction remains hidden rather than presenting an unproved explanation.`,
      ],
      conclusion: actionConclusion(hint),
    };
  }
  if (hint.links?.length) {
    const links = hint.links.map((link) => `${compactCell(link.from.cell)}(${link.from.digit}) ${link.strong ? "strongly" : "weakly"} links to ${compactCell(link.to.cell)}(${link.to.digit})`);
    return {
      title: `Why is this a ${hint.technique}?`,
      definition: "A strong link means one endpoint must be true. A weak link means both endpoints cannot be true. Follow the links in order and look for the outcome shared by every possible branch.",
      steps: [...links, "The linked chain reaches the same outlined target from every valid starting state. Decide which candidate that makes impossible before revealing the deduction."],
      conclusion: actionConclusion(hint),
    };
  }
  return {
    title: `About this ${hint.technique} hint`,
    definition: "This is an advanced pattern verified by the solver, but Brain Games does not yet have a verified cell-by-cell lesson for this exact technique.",
    steps: [
      `The highlighted cells are the solver's evidence for the pattern; the outlined cell is where its consequence occurs.`,
      `The exact deduction is intentionally hidden. Reveal it only if you want the answer; this panel will not pretend that naming the pattern is an explanation.`,
    ],
    conclusion: actionConclusion(hint),
  };
}
