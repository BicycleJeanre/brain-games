export type PuzzleKind = "word-search" | "crossword" | "word-grid";
export type Difficulty = "Easy" | "Medium" | "Hard" | "Diabolical" | "Unrated";
export type Theme = "system" | "light" | "dark";
export type ChallengeCadence = "daily" | "weekly";
export type TextSize = "small" | "medium" | "large";
export type HighlightColour = "cyan" | "amber" | "violet" | "green";
export type WordGridMode = "adjacent" | "shuffle";

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
  wordGridMode?: WordGridMode;
}

export type PuzzleSummary = PuzzleBase;

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

export interface WordGridWord {
  id: string;
  label: string;
  path: GridPoint[];
  score: number;
}

export interface WordGridPuzzle extends PuzzleBase {
  kind: "word-grid";
  wordGridMode: WordGridMode;
  rows: number;
  columns: number;
  grid: string[];
  minimumLength: number;
  targetScore: number;
  roundWordIds: string[];
  words: WordGridWord[];
}

export type Puzzle = WordSearchPuzzle | CrosswordPuzzle | WordGridPuzzle;

export interface PuzzleProgress {
  puzzleId: string;
  kind: PuzzleKind;
  foundWordIds: string[];
  entries: string[];
  hintedCells: number[];
  elapsedSeconds: number;
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
  challenge?: {
    cadence: ChallengeCadence;
    periodKey: string;
    difficulty: Difficulty;
  };
}

export interface Preferences {
  theme: Theme;
  showTimer: boolean;
  checkAsYouType: boolean;
  showHints: boolean;
  showControlHelp: boolean;
  gridTextSize: TextSize;
  clueTextSize: TextSize;
  menuTextSize: TextSize;
  highlightColour: HighlightColour;
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
