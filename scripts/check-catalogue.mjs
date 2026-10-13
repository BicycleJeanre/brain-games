import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const puzzles = JSON.parse(await readFile(new URL("../src/data/puzzles.json", import.meta.url), "utf8"));
const difficulties = ["Easy", "Medium", "Hard", "Diabolical"];
assert.ok(puzzles.length >= 100, "release catalogue must contain at least 100 puzzles");
assert.equal(new Set(puzzles.map((puzzle) => puzzle.id)).size, puzzles.length, "puzzle IDs must be unique");
assert.ok(puzzles.filter((puzzle) => puzzle.kind === "word-search").length >= 50, "catalogue must contain at least 50 word searches");
assert.ok(puzzles.filter((puzzle) => puzzle.kind === "crossword").length >= 50, "catalogue must contain at least 50 crosswords");

for (const difficulty of difficulties) {
  assert.ok(puzzles.filter((puzzle) => puzzle.difficulty === difficulty).length >= 20, `${difficulty} needs at least 20 puzzles`);
}

for (const puzzle of puzzles) {
  assert.ok(difficulties.includes(puzzle.difficulty), `${puzzle.id} has an invalid difficulty`);
  assert.equal(puzzle.grid.length, puzzle.rows, `${puzzle.id} has the wrong row count`);
  assert.ok(puzzle.grid.every((row) => row.length === puzzle.columns), `${puzzle.id} has the wrong column count`);
  assert.ok(puzzle.source?.name && puzzle.source?.url && puzzle.source?.licence && puzzle.source?.note, `${puzzle.id} lacks provenance`);
  if (puzzle.kind === "word-search") {
    assert.ok(puzzle.words.length >= 6, `${puzzle.id} needs at least six words`);
    for (const word of puzzle.words) {
      const actual = word.path.map(({ x, y }) => puzzle.grid[y]?.[x]).join("");
      assert.equal(actual, word.label, `${puzzle.id}/${word.id} has an invalid word path`);
    }
  } else {
    assert.ok(puzzle.clues.length >= 4, `${puzzle.id} needs at least four clues`);
    const used = new Set();
    for (const clue of puzzle.clues) {
      const actual = [...clue.answer].map((_, offset) => {
        const row = clue.row + (clue.direction === "down" ? offset : 0);
        const column = clue.column + (clue.direction === "across" ? offset : 0);
        used.add(`${row}:${column}`);
        return puzzle.grid[row]?.[column];
      }).join("");
      assert.equal(actual, clue.answer, `${puzzle.id}/${clue.number}-${clue.direction} has an invalid clue path`);
    }
    const openCells = puzzle.grid.flatMap((row, y) => [...row].map((letter, x) => letter === "#" ? null : `${y}:${x}`)).filter(Boolean);
    assert.ok(openCells.every((cell) => used.has(cell)), `${puzzle.id} contains an unclued cell`);
  }
}

const summary = Object.fromEntries(difficulties.map((difficulty) => [difficulty, puzzles.filter((puzzle) => puzzle.difficulty === difficulty).length]));
console.log(`Validated ${puzzles.length} puzzles (${JSON.stringify(summary)}).`);
