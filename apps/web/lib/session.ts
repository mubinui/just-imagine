import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth } from '@just-imagine/server-core';
export async function getParentSession() {
  const cookie = (await cookies()).get('__session')?.value;
  if (!cookie) return null;
  try {
    const session = await adminAuth().verifySessionCookie(cookie, true);
    return Object.hasOwn(session, 'role') ? null : session;
  } catch {
    return null;
  }
}
