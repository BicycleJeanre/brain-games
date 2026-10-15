import WordSearch from "@blex41/word-search";
import { generateLayout } from "crossword-layout-generator";
import { Buffer as PolyfillBuffer } from "buffer";
import type { CrosswordPuzzle } from "./types.ts";

export function generateWordSearch(words: string[], size = 12, options: { disabledDirections?: string[]; backwardsProbability?: number } = {}) {
  const dictionary = words.map((word) => word.trim()).filter(Boolean);
  const generated = new WordSearch({ rows: size, cols: size, dictionary, maxWords: 20, upperCase: true, disabledDirections: options.disabledDirections, backwardsProbability: options.backwardsProbability });
  return { grid: generated.grid.map((row) => row.join("")), words: generated.words };
}

export function generateCrossword(items: Array<{ answer: string; clue: string }>) {
  const originalLog = console.log;
  console.log = () => undefined;
  try {
    return generateLayout(items.map((item) => ({ answer: item.answer.toUpperCase().replace(/[^A-Z]/g, ""), clue: item.clue.trim() })));
  } finally {
    console.log = originalLog;
  }
}

function prepareParserRuntime() {
  const runtime = globalThis as typeof globalThis & { global?: typeof globalThis; Buffer?: typeof PolyfillBuffer };
  runtime.global ??= globalThis;
  runtime.Buffer ??= PolyfillBuffer;
}

export async function importIpuz(content: string) {
  prepareParserRuntime();
  const { parseIpuz, convertIpuzToUnified } = await import("@xwordly/xword-parser");
  return convertIpuzToUnified(parseIpuz(content));
}

function localId(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16_777_619); }
  return `local-crossword-${(hash >>> 0).toString(36)}`;
}

export async function importCrosswordFile(data: ArrayBuffer, filename: string): Promise<CrosswordPuzzle> {
  prepareParserRuntime();
  const { parseLazy } = await import("@xwordly/xword-parser/lazy");
  const imported = await parseLazy(data, { filename, maxGridSize: { width: 40, height: 40 } });
  const rows = imported.grid.height;
  const columns = imported.grid.width;
  if (!rows || !columns || rows > 40 || columns > 40) throw new Error("The imported crossword has unsupported dimensions.");
  const grid = imported.grid.cells.map((row) => row.map((cell) => {
    if (cell.isBlack) return "#";
    const solution = cell.solution?.toUpperCase();
    if (!solution || !/^[A-Z]$/.test(solution)) throw new Error("Brain Games currently supports single-letter A–Z crossword cells only.");
    return solution;
  }).join(""));
  const clues = (["across", "down"] as const).flatMap((direction) => imported.clues[direction].map((clue) => {
    const start = imported.grid.cells.flatMap((row, rowIndex) => row.map((cell, columnIndex) => ({ cell, row: rowIndex, column: columnIndex }))).find(({ cell, row, column }) =>
      cell.number === clue.number && !cell.isBlack && (direction === "across" ? column === 0 || imported.grid.cells[row]?.[column - 1]?.isBlack : row === 0 || imported.grid.cells[row - 1]?.[column]?.isBlack));
    if (!start) throw new Error(`Could not place clue ${clue.number} ${direction}.`);
    let answer = "";
    let row = start.row, column = start.column;
    while (row < rows && column < columns && !imported.grid.cells[row]?.[column]?.isBlack) {
      answer += grid[row]![column];
      if (direction === "across") column += 1; else row += 1;
    }
    return { number: clue.number, direction, clue: clue.text, answer, row: start.row, column: start.column };
  }));
  const fingerprint = `${filename}:${grid.join("/")}:${clues.map((clue) => `${clue.number}:${clue.direction}:${clue.clue}`).join("|")}`;
  return {
    id: localId(fingerprint), kind: "crossword", title: imported.title?.trim() || filename.replace(/\.[^.]+$/, "") || "Imported crossword",
    subtitle: `Private local import · ${clues.length} clues`, difficulty: "Unrated", catalogueVersion: "local-import-1",
    source: { name: imported.author?.trim() || "User-supplied crossword", url: "about:blank", licence: "Private user-supplied file", note: "The puzzle payload stays on this device. Synced progress requires the same file on another device; Brain Games never publishes it." },
    rows, columns, grid, clues,
  };
}
