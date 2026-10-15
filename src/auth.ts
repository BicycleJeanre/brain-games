import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  connectAuthEmulator,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

const environment = import.meta.env ?? {};
const config = {
  apiKey: environment.VITE_FIREBASE_API_KEY,
  authDomain: environment.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: environment.VITE_FIREBASE_PROJECT_ID,
  appId: environment.VITE_FIREBASE_APP_ID,
};

export const profileConfigured = Object.values(config).every(Boolean);
const app = profileConfigured ? initializeApp(config) : null;
const auth = app ? getAuth(app) : null;

if (environment.VITE_USE_EMULATORS === "true" && auth) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}

export type ProfileUser = User;

export function watchProfile(changed: (user: User | null) => void) {
  return auth ? onAuthStateChanged(auth, changed) : (changed(null), () => {});
}

export async function useProfile(email: string, password: string, create = false) {
  if (!auth) throw new Error("Brain Games profiles are not configured for this installation.");
  if (create) await createUserWithEmailAndPassword(auth, email, password);
  else await signInWithEmailAndPassword(auth, email, password);
}

export async function leaveProfile() {
  if (auth) await signOut(auth);
}

export async function resetProfilePassword(email: string) {
  if (!auth) throw new Error("Brain Games profiles are not configured for this installation.");
  await sendPasswordResetEmail(auth, email);
}

export function profileError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
  if (code.includes("invalid-credential")) return "Email or password is incorrect.";
  if (code.includes("email-already-in-use")) return "That email already has a Brain Games profile. Choose Sign in.";
  if (code.includes("weak-password")) return "Use a password with at least six characters.";
  if (code.includes("invalid-email")) return "Enter a valid email address.";
  if (code.includes("too-many-requests")) return "Too many attempts. Wait a little and try again.";
  if (code.includes("network-request-failed")) return "You appear to be offline. Your device progress is still safe.";
  return error instanceof Error ? error.message : "The profile action could not be completed.";
}
