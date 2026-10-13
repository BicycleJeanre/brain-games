import type { CrosswordClue, GridPoint, Puzzle, WordSearchPuzzle } from "./types.ts";

const pointKey = ({ x, y }: GridPoint) => `${x}:${y}`;

export function wordPath(start: GridPoint, end: GridPoint): GridPoint[] {
  const dx = Math.sign(end.x - start.x);
  const dy = Math.sign(end.y - start.y);
  const distance = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y));
  if (!distance || (![0, distance].includes(Math.abs(end.x - start.x)) || ![0, distance].includes(Math.abs(end.y - start.y)))) return [];
  return Array.from({ length: distance + 1 }, (_, index) => ({ x: start.x + dx * index, y: start.y + dy * index }));
}

export function findWord(puzzle: WordSearchPuzzle, path: GridPoint[]) {
  if (!path.length) return null;
  const forward = path.map(pointKey).join("|");
  const reverse = [...path].reverse().map(pointKey).join("|");
  return puzzle.words.find((word) => {
    const expected = word.path.map(pointKey).join("|");
    return expected === forward || expected === reverse;
  }) ?? null;
}

export function crosswordCells(clue: CrosswordClue): number[] {
  return [...clue.answer].map((_, offset) => clue.direction === "across"
    ? clue.row * 100 + clue.column + offset
    : (clue.row + offset) * 100 + clue.column);
}

export function isPuzzleComplete(puzzle: Puzzle, foundWordIds: string[], entries: string[]) {
  if (puzzle.kind === "word-search") return puzzle.words.every((word) => foundWordIds.includes(word.id));
  return puzzle.grid.every((row, y) => [...row].every((letter, x) => letter === "#" || entries[y * puzzle.columns + x] === letter));
}

export function validatePuzzle(puzzle: Puzzle) {
  if (puzzle.grid.length !== puzzle.rows || puzzle.grid.some((row) => row.length !== puzzle.columns)) throw new Error(`Invalid grid for ${puzzle.id}`);
  if (puzzle.kind === "word-search") {
    for (const word of puzzle.words) {
      const actual = word.path.map(({ x, y }) => puzzle.grid[y]?.[x]).join("");
      if (actual !== word.label) throw new Error(`Invalid word path for ${puzzle.id}/${word.id}`);
    }
  } else {
    for (const clue of puzzle.clues) {
      const actual = [...clue.answer].map((_, offset) => puzzle.grid[clue.row + (clue.direction === "down" ? offset : 0)]?.[clue.column + (clue.direction === "across" ? offset : 0)]).join("");
      if (actual !== clue.answer) throw new Error(`Invalid clue path for ${puzzle.id}/${clue.number}`);
    }
  }
}
