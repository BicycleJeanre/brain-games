import { openDB } from "idb";
import { CATALOGUE_VERSION } from "./catalogue.ts";
import { isPuzzleComplete } from "./puzzles.ts";
import type { AppData, ChallengeCadence, Difficulty, Preferences, Puzzle, PuzzleProgress } from "./types.ts";

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  showTimer: true,
  checkAsYouType: false,
  showHints: true,
  showControlHelp: true,
  gridTextSize: "medium",
  clueTextSize: "medium",
  menuTextSize: "medium",
  highlightColour: "cyan",
};
export const MAX_OFFLINE_PUZZLES = 10;
const combinedBuild = import.meta.env?.VITE_BRAIN_GAMES === "true";
const stateStore = combinedBuild ? "words-state" : "state";
const puzzleCacheStore = combinedBuild ? "words-puzzle-cache" : "puzzle-cache";

interface CachedPuzzle {
  id: string;
  puzzle: Puzzle;
  lastOpenedAt: number;
}

function defaults(): AppData {
  return {
    version: 1,
    catalogueVersion: CATALOGUE_VERSION,
    settingsUpdatedAt: Date.now(),
    preferences: { ...DEFAULT_PREFERENCES },
    progress: {},
    deletedProgress: {},
    activePuzzleId: null,
  };
}

function boundedDeletedProgress(value: unknown) {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(Object.entries(value)
    .filter((entry): entry is [string, number] => Boolean(entry[0]) && entry[0].length <= 180 && typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 500));
}

export function newProgress(puzzle: Puzzle, now = Date.now(), challenge?: { cadence: ChallengeCadence; periodKey: string; difficulty: Difficulty }): PuzzleProgress {
  return {
    puzzleId: puzzle.id,
    kind: puzzle.kind,
    foundWordIds: [],
    entries: Array.from({ length: puzzle.rows * puzzle.columns }, () => ""),
    hintedCells: [],
    elapsedSeconds: 0,
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    ...(challenge ? { challenge } : {}),
  };
}

export function normalizeData(value: unknown): AppData {
  const raw = value && typeof value === "object" ? value as Partial<AppData> : {};
  const base = defaults();
  const preferences: Partial<Preferences> = raw.preferences && typeof raw.preferences === "object" ? raw.preferences : {};
  const size = (value: unknown): Preferences["gridTextSize"] => ["small", "medium", "large"].includes(String(value)) ? value as Preferences["gridTextSize"] : "medium";
  const progress = raw.progress && typeof raw.progress === "object"
    ? Object.fromEntries(Object.entries(raw.progress).flatMap(([id, item]) => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Partial<PuzzleProgress>;
      if (typeof candidate.puzzleId !== "string" || !["word-search", "crossword", "word-grid"].includes(candidate.kind as string)) return [];
      return [[id, {
        puzzleId: candidate.puzzleId,
        kind: candidate.kind as PuzzleProgress["kind"],
        foundWordIds: Array.isArray(candidate.foundWordIds) ? candidate.foundWordIds.filter((entry): entry is string => typeof entry === "string") : [],
        entries: Array.isArray(candidate.entries) ? candidate.entries.map((entry) => typeof entry === "string" ? entry : "") : [],
        hintedCells: Array.isArray(candidate.hintedCells) ? [...new Set(candidate.hintedCells.filter((entry): entry is number => Number.isInteger(entry) && entry >= 0))] : [],
        elapsedSeconds: typeof candidate.elapsedSeconds === "number" ? candidate.elapsedSeconds : 0,
        startedAt: typeof candidate.startedAt === "number" ? candidate.startedAt : Date.now(),
        updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : 0,
        completedAt: typeof candidate.completedAt === "number" ? candidate.completedAt : null,
        ...(candidate.challenge
          && (candidate.challenge.cadence === "daily" || candidate.challenge.cadence === "weekly")
          && typeof candidate.challenge.periodKey === "string"
          && ["Easy", "Medium", "Hard", "Diabolical"].includes(candidate.challenge.difficulty)
          ? { challenge: candidate.challenge }
          : {}),
      } satisfies PuzzleProgress]];
    }))
    : {};
  return {
    ...base,
    ...raw,
    version: 1,
    catalogueVersion: CATALOGUE_VERSION,
    settingsUpdatedAt: typeof raw.settingsUpdatedAt === "number" ? raw.settingsUpdatedAt : base.settingsUpdatedAt,
    preferences: {
      theme: ["system", "light", "dark"].includes(preferences.theme ?? "") ? preferences.theme! : "system",
      showTimer: typeof preferences.showTimer === "boolean" ? preferences.showTimer : true,
      checkAsYouType: typeof preferences.checkAsYouType === "boolean" ? preferences.checkAsYouType : false,
      showHints: typeof preferences.showHints === "boolean" ? preferences.showHints : true,
      showControlHelp: typeof preferences.showControlHelp === "boolean" ? preferences.showControlHelp : true,
      gridTextSize: size(preferences.gridTextSize),
      clueTextSize: size(preferences.clueTextSize),
      menuTextSize: size(preferences.menuTextSize),
      highlightColour: ["cyan", "amber", "violet", "green"].includes(preferences.highlightColour ?? "") ? preferences.highlightColour! : "cyan",
    },
    progress,
    deletedProgress: boundedDeletedProgress(raw.deletedProgress),
    activePuzzleId: typeof raw.activePuzzleId === "string" ? raw.activePuzzleId : null,
  };
}

export class Store {
  data: AppData = defaults();
  private database?: Awaited<ReturnType<typeof openDB>>;

  async load() {
    this.database = await openDB(combinedBuild ? "brain-games-v1" : "wtrack", combinedBuild ? 1 : 2, { upgrade(db) {
      for (const store of combinedBuild ? ["meta", "sudoku-state", "words-state", "words-puzzle-cache"] : ["state", "puzzle-cache"]) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    } });
    this.data = normalizeData(await this.database.get(stateStore, "app"));
    return this.data;
  }

  async save() {
    if (this.database) await this.database.put(stateStore, this.data, "app");
  }

  async cachedPuzzleIds() {
    if (!this.database) return [];
    return (await this.database.getAllKeys(puzzleCacheStore)).filter((key): key is string => typeof key === "string");
  }

  async cachedPuzzles() {
    if (!this.database) return [];
    return ((await this.database.getAll(puzzleCacheStore)) as CachedPuzzle[]).map((entry) => entry.puzzle);
  }

  async clearPuzzleCache() {
    if (!this.database) return;
    await this.database.clear(puzzleCacheStore);
  }

  async getCachedPuzzle(id: string, now = Date.now()) {
    if (!this.database) return null;
    const cached = await this.database.get(puzzleCacheStore, id) as CachedPuzzle | undefined;
    if (!cached) return null;
    cached.lastOpenedAt = now;
    await this.database.put(puzzleCacheStore, cached, id);
    return cached.puzzle;
  }

  async cachePuzzle(puzzle: Puzzle, now = Date.now()) {
    if (!this.database) return [];
    await this.database.put(puzzleCacheStore, { id: puzzle.id, puzzle, lastOpenedAt: now } satisfies CachedPuzzle, puzzle.id);
    const cached = await this.database.getAll(puzzleCacheStore) as CachedPuzzle[];
    const overflow = cached.sort((left, right) => right.lastOpenedAt - left.lastOpenedAt || left.id.localeCompare(right.id)).slice(MAX_OFFLINE_PUZZLES);
    await Promise.all(overflow.map((entry) => this.database!.delete(puzzleCacheStore, entry.id)));
    return this.cachedPuzzleIds();
  }

  async start(puzzle: Puzzle, sessionId = puzzle.id, challenge?: PuzzleProgress["challenge"]) {
    const existing = this.data.progress[sessionId];
    if (!existing) this.data.progress[sessionId] = newProgress(puzzle, Date.now(), challenge);
    else if (existing.completedAt && !isPuzzleComplete(puzzle, existing.foundWordIds, existing.entries)) {
      existing.completedAt = null;
      existing.updatedAt = Date.now();
    }
    delete this.data.deletedProgress[sessionId];
    this.data.activePuzzleId = sessionId;
    await this.save();
    return this.data.progress[sessionId]!;
  }

  async update(puzzle: Puzzle, mutator: (progress: PuzzleProgress) => void, sessionId = puzzle.id) {
    const progress = this.data.progress[sessionId] ?? newProgress(puzzle);
    mutator(progress);
    progress.updatedAt = Date.now();
    if (isPuzzleComplete(puzzle, progress.foundWordIds, progress.entries) && !progress.completedAt) progress.completedAt = progress.updatedAt;
    this.data.progress[sessionId] = progress;
    this.data.activePuzzleId = sessionId;
    await this.save();
    return progress;
  }

  async reset(puzzle: Puzzle, sessionId = puzzle.id) {
    const challenge = this.data.progress[sessionId]?.challenge;
    this.data.progress[sessionId] = newProgress(puzzle, Date.now(), challenge);
    this.data.activePuzzleId = sessionId;
    delete this.data.deletedProgress[sessionId];
    await this.save();
  }

  async removeProgress(sessionId: string, deletedAt = Date.now()) {
    if (!this.data.progress[sessionId] && deletedAt <= (this.data.deletedProgress[sessionId] ?? 0)) return false;
    delete this.data.progress[sessionId];
    this.data.deletedProgress[sessionId] = Math.max(deletedAt, this.data.deletedProgress[sessionId] ?? 0);
    this.data.deletedProgress = boundedDeletedProgress(this.data.deletedProgress);
    if (this.data.activePuzzleId === sessionId) this.data.activePuzzleId = null;
    await this.save();
    return true;
  }

  async clearProgress(scope: "completed" | "all") {
    const entries = Object.entries(this.data.progress).filter(([, progress]) => scope === "all" || Boolean(progress.completedAt));
    const now = Date.now();
    for (const [id] of entries) {
      delete this.data.progress[id];
      this.data.deletedProgress[id] = now;
    }
    this.data.deletedProgress = boundedDeletedProgress(this.data.deletedProgress);
    if (scope === "all") this.data.activePuzzleId = null;
    else if (this.data.activePuzzleId && !this.data.progress[this.data.activePuzzleId]) this.data.activePuzzleId = null;
    await this.save();
    return entries.length;
  }

  async setPreferences(preferences: Preferences) {
    this.data.preferences = preferences;
    this.data.settingsUpdatedAt = Date.now();
    await this.save();
  }

  async replaceData(value: unknown) {
    this.data = normalizeData(value);
    await this.save();
    return this.data;
  }

  async importData(value: unknown) {
    const incoming = normalizeData(value);
    let added = 0;
    let skipped = 0;
    for (const [id, progress] of Object.entries(incoming.progress)) {
      if (this.data.progress[id] || (this.data.deletedProgress[id] ?? 0) >= progress.updatedAt) skipped += 1;
      else { this.data.progress[id] = progress; added += 1; }
    }
    this.data.preferences = incoming.preferences;
    this.data.settingsUpdatedAt = Date.now();
    await this.save();
    return { added, skipped };
  }

  async mergeRemote(remote: AppData) {
    const incoming = normalizeData(remote);
    for (const [id, progress] of Object.entries(incoming.progress)) {
      if ((this.data.deletedProgress[id] ?? 0) >= progress.updatedAt) continue;
      if (!this.data.progress[id] || this.data.progress[id]!.updatedAt < progress.updatedAt) this.data.progress[id] = progress;
    }
    for (const [id, deletedAt] of Object.entries(incoming.deletedProgress)) {
      this.data.deletedProgress[id] = Math.max(this.data.deletedProgress[id] ?? 0, deletedAt);
      if ((this.data.progress[id]?.updatedAt ?? 0) <= deletedAt) delete this.data.progress[id];
    }
    this.data.deletedProgress = boundedDeletedProgress(this.data.deletedProgress);
    if (incoming.settingsUpdatedAt > this.data.settingsUpdatedAt) {
      this.data.preferences = incoming.preferences;
      this.data.settingsUpdatedAt = incoming.settingsUpdatedAt;
      this.data.activePuzzleId = incoming.activePuzzleId;
    }
    await this.save();
  }
}
