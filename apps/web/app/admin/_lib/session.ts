import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth, isAdmin } from '@just-imagine/server-core';

export type AdminGate =
  { kind: 'signed-out' } | { kind: 'not-admin' } | { kind: 'admin'; email: string };

/** Reads the verified session cookie (revocation checked) and the `admin` custom claim. */
export async function adminGate(): Promise<AdminGate> {
  const cookie = (await cookies()).get('__session')?.value;
  if (!cookie) return { kind: 'signed-out' };
  try {
    const session = await adminAuth().verifySessionCookie(cookie, true);
    return isAdmin(session)
      ? { kind: 'admin', email: session.email ?? session.uid }
      : { kind: 'not-admin' };
  } catch {
    return { kind: 'signed-out' };
  }
}
