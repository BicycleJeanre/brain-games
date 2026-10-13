import { mkdir, rm, writeFile, readFile } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);
const SOURCE_URL = new URL("src/data/puzzles.json", ROOT);
const OUTPUT_URL = new URL("public/catalogue/", ROOT);
const PUZZLES_URL = new URL("puzzles/", OUTPUT_URL);
const puzzles = JSON.parse(await readFile(SOURCE_URL, "utf8"));

await rm(OUTPUT_URL, { recursive: true, force: true });
await mkdir(PUZZLES_URL, { recursive: true });

const summaries = puzzles.map(({ rows: _rows, columns: _columns, grid: _grid, words: _words, clues: _clues, ...summary }) => summary);
await writeFile(new URL("index.json", OUTPUT_URL), `${JSON.stringify({ version: "2026.10.2", puzzles: summaries })}\n`);
await Promise.all(puzzles.map((puzzle) => writeFile(new URL(`${puzzle.id}.json`, PUZZLES_URL), `${JSON.stringify(puzzle)}\n`)));

console.log(`Exported catalogue metadata and ${puzzles.length} on-demand puzzle payloads.`);
