import WordSearch from "@blex41/word-search";
import { parseIpuz, convertIpuzToUnified } from "@xwordly/xword-parser";
import { generateLayout } from "crossword-layout-generator";

export function generateWordSearch(words: string[], size = 12) {
  const dictionary = words.map((word) => word.trim()).filter(Boolean);
  const generated = new WordSearch({ rows: size, cols: size, dictionary, maxWords: 20, upperCase: true });
  return { grid: generated.grid.map((row) => row.join("")), words: generated.words };
}

export function generateCrossword(items: Array<{ answer: string; clue: string }>) {
  return generateLayout(items.map((item) => ({ answer: item.answer.toUpperCase().replace(/[^A-Z]/g, ""), clue: item.clue.trim() })));
}

export function importIpuz(content: string) {
  return convertIpuzToUnified(parseIpuz(content));
}
