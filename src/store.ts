import { openDB } from "idb";
import { CATALOGUE_VERSION } from "./catalogue.ts";
import { isPuzzleComplete } from "./puzzles.ts";
import type { AppData, Preferences, Puzzle, PuzzleProgress } from "./types.ts";

export const DEFAULT_PREFERENCES: Preferences = { theme: "system", showTimer: true, checkAsYouType: false };
export const MAX_OFFLINE_PUZZLES = 10;

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

export function newProgress(puzzle: Puzzle, now = Date.now()): PuzzleProgress {
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
  };
}

export function normalizeData(value: unknown): AppData {
  const raw = value && typeof value === "object" ? value as Partial<AppData> : {};
  const base = defaults();
  const preferences: Partial<Preferences> = raw.preferences && typeof raw.preferences === "object" ? raw.preferences : {};
  const progress = raw.progress && typeof raw.progress === "object"
    ? Object.fromEntries(Object.entries(raw.progress).flatMap(([id, item]) => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Partial<PuzzleProgress>;
      if (typeof candidate.puzzleId !== "string" || (candidate.kind !== "word-search" && candidate.kind !== "crossword")) return [];
      return [[id, {
        puzzleId: candidate.puzzleId,
        kind: candidate.kind,
        foundWordIds: Array.isArray(candidate.foundWordIds) ? candidate.foundWordIds.filter((entry): entry is string => typeof entry === "string") : [],
        entries: Array.isArray(candidate.entries) ? candidate.entries.map((entry) => typeof entry === "string" ? entry : "") : [],
        hintedCells: Array.isArray(candidate.hintedCells) ? [...new Set(candidate.hintedCells.filter((entry): entry is number => Number.isInteger(entry) && entry >= 0))] : [],
        elapsedSeconds: typeof candidate.elapsedSeconds === "number" ? candidate.elapsedSeconds : 0,
        startedAt: typeof candidate.startedAt === "number" ? candidate.startedAt : Date.now(),
        updatedAt: typeof candidate.updatedAt === "number" ? candidate.updatedAt : 0,
        completedAt: typeof candidate.completedAt === "number" ? candidate.completedAt : null,
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
    },
    progress,
    deletedProgress: raw.deletedProgress && typeof raw.deletedProgress === "object" ? raw.deletedProgress : {},
    activePuzzleId: typeof raw.activePuzzleId === "string" ? raw.activePuzzleId : null,
  };
}

export class Store {
  data: AppData = defaults();
  private database?: Awaited<ReturnType<typeof openDB>>;

  async load() {
    this.database = await openDB("wtrack", 2, { upgrade(db) {
      if (!db.objectStoreNames.contains("state")) db.createObjectStore("state");
      if (!db.objectStoreNames.contains("puzzle-cache")) db.createObjectStore("puzzle-cache");
    } });
    this.data = normalizeData(await this.database.get("state", "app"));
    return this.data;
  }

  async save() {
    if (this.database) await this.database.put("state", this.data, "app");
  }

  async cachedPuzzleIds() {
    if (!this.database) return [];
    return (await this.database.getAllKeys("puzzle-cache")).filter((key): key is string => typeof key === "string");
  }

  async getCachedPuzzle(id: string, now = Date.now()) {
    if (!this.database) return null;
    const cached = await this.database.get("puzzle-cache", id) as CachedPuzzle | undefined;
    if (!cached) return null;
    cached.lastOpenedAt = now;
    await this.database.put("puzzle-cache", cached, id);
    return cached.puzzle;
  }

  async cachePuzzle(puzzle: Puzzle, now = Date.now()) {
    if (!this.database) return [];
    await this.database.put("puzzle-cache", { id: puzzle.id, puzzle, lastOpenedAt: now } satisfies CachedPuzzle, puzzle.id);
    const cached = await this.database.getAll("puzzle-cache") as CachedPuzzle[];
    const overflow = cached.sort((left, right) => right.lastOpenedAt - left.lastOpenedAt || left.id.localeCompare(right.id)).slice(MAX_OFFLINE_PUZZLES);
    await Promise.all(overflow.map((entry) => this.database!.delete("puzzle-cache", entry.id)));
    return this.cachedPuzzleIds();
  }

  async start(puzzle: Puzzle) {
    const existing = this.data.progress[puzzle.id];
    if (!existing) this.data.progress[puzzle.id] = newProgress(puzzle);
    this.data.activePuzzleId = puzzle.id;
    await this.save();
    return this.data.progress[puzzle.id]!;
  }

  async update(puzzle: Puzzle, mutator: (progress: PuzzleProgress) => void) {
    const progress = this.data.progress[puzzle.id] ?? newProgress(puzzle);
    mutator(progress);
    progress.updatedAt = Date.now();
    if (isPuzzleComplete(puzzle, progress.foundWordIds, progress.entries) && !progress.completedAt) progress.completedAt = progress.updatedAt;
    this.data.progress[puzzle.id] = progress;
    this.data.activePuzzleId = puzzle.id;
    await this.save();
    return progress;
  }

  async reset(puzzle: Puzzle) {
    this.data.progress[puzzle.id] = newProgress(puzzle);
    this.data.activePuzzleId = puzzle.id;
    this.data.deletedProgress[puzzle.id] = Date.now();
    await this.save();
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
    if (incoming.settingsUpdatedAt > this.data.settingsUpdatedAt) {
      this.data.preferences = incoming.preferences;
      this.data.settingsUpdatedAt = incoming.settingsUpdatedAt;
      this.data.activePuzzleId = incoming.activePuzzleId;
    }
    await this.save();
  }
}
