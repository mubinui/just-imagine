import { getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

export function isEmulator(): boolean {
  return Boolean(
    process.env['FIRESTORE_EMULATOR_HOST'] || process.env['FIREBASE_AUTH_EMULATOR_HOST'],
  );
}

export function getAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  const projectId =
    process.env['GOOGLE_CLOUD_PROJECT'] ?? (isEmulator() ? 'demo-just-imagine' : undefined);
  return initializeApp(projectId ? { projectId } : {});
}

export function db(): Firestore {
  const firestore = getFirestore(getAdminApp());
  return firestore;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
