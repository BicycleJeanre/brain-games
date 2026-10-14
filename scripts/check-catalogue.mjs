import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const puzzles = JSON.parse(await readFile(new URL("../src/data/puzzles.json", import.meta.url), "utf8"));
const difficulties = ["Easy", "Medium", "Hard", "Diabolical"];
assert.ok(puzzles.length >= 100, "release catalogue must contain at least 100 puzzles");
assert.equal(new Set(puzzles.map((puzzle) => puzzle.id)).size, puzzles.length, "puzzle IDs must be unique");
assert.ok(puzzles.filter((puzzle) => puzzle.kind === "word-search").length >= 50, "catalogue must contain at least 50 word searches");
assert.ok(puzzles.filter((puzzle) => puzzle.kind === "crossword").length >= 50, "catalogue must contain at least 50 crosswords");
assert.ok(puzzles.filter((puzzle) => puzzle.kind === "word-grid").length >= 32, "catalogue must contain at least 32 Word Grids");
assert.ok(puzzles.filter((puzzle) => puzzle.kind === "word-grid" && puzzle.wordGridMode === "shuffle").length >= 16, "catalogue must contain at least 16 Letter Mix trays");

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
  } else if (puzzle.kind === "crossword") {
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
  } else {
    assert.ok(["adjacent", "shuffle"].includes(puzzle.wordGridMode), `${puzzle.id} has an invalid Word Grid mode`);
    assert.ok(puzzle.words.length >= 10, `${puzzle.id} needs at least ten accepted words`);
    const expectedTargets = { Easy: 8, Medium: 10, Hard: 12, Diabolical: 15 }[puzzle.difficulty];
    assert.equal(puzzle.roundWordIds.length, expectedTargets, `${puzzle.id} has the wrong target-word count`);
    assert.equal(new Set(puzzle.roundWordIds).size, puzzle.roundWordIds.length, `${puzzle.id} has duplicate target words`);
    assert.ok(puzzle.targetScore > 0, `${puzzle.id} needs a target score`);
    const targetWords = puzzle.roundWordIds.map((id) => puzzle.words.find((word) => word.id === id));
    assert.ok(targetWords.every(Boolean), `${puzzle.id} references an unknown target word`);
    assert.equal(targetWords.reduce((total, word) => total + word.score, 0), puzzle.targetScore, `${puzzle.id} has the wrong target score`);
    for (const word of puzzle.words) {
      const actual = word.path.map(({ x, y }) => puzzle.grid[y]?.[x]).join("");
      assert.equal(actual, word.label, `${puzzle.id}/${word.id} has an invalid path`);
      assert.equal(new Set(word.path.map(({ x, y }) => `${x}:${y}`)).size, word.path.length, `${puzzle.id}/${word.id} reuses a cell`);
      if (puzzle.wordGridMode === "adjacent") assert.ok(word.path.slice(1).every((point, index) => Math.max(Math.abs(point.x - word.path[index].x), Math.abs(point.y - word.path[index].y)) === 1), `${puzzle.id}/${word.id} has non-adjacent cells`);
    }
  }
}

const summary = Object.fromEntries(difficulties.map((difficulty) => [difficulty, puzzles.filter((puzzle) => puzzle.difficulty === difficulty).length]));
console.log(`Validated ${puzzles.length} puzzles (${JSON.stringify(summary)}).`);
