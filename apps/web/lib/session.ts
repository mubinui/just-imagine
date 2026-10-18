import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth } from '@just-imagine/server-core';

/**
 * The family session lives in `__session`, the one cookie Firebase hosting passes to the server.
 * While the parent area is open the cookie also carries a short unlock: a second session cookie,
 * made from a fresh sign-in and appended after `|`. Opening any child screen drops the unlock,
 * so a child can keep playing but cannot walk back into the parent area.
 */
export const SESSION_COOKIE = '__session';
const UNLOCK_SEPARATOR = '|';
/** How long an unlock lasts if the grown-up never goes back to the child screens. */
export const PARENT_AREA_SECONDS = 60 * 60;
/** How recent a sign-in must be to start a session or open the parent area. */
export const FRESH_SIGN_IN_SECONDS = 300;

export function readSessionCookie(value: string | undefined) {
  const [session = '', unlock = ''] = (value ?? '').split(UNLOCK_SEPARATOR);
  return { session, unlock };
}
export const sessionCookieValue = (session: string, unlock?: string) =>
  unlock ? session + UNLOCK_SEPARATOR + unlock : session;
export const sessionCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge,
});
/** An unlock for the parent area, made from an ID token whose sign-in has just been checked. */
export const createParentUnlock = (idToken: string) =>
  adminAuth().createSessionCookie(idToken, { expiresIn: PARENT_AREA_SECONDS * 1000 });

/** The family session in a cookie value, or null for none, an expired one or a school account. */
export async function verifyFamilySession(session: string) {
  if (!session) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(session, true);
    return Object.hasOwn(decoded, 'role') ? null : decoded;
  } catch {
    return null;
  }
}
/** Whether an unlock is valid and belongs to the same family account. */
export async function parentUnlockValid(uid: string, unlock: string) {
  if (!unlock) return false;
  try {
    const decoded = await adminAuth().verifySessionCookie(unlock, true);
    return decoded.uid === uid && !Object.hasOwn(decoded, 'role');
  } catch {
    return false;
  }
}

export async function getParentSession() {
  const { session } = readSessionCookie((await cookies()).get(SESSION_COOKIE)?.value);
  return verifyFamilySession(session);
}
/** The family session and whether the parent area is unlocked for it. */
export async function getParentArea() {
  const { session: raw, unlock } = readSessionCookie((await cookies()).get(SESSION_COOKIE)?.value);
  const session = await verifyFamilySession(raw);
  return { session, open: session ? await parentUnlockValid(session.uid, unlock) : false };
}
