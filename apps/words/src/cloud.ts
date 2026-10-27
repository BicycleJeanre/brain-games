import type { Auth, User } from "firebase/auth";
import type { Firestore, Unsubscribe } from "firebase/firestore";
import { normalizeData, type Store } from "./store.ts";
import type { AppData, Preferences, PuzzleProgress } from "./types.ts";

const environment = import.meta.env ?? {};
const config = {
  apiKey: environment.VITE_FIREBASE_API_KEY,
  authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: environment.VITE_FIREBASE_PROJECT_ID,
  appId: environment.VITE_FIREBASE_APP_ID,
};

export const cloudConfigured = Object.values(config).every(Boolean);
type AuthApi = typeof import("firebase/auth");
type FirestoreApi = typeof import("firebase/firestore");

interface CloudServices {
  auth: Auth;
  database: Firestore;
  authApi: AuthApi;
  firestoreApi: FirestoreApi;
}

type CloudProgress = Omit<PuzzleProgress, "cloudRevision"> & { version: 1; id: string; cloudRevision: number };
type CloudSettings = {
  version: 1;
  cloudRevision: number;
  catalogueVersion: string;
  settingsUpdatedAt: number;
  preferences: Preferences;
  deletedProgress: Record<string, number>;
  activePuzzleId: string | null;
};
const SYNC_CONCURRENCY = 4;

async function inBatches<T, R>(items: T[], work: (item: T) => Promise<R>) {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += SYNC_CONCURRENCY) {
    results.push(...await Promise.all(items.slice(index, index + SYNC_CONCURRENCY).map(work)));
  }
  return results;
}

let servicesPromise: Promise<CloudServices> | undefined;

async function initializeServices() {
  const [{ initializeApp }, authApi, firestoreApi] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
  ]);
  const app = initializeApp(config);
  const auth = authApi.getAuth(app);
  const database = firestoreApi.initializeFirestore(app, {
    localCache: firestoreApi.persistentLocalCache({ tabManager: firestoreApi.persistentMultipleTabManager() }),
  });
  if (environment.VITE_USE_EMULATORS === "true") {
    authApi.connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    firestoreApi.connectFirestoreEmulator(database, "127.0.0.1", 8080);
  }
  return { auth, database, authApi, firestoreApi };
}

function services() {
  if (!cloudConfigured) return null;
  servicesPromise ??= initializeServices();
  return servicesPromise;
}

export async function watchAuth(changed: (user: User | null) => void) {
  const available = services();
  if (!available) { changed(null); return () => {}; }
  const { auth, authApi } = await available;
  return authApi.onAuthStateChanged(auth, changed);
}

export async function signInAccount(email: string, password: string, create = false) {
  const available = services();
  if (!available) throw new Error("Cloud accounts are not configured for this installation.");
  const { auth, authApi } = await available;
  if (create) await authApi.createUserWithEmailAndPassword(auth, email, password);
  else await authApi.signInWithEmailAndPassword(auth, email, password);
}

export async function signOutAccount() {
  const available = services();
  if (available) { const { auth, authApi } = await available; await authApi.signOut(auth); }
}

export async function sendReset(email: string) {
  const available = services();
  if (!available) throw new Error("Cloud accounts are not configured for this installation.");
  const { auth, authApi } = await available;
  await authApi.sendPasswordResetEmail(auth, email);
}

function validLegacyData(value: unknown): value is AppData {
  const data = value as Partial<AppData>;
  return Boolean(data && data.version === 1 && typeof data.progress === "object" && typeof data.preferences === "object");
}

function encodeProgress(id: string, progress: PuzzleProgress): CloudProgress {
  const { cloudRevision: _revision, ...data } = progress;
  return { ...data, version: 1, id, cloudRevision: progress.cloudRevision || 0 };
}

function decodeProgress(value: unknown): { id: string; progress: PuzzleProgress } | null {
  const data = value as Partial<CloudProgress>;
  if (!data || data.version !== 1 || typeof data.id !== "string" || typeof data.puzzleId !== "string"
    || !["word-search", "crossword", "word-grid"].includes(String(data.kind)) || !Array.isArray(data.entries)
    || !Array.isArray(data.foundWordIds) || !Array.isArray(data.hintedCells) || typeof data.updatedAt !== "number") return null;
  const { version: _version, id, ...progress } = data as CloudProgress;
  return { id, progress: { ...progress, cloudRevision: Math.max(0, Math.floor(Number(progress.cloudRevision) || 0)) } };
}

function encodeSettings(data: AppData): CloudSettings {
  return {
    version: 1,
    cloudRevision: data.settingsCloudRevision || 0,
    catalogueVersion: data.catalogueVersion,
    settingsUpdatedAt: data.settingsUpdatedAt,
    preferences: data.preferences,
    deletedProgress: data.deletedProgress,
    activePuzzleId: data.activePuzzleId,
  };
}

function validSettings(value: unknown): value is CloudSettings {
  const data = value as Partial<CloudSettings>;
  return Boolean(data && data.version === 1 && typeof data.preferences === "object" && typeof data.deletedProgress === "object" && typeof data.settingsUpdatedAt === "number");
}

export class CloudSync {
  user: User | null = null;
  ready = false;
  working = false;
  error = "";
  private stops: Unsubscribe[] = [];
  private pendingProgress = new Map<string, number>();
  private pendingDeletes = new Set<string>();
  private pendingSettings = false;
  private flushTimer: number | null = null;
  private flushPromise: Promise<void> | null = null;
  private firstQueuedAt = 0;
  private reconciledProgress = false;
  private reconciledSettings = false;

  constructor(private store: Store, private changed: (dataChanged?: boolean) => void) {
    addEventListener("online", () => { if (this.user) void this.flushNow(); });
  }

  status() {
    if (!cloudConfigured) return "Device only";
    if (!this.user) return "Sign in to sync";
    if (!navigator.onLine) return "Saved locally · offline";
    if (this.error) return "Sync needs attention";
    if (this.working) return "Syncing…";
    return this.ready ? "Synced" : "Connecting…";
  }

  async setUser(user: User | null) {
    this.stop();
    this.user = user;
    this.ready = false;
    this.error = "";
    this.changed();
    const available = services();
    if (!user || !available) return;
    const { database, firestoreApi } = await available;

    const legacy = await firestoreApi.getDoc(firestoreApi.doc(database, "users", user.uid, "wordState", "app"));
    if (legacy.exists() && validLegacyData(legacy.data())) await this.store.mergeRemote(normalizeData(legacy.data()));

    const progressCollection = firestoreApi.collection(database, "users", user.uid, "wordProgress");
    const settingsReference = firestoreApi.doc(database, "users", user.uid, "wordMeta", "settings");
    this.stops.push(firestoreApi.onSnapshot(progressCollection, { includeMetadataChanges: true }, async (snapshot) => {
      let updated = false;
      const remote = new Map<string, PuzzleProgress>();
      const documents = !this.reconciledProgress ? snapshot.docs : snapshot.docChanges().filter((change) => change.type !== "removed").map((change) => change.doc);
      for (const item of documents) {
        const decoded = decodeProgress(item.data());
        if (!decoded) continue;
        remote.set(decoded.id, decoded.progress);
        updated = (await this.store.mergeRemoteProgress(decoded.id, decoded.progress)) || updated;
      }
      if (!snapshot.metadata.fromCache && !this.reconciledProgress) {
        this.reconciledProgress = true;
        for (const [id, progress] of Object.entries(this.store.data.progress)) {
          const cloud = remote.get(id);
          const localRevision = progress.cloudRevision || 0;
          const remoteRevision = cloud?.cloudRevision || 0;
          if (!cloud || localRevision > remoteRevision || localRevision === remoteRevision && progress.updatedAt > cloud.updatedAt) this.queueProgress(progress, id);
        }
        this.updateReady();
      }
      if (updated) this.changed(true);
    }, (error) => this.fail(error)));
    this.stops.push(firestoreApi.onSnapshot(settingsReference, { includeMetadataChanges: true }, async (snapshot) => {
      const data = snapshot.data();
      if (snapshot.exists() && validSettings(data)) {
        const before = JSON.stringify(this.store.data.deletedProgress);
        const localUpdatedAt = this.store.data.settingsUpdatedAt;
        await this.store.mergeRemote({ ...this.store.data, ...data, settingsCloudRevision: data.cloudRevision, progress: {} });
        if (before !== JSON.stringify(this.store.data.deletedProgress) || data.settingsUpdatedAt > localUpdatedAt) this.changed(true);
      }
      if (!snapshot.metadata.fromCache && !this.reconciledSettings) {
        this.reconciledSettings = true;
        if (!snapshot.exists() || !validSettings(data) || this.store.data.settingsUpdatedAt > data.settingsUpdatedAt) this.queueSettings();
        this.updateReady();
      }
    }, (error) => this.fail(error)));
  }

  queueProgress(progress: PuzzleProgress, sessionId: string) {
    if (!this.user) return;
    this.pendingDeletes.delete(sessionId);
    this.pendingProgress.set(sessionId, Math.max(progress.updatedAt, this.pendingProgress.get(sessionId) || 0));
    this.schedule();
  }

  queueDelete(sessionId: string) {
    if (!this.user) return;
    this.pendingProgress.delete(sessionId);
    this.pendingDeletes.add(sessionId);
    this.pendingSettings = true;
    this.schedule();
  }

  queueSettings() {
    if (!this.user) return;
    this.pendingSettings = true;
    this.schedule();
  }

  async upload() {
    if (!this.user) return;
    for (const [id, progress] of Object.entries(this.store.data.progress)) this.pendingProgress.set(id, progress.updatedAt);
    this.pendingSettings = true;
    await this.flushNow();
  }

  private schedule() {
    if (!this.firstQueuedAt) this.firstQueuedAt = Date.now();
    if (this.flushTimer !== null) window.clearTimeout(this.flushTimer);
    const delay = Math.min(350, Math.max(0, 2_000 - (Date.now() - this.firstQueuedAt)));
    this.flushTimer = window.setTimeout(() => { this.flushTimer = null; void this.flushNow(); }, delay);
    this.refreshWorking();
  }

  private async writeProgress(id: string, queuedUpdatedAt: number) {
    const available = services();
    const progress = this.store.data.progress[id];
    if (!this.user || !available || !progress) return true;
    const { database, firestoreApi } = await available;
    const reference = firestoreApi.doc(database, "users", this.user.uid, "wordProgress", id);
    const encoded = encodeProgress(id, progress);
    try {
      const revision = await firestoreApi.runTransaction(database, async (transaction) => {
        const remote = decodeProgress((await transaction.get(reference)).data());
        const nextRevision = Math.max(remote?.progress.cloudRevision || 0, progress.cloudRevision || 0) + 1;
        transaction.set(reference, { ...encoded, cloudRevision: nextRevision });
        return nextRevision;
      });
      if ((this.store.data.progress[id]?.updatedAt || 0) <= queuedUpdatedAt) await this.store.markProgressSynced(id, revision);
      return true;
    } catch (error) { this.fail(error); return false; }
  }

  private async writeSettings() {
    const available = services();
    if (!this.user || !available) return true;
    const { database, firestoreApi } = await available;
    const reference = firestoreApi.doc(database, "users", this.user.uid, "wordMeta", "settings");
    const settings = encodeSettings(this.store.data);
    try {
      const revision = await firestoreApi.runTransaction(database, async (transaction) => {
        const remote = (await transaction.get(reference)).data();
        const remoteDeletions = validSettings(remote) ? remote.deletedProgress : {};
        const deletedProgress = { ...remoteDeletions };
        for (const [id, deletedAt] of Object.entries(settings.deletedProgress)) deletedProgress[id] = Math.max(deletedAt, deletedProgress[id] || 0);
        const nextRevision = Math.max(validSettings(remote) ? remote.cloudRevision || 0 : 0, settings.cloudRevision) + 1;
        transaction.set(reference, { ...settings, deletedProgress, cloudRevision: nextRevision });
        return nextRevision;
      });
      await this.store.markSettingsSynced(revision);
      return true;
    } catch (error) { this.fail(error); return false; }
  }

  private async flushNow() {
    if (!this.user) return;
    if (this.flushTimer !== null) { window.clearTimeout(this.flushTimer); this.flushTimer = null; }
    if (this.flushPromise) return this.flushPromise;
    this.flushPromise = this.drain();
    try { await this.flushPromise; }
    finally { this.flushPromise = null; this.refreshWorking(); }
  }

  private async drain() {
    this.error = "";
    this.refreshWorking();
    while (this.pendingSettings || this.pendingDeletes.size || this.pendingProgress.size) {
      const settings = this.pendingSettings;
      const deletes = [...this.pendingDeletes];
      const progress = [...this.pendingProgress.entries()];
      this.pendingSettings = false;
      this.pendingDeletes.clear();
      this.pendingProgress.clear();
      this.firstQueuedAt = 0;
      let failed = false;
      if (settings && !await this.writeSettings()) { this.pendingSettings = true; failed = true; }
      const available = services();
      if (available && this.user) {
        const { database, firestoreApi } = await available;
        const results = await inBatches(deletes, async (id) => {
          try { await firestoreApi.deleteDoc(firestoreApi.doc(database, "users", this.user!.uid, "wordProgress", id)); return true; }
          catch (error) { this.fail(error); return false; }
        });
        results.forEach((ok, index) => { if (!ok) { this.pendingDeletes.add(deletes[index]!); failed = true; } });
      }
      const results = await inBatches(progress, ([id, updatedAt]) => this.writeProgress(id, updatedAt));
      results.forEach((ok, index) => { if (!ok) { this.pendingProgress.set(progress[index]![0], progress[index]![1]); failed = true; } });
      if (failed) break;
    }
    if (!this.pendingSettings && !this.pendingDeletes.size && !this.pendingProgress.size) this.error = "";
  }

  private refreshWorking() {
    const working = Boolean(this.flushTimer !== null || this.flushPromise || this.pendingSettings || this.pendingDeletes.size || this.pendingProgress.size);
    if (working === this.working) return;
    this.working = working;
    this.changed();
  }

  private updateReady() {
    this.ready = this.reconciledProgress && this.reconciledSettings;
    this.changed();
  }

  private fail(error: unknown) {
    console.error("Brain Games word sync failed", error);
    this.error = "Your changes remain saved on this device. Reconnect and retry from Settings.";
    this.changed();
  }

  private stop() {
    this.stops.forEach((stop) => stop());
    this.stops = [];
    if (this.flushTimer !== null) window.clearTimeout(this.flushTimer);
    this.flushTimer = null;
    this.pendingProgress.clear();
    this.pendingDeletes.clear();
    this.pendingSettings = false;
    this.firstQueuedAt = 0;
    this.reconciledProgress = false;
    this.reconciledSettings = false;
    this.working = false;
  }
}
