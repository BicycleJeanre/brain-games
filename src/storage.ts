import { openDB, type IDBPDatabase } from "idb";

export const BRAIN_GAMES_DATABASE = "brain-games-v1";
export const BRAIN_GAMES_SCHEMA_VERSION = 1;
export const SUDOKU_STORE = "sudoku-state";
export const WORDS_STORE = "words-state";
export const WORDS_CACHE_STORE = "words-puzzle-cache";
export const META_STORE = "meta";

type RecordValue = Record<string, unknown>;

export interface MigrationPreview {
  legacySudoku: { present: boolean; games: number; completed: number };
  legacyWords: { present: boolean; progress: number; completed: number };
  combinedSudoku: { games: number; completed: number };
  combinedWords: { progress: number; completed: number };
  lastImportedAt: string | null;
}

export interface ImportResult {
  sudokuAdded: number;
  sudokuUpdated: number;
  wordsAdded: number;
  wordsUpdated: number;
}

interface BrainGamesBackup {
  format: "brain-games-backup";
  version: 1;
  exportedAt: string;
  data: { sudoku: RecordValue | null; words: RecordValue | null };
}

const isRecord = (value: unknown): value is RecordValue => Boolean(value && typeof value === "object" && !Array.isArray(value));
const numeric = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
const recordOrEmpty = (value: unknown): RecordValue => isRecord(value) ? value : {};
const clone = <T>(value: T): T => structuredClone(value);

function ensureStores(database: IDBPDatabase) {
  for (const store of [META_STORE, SUDOKU_STORE, WORDS_STORE, WORDS_CACHE_STORE]) {
    if (!database.objectStoreNames.contains(store)) database.createObjectStore(store);
  }
}

export function openBrainGamesDatabase() {
  return openDB(BRAIN_GAMES_DATABASE, BRAIN_GAMES_SCHEMA_VERSION, { upgrade: ensureStores });
}

async function databaseExists(name: string) {
  if (!("databases" in indexedDB)) return false;
  return (await indexedDB.databases()).some((database) => database.name === name);
}

async function readLegacyState(name: "strack-v1" | "wtrack") {
  if (!await databaseExists(name)) return null;
  const database = await openDB(name);
  try {
    if (!database.objectStoreNames.contains("state")) return null;
    const value: unknown = await database.get("state", "app");
    return isRecord(value) && value.version === 1 ? value : null;
  } finally {
    database.close();
  }
}

async function readCombinedState(database: IDBPDatabase, store: string) {
  const value: unknown = await database.get(store, "app");
  return isRecord(value) && value.version === 1 ? value : null;
}

function stateCounts(value: RecordValue | null, collection: "games" | "progress") {
  const entries = Object.values(recordOrEmpty(value?.[collection]));
  return { total: entries.length, completed: entries.filter((entry) => isRecord(entry) && numeric(entry.completedAt) > 0).length };
}

export async function migrationPreview(): Promise<MigrationPreview> {
  const [legacySudoku, legacyWords, database] = await Promise.all([
    readLegacyState("strack-v1"),
    readLegacyState("wtrack"),
    openBrainGamesDatabase(),
  ]);
  try {
    const [combinedSudoku, combinedWords, meta] = await Promise.all([
      readCombinedState(database, SUDOKU_STORE),
      readCombinedState(database, WORDS_STORE),
      database.get(META_STORE, "migration") as Promise<unknown>,
    ]);
    const legacySudokuCounts = stateCounts(legacySudoku, "games");
    const legacyWordsCounts = stateCounts(legacyWords, "progress");
    const combinedSudokuCounts = stateCounts(combinedSudoku, "games");
    const combinedWordsCounts = stateCounts(combinedWords, "progress");
    return {
      legacySudoku: { present: Boolean(legacySudoku), games: legacySudokuCounts.total, completed: legacySudokuCounts.completed },
      legacyWords: { present: Boolean(legacyWords), progress: legacyWordsCounts.total, completed: legacyWordsCounts.completed },
      combinedSudoku: { games: combinedSudokuCounts.total, completed: combinedSudokuCounts.completed },
      combinedWords: { progress: combinedWordsCounts.total, completed: combinedWordsCounts.completed },
      lastImportedAt: isRecord(meta) && typeof meta.lastImportedAt === "string" ? meta.lastImportedAt : null,
    };
  } finally {
    database.close();
  }
}

function mergeTombstones(current: unknown, incoming: unknown) {
  const merged = { ...recordOrEmpty(current) };
  for (const [id, value] of Object.entries(recordOrEmpty(incoming))) merged[id] = Math.max(numeric(merged[id]), numeric(value));
  return merged;
}

export function mergeSudokuState(currentValue: unknown, incomingValue: unknown) {
  if (!isRecord(incomingValue) || incomingValue.version !== 1 || !isRecord(incomingValue.games)) throw new Error("This STrack data is incomplete.");
  if (!isRecord(currentValue) || currentValue.version !== 1 || !isRecord(currentValue.games)) {
    return { data: clone(incomingValue), added: Object.keys(incomingValue.games).length, updated: 0 };
  }
  const data = clone(currentValue);
  const games = { ...recordOrEmpty(data.games) };
  const deletedGames = mergeTombstones(data.deletedGames, incomingValue.deletedGames);
  let added = 0;
  let updated = 0;
  for (const [id, game] of Object.entries(incomingValue.games)) {
    if (!isRecord(game)) continue;
    const deletedAt = numeric(deletedGames[id]);
    if (deletedAt >= numeric(game.updatedAt)) continue;
    const existing = games[id];
    if (!isRecord(existing)) { games[id] = clone(game); added += 1; }
    else if (numeric(existing.updatedAt) < numeric(game.updatedAt)) { games[id] = clone(game); updated += 1; }
  }
  for (const [id, deletedAt] of Object.entries(deletedGames)) {
    const game = games[id];
    if (isRecord(game) && numeric(deletedAt) >= numeric(game.updatedAt)) delete games[id];
  }
  data.games = games;
  data.deletedGames = deletedGames;
  if (numeric(incomingValue.settingsUpdatedAt) > numeric(data.settingsUpdatedAt)) {
    for (const key of ["preferences", "trainingProgress", "activeGameId", "settingsUpdatedAt", "catalogueVersion"]) {
      if (key in incomingValue) data[key] = clone(incomingValue[key]);
    }
  }
  return { data, added, updated };
}

export function mergeWordsState(currentValue: unknown, incomingValue: unknown) {
  if (!isRecord(incomingValue) || incomingValue.version !== 1 || !isRecord(incomingValue.progress)) throw new Error("This WTrack data is incomplete.");
  if (!isRecord(currentValue) || currentValue.version !== 1 || !isRecord(currentValue.progress)) {
    return { data: clone(incomingValue), added: Object.keys(incomingValue.progress).length, updated: 0 };
  }
  const data = clone(currentValue);
  const progress = { ...recordOrEmpty(data.progress) };
  const deletedProgress = mergeTombstones(data.deletedProgress, incomingValue.deletedProgress);
  let added = 0;
  let updated = 0;
  for (const [id, session] of Object.entries(incomingValue.progress)) {
    if (!isRecord(session)) continue;
    if (numeric(deletedProgress[id]) >= numeric(session.updatedAt)) continue;
    const existing = progress[id];
    if (!isRecord(existing)) { progress[id] = clone(session); added += 1; }
    else if (numeric(existing.updatedAt) < numeric(session.updatedAt)) { progress[id] = clone(session); updated += 1; }
  }
  for (const [id, deletedAt] of Object.entries(deletedProgress)) {
    const session = progress[id];
    if (isRecord(session) && numeric(deletedAt) >= numeric(session.updatedAt)) delete progress[id];
  }
  data.progress = progress;
  data.deletedProgress = deletedProgress;
  if (numeric(incomingValue.settingsUpdatedAt) > numeric(data.settingsUpdatedAt)) {
    for (const key of ["preferences", "activePuzzleId", "settingsUpdatedAt", "catalogueVersion"]) {
      if (key in incomingValue) data[key] = clone(incomingValue[key]);
    }
  }
  return { data, added, updated };
}

async function mergeIntoCombined(sudoku: unknown | null, words: unknown | null, source: string): Promise<ImportResult> {
  const database = await openBrainGamesDatabase();
  try {
    const currentSudoku = await readCombinedState(database, SUDOKU_STORE);
    const currentWords = await readCombinedState(database, WORDS_STORE);
    const sudokuResult = sudoku ? mergeSudokuState(currentSudoku, sudoku) : { data: currentSudoku, added: 0, updated: 0 };
    const wordsResult = words ? mergeWordsState(currentWords, words) : { data: currentWords, added: 0, updated: 0 };
    const transaction = database.transaction([META_STORE, SUDOKU_STORE, WORDS_STORE], "readwrite");
    if (sudokuResult.data) await transaction.objectStore(SUDOKU_STORE).put(sudokuResult.data, "app");
    if (wordsResult.data) await transaction.objectStore(WORDS_STORE).put(wordsResult.data, "app");
    await transaction.objectStore(META_STORE).put({ version: 1, source, lastImportedAt: new Date().toISOString() }, "migration");
    await transaction.done;
    return {
      sudokuAdded: sudokuResult.added,
      sudokuUpdated: sudokuResult.updated,
      wordsAdded: wordsResult.added,
      wordsUpdated: wordsResult.updated,
    };
  } finally {
    database.close();
  }
}

export async function importLegacyData() {
  const [sudoku, words] = await Promise.all([readLegacyState("strack-v1"), readLegacyState("wtrack")]);
  if (!sudoku && !words) throw new Error("No compatible STrack or WTrack device data was found.");
  return mergeIntoCombined(sudoku, words, "legacy-indexeddb");
}

export async function createCombinedBackup(now = new Date()) {
  const database = await openBrainGamesDatabase();
  try {
    const [sudoku, words] = await Promise.all([
      readCombinedState(database, SUDOKU_STORE),
      readCombinedState(database, WORDS_STORE),
    ]);
    const backup: BrainGamesBackup = { format: "brain-games-backup", version: 1, exportedAt: now.toISOString(), data: { sudoku, words } };
    return `${JSON.stringify(backup, null, 2)}\n`;
  } finally {
    database.close();
  }
}

export function parseBackup(contents: string) {
  let value: unknown;
  try { value = JSON.parse(contents); }
  catch { throw new Error("This file is not valid JSON."); }
  if (!isRecord(value)) throw new Error("This is not a supported backup.");
  if (value.format === "brain-games-backup") {
    if (value.version !== 1 || !isRecord(value.data)) throw new Error("This Brain Games backup version is not supported.");
    return { source: "brain-games-backup", sudoku: value.data.sudoku ?? null, words: value.data.words ?? null };
  }
  if (value.format === "strack-backup") return { source: "strack-backup", sudoku: value.data ?? null, words: null };
  if (value.format === "wtrack-backup") return { source: "wtrack-backup", sudoku: null, words: value.data ?? null };
  throw new Error("This is not a Brain Games, STrack, or WTrack backup.");
}

export async function importBackup(contents: string) {
  const parsed = parseBackup(contents);
  return mergeIntoCombined(parsed.sudoku, parsed.words, parsed.source);
}
