export type PuzzleKind = "word-search" | "crossword";
export type Difficulty = "Easy" | "Medium" | "Hard" | "Diabolical";
export type Theme = "system" | "light" | "dark";

export interface PuzzleSource {
  name: string;
  url: string;
  licence: string;
  note: string;
}

export interface PuzzleBase {
  id: string;
  kind: PuzzleKind;
  title: string;
  subtitle: string;
  difficulty: Difficulty;
  catalogueVersion: string;
  source: PuzzleSource;
}

export interface GridPoint { x: number; y: number }

export interface WordSearchWord {
  id: string;
  label: string;
  path: GridPoint[];
}

export interface WordSearchPuzzle extends PuzzleBase {
  kind: "word-search";
  rows: number;
  columns: number;
  grid: string[];
  words: WordSearchWord[];
}

export interface CrosswordClue {
  number: number;
  direction: "across" | "down";
  clue: string;
  answer: string;
  row: number;
  column: number;
}

export interface CrosswordPuzzle extends PuzzleBase {
  kind: "crossword";
  rows: number;
  columns: number;
  grid: string[];
  clues: CrosswordClue[];
}

export type Puzzle = WordSearchPuzzle | CrosswordPuzzle;

export interface PuzzleProgress {
  puzzleId: string;
  kind: PuzzleKind;
  foundWordIds: string[];
  entries: string[];
  elapsedSeconds: number;
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface Preferences {
  theme: Theme;
  showTimer: boolean;
  checkAsYouType: boolean;
}

export interface AppData {
  version: 1;
  catalogueVersion: string;
  settingsUpdatedAt: number;
  preferences: Preferences;
  progress: Record<string, PuzzleProgress>;
  deletedProgress: Record<string, number>;
  activePuzzleId: string | null;
}
