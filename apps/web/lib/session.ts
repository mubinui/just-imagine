import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth } from '@just-imagine/server-core';
export async function getParentSession() {
  const cookie = (await cookies()).get('__session')?.value;
  if (!cookie) return null;
  try {
    return await adminAuth().verifySessionCookie(cookie, true);
  } catch {
    return null;
  }
}
