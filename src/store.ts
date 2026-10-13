import { openDB } from "idb";
import { CATALOGUE_VERSION, isPuzzleComplete } from "./puzzles.ts";
import type { AppData, Preferences, Puzzle, PuzzleProgress } from "./types.ts";

export const DEFAULT_PREFERENCES: Preferences = { theme: "system", showTimer: true, checkAsYouType: false };

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
    progress: raw.progress && typeof raw.progress === "object" ? raw.progress : {},
    deletedProgress: raw.deletedProgress && typeof raw.deletedProgress === "object" ? raw.deletedProgress : {},
    activePuzzleId: typeof raw.activePuzzleId === "string" ? raw.activePuzzleId : null,
  };
}

export class Store {
  data: AppData = defaults();
  private database?: Awaited<ReturnType<typeof openDB>>;

  async load() {
    this.database = await openDB("wtrack", 1, { upgrade(db) { if (!db.objectStoreNames.contains("state")) db.createObjectStore("state"); } });
    this.data = normalizeData(await this.database.get("state", "app"));
    return this.data;
  }

  async save() {
    if (this.database) await this.database.put("state", this.data, "app");
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
