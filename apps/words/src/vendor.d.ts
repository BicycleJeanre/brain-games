declare module "@blex41/word-search" {
  interface Options {
    cols?: number;
    rows?: number;
    disabledDirections?: string[];
    dictionary?: string[];
    maxWords?: number;
    backwardsProbability?: number;
    upperCase?: boolean;
    diacritics?: boolean;
  }
  interface GeneratedWord { word: string; clean: string; path: Array<{ x: number; y: number }> }
  export default class WordSearch {
    constructor(options?: Options);
    readonly grid: string[][];
    readonly words: GeneratedWord[];
  }
}

declare module "crossword-layout-generator" {
  interface Input { answer: string; clue: string }
  interface Result extends Input { startx?: number; starty?: number; orientation: "across" | "down" | "none"; position?: number }
  interface Layout { rows: number; cols: number; table: string[][]; result: Result[] }
  export function generateLayout(input: Input[]): Layout;
}
