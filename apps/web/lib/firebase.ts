'use client';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { env } from './env';
let instance: ReturnType<typeof init> | undefined;
function init() {
  const app =
    getApps()[0] ??
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'demo-key',
      authDomain:
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'demo-just-imagine.firebaseapp.com',
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'demo-just-imagine',
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'demo',
    });
  const auth = getAuth(app),
    db = getFirestore(app);
  if (env.emulators) {
    connectAuthEmulator(auth, `http://127.0.0.1:${env.authEmulatorPort}`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, '127.0.0.1', env.firestoreEmulatorPort);
  }
  return { auth, db };
}
export const firebase = () => (instance ??= init());
/**
 * Starts Firebase Auth when a sign-in page opens, ahead of any tap. On phones and Safari, Firebase
 * must load a helper frame before it can open the Google popup. If that happens inside the tap,
 * the popup opens too late, the browser blocks it, and the first tap seems to do nothing.
 */
export function prepareSignIn() {
  if (!env.fake) firebase();
}
export async function currentIdToken() {
  const auth = firebase().auth;
  await auth.authStateReady();
  if (!auth.currentUser) throw new Error('Please sign in again.');
  return auth.currentUser.getIdToken();
}
