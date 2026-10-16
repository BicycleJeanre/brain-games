import type { Hint } from "./types.ts";

export interface ContextualHintExplanation {
  title: string;
  steps: string[];
}

const compactCell = (cell: number) => `R${Math.floor(cell / 9) + 1}C${cell % 9 + 1}`;
const rowOf = (cell: number) => Math.floor(cell / 9);
const columnOf = (cell: number) => cell % 9;
const boxOf = (cell: number) => Math.floor(rowOf(cell) / 3) * 3 + Math.floor(columnOf(cell) / 3);

function cellList(cells: readonly number[]): string {
  const labels = [...new Set(cells)].map(compactCell);
  if (labels.length <= 1) return labels[0] || "the highlighted cell";
  return `${labels.slice(0, -1).join(", ")} and ${labels.at(-1)}`;
}

function targets(hint: Hint): string {
  return hint.targets.map(({ cell, digit }) => `${digit} at ${compactCell(cell)}`).join(", ");
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
      `Both possible ends eliminate ${digit} from ${compactCell(target)}, which is why that candidate is the hint's answer.`,
    ],
  };
}

export function contextualHintExplanation(hint: Hint): ContextualHintExplanation {
  if (hint.technique === "Empty Rectangle") {
    const explanation = emptyRectangleExplanation(hint);
    if (explanation) return explanation;
  }

  const evidence = cellList(hint.evidence);
  const target = targets(hint);
  if (hint.technique === "Full house" || hint.technique === "Last digit" || hint.technique.includes("single")) {
    return {
      title: `Why is this a ${hint.technique}?`,
      steps: [
        `The highlighted cells around ${evidence} leave the focus cell with the defining restriction for a ${hint.technique}.`,
        `Following that restriction produces ${target}.`,
      ],
    };
  }
  if (hint.technique === "Locked candidates") {
    return {
      title: "Why are these Locked Candidates?",
      steps: [
        hint.variant === "pointing"
          ? `The highlighted occurrences at ${evidence} all lie in one box and on the same row or column.`
          : `The highlighted occurrences at ${evidence} all lie on one row or column and inside the same box.`,
        `Because the candidate must stay in that overlap, the same candidate can be removed at ${target}.`,
      ],
    };
  }
  if (hint.technique.includes("pair") || hint.technique.includes("triple") || hint.technique.includes("quadruple")) {
    return {
      title: `Why is this a ${hint.technique}?`,
      steps: [
        `${evidence} are the highlighted cells that contain the restricted candidate set defining this ${hint.technique}.`,
        `That set occupies all of its available places, so the resulting deduction is ${target}.`,
      ],
    };
  }
  if (hint.technique.includes("Wing")) {
    return {
      title: `Why is this a ${hint.technique}?`,
      steps: [
        `${evidence} are the pivot and wing cells. Their shared candidates create the linked either-or pattern required for a ${hint.technique}.`,
        `Every valid branch of that pattern rules out ${target}.`,
      ],
    };
  }
  if (hint.links?.length) {
    const links = hint.links.map((link) => `${compactCell(link.from.cell)}(${link.from.digit}) ${link.strong ? "strongly" : "weakly"} links to ${compactCell(link.to.cell)}(${link.to.digit})`);
    return {
      title: `Why is this a ${hint.technique}?`,
      steps: [...links, `Following those links to their conclusion produces ${target}.`],
    };
  }
  return {
    title: `Why is this a ${hint.technique}?`,
    steps: [
      `${evidence} are the cells HoDoKu identified as the ${hint.technique} pattern in this grid.`,
      `Applying that pattern's constraint produces ${target}.`,
    ],
  };
}
