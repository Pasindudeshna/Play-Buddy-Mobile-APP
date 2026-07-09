import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

function ensureInitialized(): void {
  if (getApps().length > 0) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");

  initializeApp({ credential: cert(JSON.parse(raw)) });
}

export function getDb(): Firestore {
  ensureInitialized();
  return getFirestore();
}

export function getAdminAuth(): Auth {
  ensureInitialized();
  return getAuth();
}
