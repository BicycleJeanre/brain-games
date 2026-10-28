import { openBrainGamesDatabase, SUDOKU_STORE, WORDS_STORE } from "./storage.ts";

export type Theme = "system" | "light" | "dark";
export type Size = "small" | "medium" | "large";
export type HighlightColour = "cyan" | "amber" | "violet" | "green";

export interface SudokuPreferences {
  theme: Theme;
  noteStyle: "simple" | "advanced";
  showTimer: boolean;
  showColours: boolean;
  showLines: boolean;
  showValueSelection: boolean;
  showCandidateCalculation: boolean;
  showControlHelp: boolean;
  autoCandidates: boolean;
  cleanCandidates: boolean;
  highlightPeers: boolean;
  highlightMatches: boolean;
  showMistakes: boolean;
  mistakeLimit: boolean;
  noteSize: Size;
  menuSize: Size;
  digitSize: Size;
  noteColour: "classic" | "mono" | "cyan" | "amber";
  menuColour: "standard" | "bright" | "cyan" | "amber";
  digitColour: "cyan" | "mono" | "amber";
  highlightColour: HighlightColour;
}

export interface WordPreferences {
  theme: Theme;
  showTimer: boolean;
  checkAsYouType: boolean;
  showHints: boolean;
  showControlHelp: boolean;
  gridTextSize: Size;
  clueTextSize: Size;
  menuTextSize: Size;
  highlightColour: HighlightColour;
}

export interface GamePreferences {
  sudoku: SudokuPreferences;
  words: WordPreferences;
}

export const DEFAULT_SUDOKU_PREFERENCES: SudokuPreferences = {
  theme: "system", noteStyle: "advanced", showTimer: true, showColours: true, showLines: true,
  showValueSelection: true, showCandidateCalculation: true, showControlHelp: true, autoCandidates: false,
  cleanCandidates: true, highlightPeers: true, highlightMatches: true, showMistakes: false, mistakeLimit: true,
  noteSize: "medium", menuSize: "medium", digitSize: "medium", noteColour: "classic", menuColour: "standard",
  digitColour: "cyan", highlightColour: "cyan",
};

export const DEFAULT_WORD_PREFERENCES: WordPreferences = {
  theme: "system", showTimer: true, checkAsYouType: false, showHints: true, showControlHelp: true,
  gridTextSize: "medium", clueTextSize: "medium", menuTextSize: "medium", highlightColour: "cyan",
};

type StoredMeta = Record<string, unknown> & { settingsUpdatedAt?: number; preferences?: Record<string, unknown> };

const record = (value: unknown): StoredMeta => value && typeof value === "object" && !Array.isArray(value) ? value as StoredMeta : {};

export async function loadGamePreferences(): Promise<GamePreferences> {
  const database = await openBrainGamesDatabase();
  try {
    const [sudokuMeta, wordsMeta, sudokuLegacy, wordsLegacy] = await Promise.all([
      database.get(SUDOKU_STORE, "meta"), database.get(WORDS_STORE, "meta"),
      database.get(SUDOKU_STORE, "app"), database.get(WORDS_STORE, "app"),
    ]);
    const sudoku = record(sudokuMeta).version === 1 ? sudokuMeta : sudokuLegacy;
    const words = record(wordsMeta).version === 1 ? wordsMeta : wordsLegacy;
    return {
      sudoku: { ...DEFAULT_SUDOKU_PREFERENCES, ...record(sudoku).preferences } as SudokuPreferences,
      words: { ...DEFAULT_WORD_PREFERENCES, ...record(words).preferences } as WordPreferences,
    };
  } finally {
    database.close();
  }
}

async function savePreferences(storeName: string, preferences: SudokuPreferences | WordPreferences, markDirty = false) {
  const database = await openBrainGamesDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    const store = transaction.store;
    let current = record(await store.get("meta"));
    if (current.version !== 1) {
      const legacy = record(await store.get("app"));
      if (legacy.version === 1) {
        const collectionKey = storeName === SUDOKU_STORE ? "games" : "progress";
        const prefix = storeName === SUDOKU_STORE ? "game:" : "progress:";
        const collection = record(legacy[collectionKey]);
        const { [collectionKey]: _collection, ...legacyMeta } = legacy;
        current = legacyMeta;
        await Promise.all(Object.entries(collection).map(([id, value]) => store.put(value, `${prefix}${id}`)));
        await store.delete("app");
      }
    }
    const settingsUpdatedAt = Math.max(Date.now(), Number(current.settingsUpdatedAt || 0) + 1);
    await store.put({
      ...current,
      version: 1,
      settingsUpdatedAt,
      ...(markDirty ? { settingsCloudDirty: true } : {}),
      preferences,
    }, "meta");
    await transaction.done;
  } finally {
    database.close();
  }
}

export async function saveSudokuPreferences(preferences: SudokuPreferences) {
  await savePreferences(SUDOKU_STORE, preferences, true);
}

export async function saveWordPreferences(preferences: WordPreferences) {
  await savePreferences(WORDS_STORE, preferences);
}

export async function saveSharedTheme(theme: Theme, preferences: GamePreferences) {
  preferences.sudoku.theme = theme;
  preferences.words.theme = theme;
  await Promise.all([saveSudokuPreferences(preferences.sudoku), saveWordPreferences(preferences.words)]);
}
