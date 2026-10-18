'use client';
import { signOut } from 'firebase/auth';
import { env } from './env';
import { firebase } from './firebase';

/**
 * The browser side of the parent-area lock. The server keeps the real lock in the session cookie
 * (see lib/session.ts); the sample preview, which has no server, keeps it for the tab instead.
 */
const PREVIEW_KEY = 'ji-parent-area';
const ENDPOINT = '/api/parent-area';

function preview(open?: boolean) {
  try {
    if (open === undefined) return sessionStorage.getItem(PREVIEW_KEY) === '1';
    if (open) sessionStorage.setItem(PREVIEW_KEY, '1');
    else sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    // Storage can be blocked; the preview then simply asks again.
  }
  return false;
}

/** Locks the parent area. Every child screen calls this when it opens. */
export function lockParentArea() {
  if (env.fake) {
    preview(false);
    return;
  }
  void fetch(ENDPOINT, { method: 'DELETE', keepalive: true }).catch(() => undefined);
}

/** Whether the parent area is open right now, for screens restored from the browser's history. */
export async function parentAreaOpen() {
  if (env.fake) return preview();
  try {
    const response = await fetch(ENDPOINT, { cache: 'no-store' });
    return response.ok && ((await response.json()) as { open?: boolean }).open === true;
  } catch {
    return false;
  }
}

/** Opens the parent area with the ID token of a sign-in that has just happened. */
export async function unlockParentArea(idToken?: string) {
  if (env.fake) {
    preview(true);
    return;
  }
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || 'Please sign in again to continue');
  }
}

/** Signs the family out on this device and forgets the chosen explorer. */
export async function signOutFamily() {
  if (!env.fake) {
    await signOut(firebase().auth);
    await fetch('/api/session', { method: 'DELETE' });
  }
  preview(false);
  localStorage.removeItem('ji-child');
}
