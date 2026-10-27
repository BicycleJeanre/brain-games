import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  connectAuthEmulator,
  type User,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  deleteDoc,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  runTransaction,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { Store } from "./store.ts";
import type { AnnotationColour, AppData, BoardSnapshot, Game, Preferences, TrainingProgress } from "./types.ts";

const environment = import.meta.env ?? {};
const config = {
  apiKey: environment.VITE_FIREBASE_API_KEY,
  authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: environment.VITE_FIREBASE_PROJECT_ID,
  appId: environment.VITE_FIREBASE_APP_ID,
};

export const cloudConfigured = Object.values(config).every(Boolean);
const app = cloudConfigured ? initializeApp(config) : null;
export const auth = app ? getAuth(app) : null;
const database = app
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : null;

if (environment.VITE_USE_EMULATORS === "true" && auth && database) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(database, "127.0.0.1", 8080);
}

export type CloudUser = User;
export const watchAuth = (changed: (user: User | null) => void) =>
  auth ? onAuthStateChanged(auth, changed) : (changed(null), () => {});

export async function signInAccount(email: string, password: string, create = false) {
  if (!auth) throw new Error("Cloud sessions are not configured for this installation.");
  if (create) await createUserWithEmailAndPassword(auth, email, password);
  else await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutAccount() {
  if (auth) await signOut(auth);
}

export async function sendReset(email: string) {
  if (!auth) throw new Error("Cloud sessions are not configured for this installation.");
  await sendPasswordResetEmail(auth, email);
}

type CloudSnapshot = Omit<BoardSnapshot, "corner" | "centre" | "colours" | "eliminated"> & {
  corner: string[];
  centre: string[];
  colours: string[];
  eliminated: string[];
};

type CloudGame = Omit<Game, "corner" | "centre" | "colours" | "eliminated" | "history" | "future" | "hintHistory" | "hintPath" | "selected" | "anchor" | "mode" | "cloudDirty"> & CloudSnapshot & {
  version: 1;
  cloudRevision: number;
  history: string[];
  future: string[];
  hintHistory: string[];
  hintPath?: string;
};

export const MAX_SYNCED_GAME_BYTES = 96_000;

const encodedByteLength = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
const SYNC_CONCURRENCY = 4;

async function inBatches<T, R>(items: T[], work: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += SYNC_CONCURRENCY) {
    results.push(...await Promise.all(items.slice(index, index + SYNC_CONCURRENCY).map(work)));
  }
  return results;
}

const encodeMarks = (marks: number[][]) => marks.map((digits) => [...digits].sort().join(""));
const decodeMarks = (marks: string[]) => marks.map((digits) => [...digits].map(Number).filter((digit) => digit >= 1 && digit <= 9));
const encodeColours = (colours: AnnotationColour[][]) => colours.map((items) => items.join("|"));
const validColours = new Set<AnnotationColour>(["cyan", "amber", "violet", "green", "rose", "slate", "lime", "orange", "indigo"]);
const decodeColours = (colours: string[]) => colours.map((items) => items.split("|").filter((colour): colour is AnnotationColour => validColours.has(colour as AnnotationColour)));

function encodeSnapshot(snapshot: BoardSnapshot): CloudSnapshot {
  return { ...snapshot, corner: encodeMarks(snapshot.corner), centre: encodeMarks(snapshot.centre), colours: encodeColours(snapshot.colours), eliminated: encodeMarks(snapshot.eliminated) };
}

function decodeSnapshot(value: string): BoardSnapshot | null {
  try {
    const snapshot = JSON.parse(value) as CloudSnapshot;
    if (snapshot.values?.length !== 81 || snapshot.corner?.length !== 81 || snapshot.centre?.length !== 81 || snapshot.colours?.length !== 81 || snapshot.eliminated?.length !== 81) return null;
    return { ...snapshot, corner: decodeMarks(snapshot.corner), centre: decodeMarks(snapshot.centre), colours: decodeColours(snapshot.colours), eliminated: decodeMarks(snapshot.eliminated), lines: Array.isArray(snapshot.lines) ? snapshot.lines : [] };
  } catch {
    return null;
  }
}

export function encodeCloudGame(game: Game, cloudRevision = game.cloudRevision || 0): CloudGame {
  const { hintPath: _hintPath, selected: _selected, anchor: _anchor, mode: _mode, cloudDirty: _cloudDirty, ...cloudGame } = game;
  const encoded: CloudGame = {
    ...cloudGame,
    version: 1,
    cloudRevision,
    corner: encodeMarks(game.corner),
    centre: encodeMarks(game.centre),
    colours: encodeColours(game.colours),
    eliminated: encodeMarks(game.eliminated),
    history: [],
    future: [],
    hintHistory: [],
  };
  if (encodedByteLength(encoded) > MAX_SYNCED_GAME_BYTES) throw new Error("This puzzle has too many annotations to synchronize safely.");
  return encoded;
}

export function decodeCloudGame(value: unknown): Game | null {
  const game = value as CloudGame;
  if (!game || game.version !== 1 || typeof game.id !== "string" || game.puzzle?.givens?.length !== 81 || game.values?.length !== 81 || game.corner?.length !== 81 || game.centre?.length !== 81 || game.colours?.length !== 81 || game.eliminated?.length !== 81 || !Array.isArray(game.history) || !Array.isArray(game.future) || typeof game.updatedAt !== "number") return null;
  if (game.challenge && (!(["daily", "weekly"] as string[]).includes(game.challenge.cadence) || typeof game.challenge.periodKey !== "string" || game.challenge.periodKey.length > 10)) return null;
  const history = game.history.map(decodeSnapshot);
  const future = game.future.map(decodeSnapshot);
  let hintHistory: Game["hintHistory"] = [];
  let hintPath: Game["hintPath"];
  try {
    hintHistory = (game.hintHistory || []).map((hint) => JSON.parse(hint));
    hintPath = game.hintPath ? JSON.parse(game.hintPath) : undefined;
  }
  catch { return null; }
  if (history.some((item) => !item) || future.some((item) => !item) || hintHistory.length > 40) return null;
  const { version: _version, ...rest } = game;
  return { ...rest, cloudRevision: Math.max(0, Math.floor(Number(game.cloudRevision) || 0)), cloudDirty: false, selected: [], anchor: -1, mode: "normal", corner: decodeMarks(game.corner), centre: decodeMarks(game.centre), colours: decodeColours(game.colours), eliminated: decodeMarks(game.eliminated), lines: Array.isArray(game.lines) ? game.lines : [], history: history as BoardSnapshot[], future: future as BoardSnapshot[], hintHistory, hintPath };
}

export type CloudSettings = { version: 1; cloudRevision: number; preferences: Preferences; activeGameId: string | null; deletedGames?: Record<string, number>; trainingProgress?: TrainingProgress; updatedAt: number };

export function encodeCloudSettings(data: Pick<AppData, "preferences" | "activeGameId" | "deletedGames" | "trainingProgress" | "settingsUpdatedAt" | "settingsCloudRevision">, cloudRevision = data.settingsCloudRevision || 0): CloudSettings {
  return { version: 1, cloudRevision, preferences: data.preferences, activeGameId: data.activeGameId, deletedGames: data.deletedGames, trainingProgress: data.trainingProgress, updatedAt: data.settingsUpdatedAt };
}

function validSettings(value: unknown): value is CloudSettings {
  const settings = value as CloudSettings;
  return Boolean(settings && typeof settings.preferences === "object" && typeof settings.updatedAt === "number" && (!settings.deletedGames || typeof settings.deletedGames === "object"));
}

export class CloudSync {
  user: User | null = null;
  working = false;
  error = "";
  ready = false;
  private store: Store;
  private changed: () => void;
  private stops: Unsubscribe[] = [];
  private pendingGames = new Map<string, number>();
  private pendingDeletes = new Set<string>();
  private pendingSettings = false;
  private flushTimer: number | null = null;
  private flushPromise: Promise<void> | null = null;
  private firstQueuedAt = 0;
  private inFlightCount = 0;
  private reconciledGames = false;
  private reconciledSettings = false;

  constructor(store: Store, changed: () => void) {
    this.store = store;
    this.changed = changed;
    addEventListener("online", () => {
      if (this.user) void this.flushNow();
    });
  }

  status() {
    if (!cloudConfigured) return "Device only";
    if (!this.user) return "Sign in to sync";
    if (!navigator.onLine) return "Saved locally · offline";
    if (this.working) {
      const count = this.pendingGames.size + this.pendingDeletes.size + Number(this.pendingSettings) + this.inFlightCount;
      return count ? `Syncing ${count} ${count === 1 ? "change" : "changes"}…` : "Syncing…";
    }
    if (this.error) return "Sync needs attention";
    return this.ready ? "Synced" : "Connecting…";
  }

  async setUser(user: User | null) {
    this.stop();
    this.user = user;
    this.error = "";
    this.ready = false;
    this.reconciledGames = false;
    this.reconciledSettings = false;
    this.changed();
    if (!user || !database) return;
    const games = collection(database, "users", user.uid, "sudokuGames");
    const settings = doc(database, "users", user.uid, "sudokuMeta", "settings");
    this.stops.push(onSnapshot(games, { includeMetadataChanges: true }, async (snapshot) => {
      let updated = false;
      const remoteGames = new Map<string, Game>();
      for (const change of snapshot.docChanges()) {
        if (change.type === "removed") updated = (await this.store.removeGame(change.doc.id)) || updated;
      }
      const documents = !this.reconciledGames ? snapshot.docs : snapshot.docChanges().filter((change) => change.type !== "removed").map((change) => change.doc);
      for (const item of documents) {
        const game = decodeCloudGame(item.data());
        if (!game) continue;
        remoteGames.set(game.id, game);
        updated = (await this.store.mergeCloudGame(game)) || updated;
      }
      if (!snapshot.metadata.fromCache && !this.reconciledGames) {
        this.reconciledGames = true;
        for (const game of Object.values(this.store.data.games)) {
          const remote = remoteGames.get(game.id);
          if (game.cloudDirty || !remote || ((!game.cloudRevision || !remote.cloudRevision) && game.updatedAt > remote.updatedAt)) this.queueGame(game);
        }
        for (const id of Object.keys(this.store.data.deletedGames)) if (remoteGames.has(id)) this.queueDelete(id);
        this.updateReady();
      }
      if (updated || !snapshot.metadata.fromCache) this.changed();
    }, (error) => this.fail(error)));
    this.stops.push(onSnapshot(settings, { includeMetadataChanges: true }, async (snapshot) => {
      const data = snapshot.data();
      if (snapshot.exists() && validSettings(data) && await this.store.mergeCloudSettings(data)) this.changed();
      if (!snapshot.metadata.fromCache && !this.reconciledSettings) {
        this.reconciledSettings = true;
        if (this.store.data.settingsCloudDirty || !snapshot.exists() || (validSettings(data) && (!this.store.data.settingsCloudRevision || !data.cloudRevision) && this.store.data.settingsUpdatedAt > data.updatedAt)) this.queueSettings();
        this.updateReady();
      }
    }, (error) => this.fail(error)));
  }

  async uploadLocal() {
    if (!this.user || !database) return;
    if (this.store.data.settingsCloudDirty) this.pendingSettings = true;
    for (const game of Object.values(this.store.data.games)) if (game.cloudDirty) this.pendingGames.set(game.id, game.updatedAt);
    await this.flushNow();
  }

  queueGame(game: Game) {
    if (!this.user || !database) return;
    this.pendingGames.set(game.id, Math.max(game.updatedAt, this.pendingGames.get(game.id) || 0));
    this.schedule();
  }

  queueSettings() {
    if (!this.user || !database) return;
    this.pendingSettings = true;
    this.schedule();
  }

  private queueDelete(id: string) {
    if (!this.user || !database) return;
    this.pendingGames.delete(id);
    this.pendingDeletes.add(id);
    this.schedule();
  }

  private async writeGame(id: string, queuedUpdatedAt: number): Promise<boolean> {
    if (!this.user || !database) return true;
    const game = this.store.data.games[id];
    if (!game) return true;
    const syncedUpdatedAt = Math.max(game.updatedAt, queuedUpdatedAt);
    const reference = doc(database, "users", this.user.uid, "sudokuGames", game.id);
    try {
      const encoded = encodeCloudGame(game);
      const revision = await runTransaction(database, async (transaction) => {
        const remote = await transaction.get(reference);
        const remoteGame = decodeCloudGame(remote.data());
        const nextRevision = Math.max(remoteGame?.cloudRevision || 0, game.cloudRevision || 0) + 1;
        transaction.set(reference, { ...encoded, cloudRevision: nextRevision });
        return nextRevision;
      });
      await this.store.markGameSynced(id, revision, syncedUpdatedAt);
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    }
  }

  async deleteGame(id: string) {
    if (!this.user || !database) return true;
    this.queueDelete(id);
    await this.flushNow();
    return !this.pendingDeletes.has(id) && !this.error;
  }

  private async writeSettings(): Promise<boolean> {
    if (!this.user || !database || !this.store.data.settingsUpdatedAt) return true;
    const reference = doc(database, "users", this.user.uid, "sudokuMeta", "settings");
    const settings = encodeCloudSettings(this.store.data);
    try {
      const revision = await runTransaction(database, async (transaction) => {
        const remote = await transaction.get(reference);
        const remoteData = remote.data();
        const remoteDeletions = validSettings(remoteData) ? remoteData.deletedGames || {} : {};
        const deletedGames = { ...remoteDeletions };
        for (const [id, deletedAt] of Object.entries(settings.deletedGames || {})) deletedGames[id] = Math.max(deletedAt, deletedGames[id] || 0);
        const nextRevision = Math.max(validSettings(remoteData) ? remoteData.cloudRevision || 0 : 0, settings.cloudRevision || 0) + 1;
        transaction.set(reference, { ...settings, cloudRevision: nextRevision, deletedGames });
        return nextRevision;
      });
      await this.store.markSettingsSynced(revision, settings.updatedAt);
      return true;
    } catch (error) {
      this.fail(error);
      return false;
    }
  }

  private schedule() {
    if (!this.firstQueuedAt) this.firstQueuedAt = Date.now();
    if (this.flushTimer !== null) window.clearTimeout(this.flushTimer);
    const delay = Math.min(350, Math.max(0, 2_000 - (Date.now() - this.firstQueuedAt)));
    this.flushTimer = window.setTimeout(() => { this.flushTimer = null; void this.flushNow(); }, delay);
    const wasWorking = this.working;
    this.refreshWorking();
    if (wasWorking === this.working) this.changed();
  }

  private async flushNow() {
    if (!this.user || !database) return;
    if (this.flushTimer !== null) { window.clearTimeout(this.flushTimer); this.flushTimer = null; }
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.drain();
    try { await this.flushPromise; }
    finally { this.flushPromise = null; this.refreshWorking(); }
  }

  private async drain() {
    this.error = "";
    this.refreshWorking();
    while (this.pendingSettings || this.pendingDeletes.size || this.pendingGames.size) {
      const settings = this.pendingSettings;
      const deletes = [...this.pendingDeletes];
      const games = [...this.pendingGames.entries()];
      this.pendingSettings = false;
      this.pendingDeletes.clear();
      this.pendingGames.clear();
      this.firstQueuedAt = 0;
      this.inFlightCount = Number(settings) + deletes.length + games.length;
      this.refreshWorking();

      let failed = false;
      if (settings && !await this.writeSettings()) { this.pendingSettings = true; failed = true; }
      const deleteResults = await inBatches(deletes, async (id) => {
        try { await deleteDoc(doc(database!, "users", this.user!.uid, "sudokuGames", id)); return true; }
        catch (error) { this.fail(error); return false; }
      });
      deleteResults.forEach((succeeded, index) => { if (!succeeded) { this.pendingDeletes.add(deletes[index]); failed = true; } });
      const gameResults = await inBatches(games, ([id, updatedAt]) => this.writeGame(id, updatedAt));
      gameResults.forEach((succeeded, index) => { if (!succeeded) { this.pendingGames.set(games[index][0], games[index][1]); failed = true; } });
      this.inFlightCount = 0;
      if (failed) break;
    }
    if (!this.pendingSettings && !this.pendingDeletes.size && !this.pendingGames.size) this.error = "";
  }

  private refreshWorking() {
    const working = Boolean(this.flushTimer !== null || this.flushPromise || this.inFlightCount);
    if (this.working === working) return;
    this.working = working;
    this.changed();
  }

  private updateReady() {
    this.ready = this.reconciledGames && this.reconciledSettings;
    this.changed();
  }

  private fail(cause?: unknown) {
    const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
    console.error("Brain Games Sudoku cloud sync failed", cause);
    this.error = code.includes("permission-denied")
      ? "Cloud permissions rejected this sync. Update Brain Games, then retry from Settings; your latest changes remain saved on this device."
      : code.includes("failed-precondition")
        ? "Cloud rejected a saved session. Update Brain Games, then retry from Settings; your complete puzzle remains saved on this device."
      : code.includes("unavailable") || code.includes("network")
        ? "Cloud sync is temporarily unavailable. Your latest changes remain saved on this device; reconnect and retry from Settings."
        : "Sync failed. Your latest changes remain saved on this device; retry from Settings.";
    this.changed();
  }

  stop() {
    this.stops.forEach((stop) => stop());
    this.stops = [];
    if (this.flushTimer !== null) window.clearTimeout(this.flushTimer);
    this.flushTimer = null;
    this.pendingGames.clear();
    this.pendingDeletes.clear();
    this.pendingSettings = false;
    this.firstQueuedAt = 0;
    this.inFlightCount = 0;
    this.working = false;
  }
}
