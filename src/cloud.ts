import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  doc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  runTransaction,
  type Unsubscribe,
} from "firebase/firestore";
import { normalizeData, type Store } from "./store.ts";
import type { AppData } from "./types.ts";

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
const database = app ? initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }) : null;

if (environment.VITE_USE_EMULATORS === "true" && auth && database) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(database, "127.0.0.1", 8080);
}

export const watchAuth = (changed: (user: User | null) => void) => auth ? onAuthStateChanged(auth, changed) : (changed(null), () => {});

export async function signInAccount(email: string, password: string, create = false) {
  if (!auth) throw new Error("Cloud accounts are not configured for this installation.");
  if (create) await createUserWithEmailAndPassword(auth, email, password);
  else await signInWithEmailAndPassword(auth, email, password);
}

export async function signOutAccount() { if (auth) await signOut(auth); }
export async function sendReset(email: string) {
  if (!auth) throw new Error("Cloud accounts are not configured for this installation.");
  await sendPasswordResetEmail(auth, email);
}

function validCloudData(value: unknown): value is AppData {
  const data = value as Partial<AppData>;
  return Boolean(data && data.version === 1 && typeof data.progress === "object" && typeof data.preferences === "object");
}

export class CloudSync {
  user: User | null = null;
  ready = false;
  working = false;
  error = "";
  private stopListening?: Unsubscribe;
  constructor(private store: Store, private changed: () => void) {}

  status() {
    if (!cloudConfigured) return "Device only";
    if (!this.user) return "Sign in to sync";
    if (this.error) return "Sync needs attention";
    if (this.working) return "Syncing…";
    return this.ready ? "Synced" : "Connecting…";
  }

  async setUser(user: User | null) {
    this.stopListening?.();
    this.user = user;
    this.ready = false;
    this.error = "";
    this.changed();
    if (!user || !database) return;
    const reference = doc(database, "users", user.uid, "state", "app");
    this.stopListening = onSnapshot(reference, { includeMetadataChanges: true }, async (snapshot) => {
      const data: unknown = snapshot.data();
      if (snapshot.exists() && validCloudData(data)) await this.store.mergeRemote(data);
      if (!snapshot.metadata.fromCache) this.ready = true;
      this.changed();
    }, (error) => this.fail(error));
    await this.upload();
  }

  async upload() {
    if (!this.user || !database) return;
    this.working = true;
    this.changed();
    const reference = doc(database, "users", this.user.uid, "state", "app");
    try {
      await runTransaction(database, async (transaction) => {
        const remote = await transaction.get(reference);
        if (remote.exists() && validCloudData(remote.data())) await this.store.mergeRemote(normalizeData(remote.data()));
        transaction.set(reference, this.store.data);
      });
      this.error = "";
    } catch (error) { this.fail(error); }
    finally { this.working = false; this.changed(); }
  }

  private fail(error: unknown) {
    console.error("WTrack cloud sync failed", error);
    this.error = "Your changes remain saved on this device. Reconnect and retry from Settings.";
    this.changed();
  }
}
