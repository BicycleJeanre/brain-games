import type { Auth, User } from "firebase/auth";
import type { Firestore, Unsubscribe } from "firebase/firestore";
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

type AuthApi = typeof import("firebase/auth");
type FirestoreApi = typeof import("firebase/firestore");

interface CloudServices {
  auth: Auth;
  database: Firestore;
  authApi: AuthApi;
  firestoreApi: FirestoreApi;
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
  if (!available) {
    changed(null);
    return () => {};
  }
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
  if (available) {
    const { auth, authApi } = await available;
    await authApi.signOut(auth);
  }
}

export async function sendReset(email: string) {
  const available = services();
  if (!available) throw new Error("Cloud accounts are not configured for this installation.");
  const { auth, authApi } = await available;
  await authApi.sendPasswordResetEmail(auth, email);
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
    const available = services();
    if (!user || !available) return;
    const { database, firestoreApi } = await available;
    const reference = firestoreApi.doc(database, "users", user.uid, "wordState", "app");
    this.stopListening = firestoreApi.onSnapshot(reference, { includeMetadataChanges: true }, async (snapshot) => {
      const data: unknown = snapshot.data();
      if (snapshot.exists() && validCloudData(data)) await this.store.mergeRemote(data);
      if (!snapshot.metadata.fromCache) this.ready = true;
      this.changed();
    }, (error) => this.fail(error));
    await this.upload();
  }

  async upload() {
    const available = services();
    if (!this.user || !available) return;
    this.working = true;
    this.changed();
    const { database, firestoreApi } = await available;
    const reference = firestoreApi.doc(database, "users", this.user.uid, "wordState", "app");
    try {
      await firestoreApi.runTransaction(database, async (transaction) => {
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
