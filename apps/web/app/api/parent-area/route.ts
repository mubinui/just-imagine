import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@just-imagine/server-core';
import {
  FRESH_SIGN_IN_SECONDS,
  SESSION_COOKIE,
  createParentUnlock,
  parentUnlockValid,
  readSessionCookie,
  sessionCookieOptions,
  sessionCookieValue,
  verifyFamilySession,
} from '../../../lib/session';

/** The parent area: GET reports whether it is open, POST opens it again, DELETE locks it. */
function sameOrigin(req: NextRequest) {
  const publicOrigin = process.env.WEB_URL
    ? new URL(process.env.WEB_URL).origin
    : req.nextUrl.origin;
  return req.headers.get('origin') === publicOrigin;
}
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
/** Seconds the family session has left, so rewriting the cookie never extends it. */
const remaining = (exp: number) => Math.max(0, Math.floor(exp - Date.now() / 1000));

async function familySession(req: NextRequest) {
  const cookie = readSessionCookie(req.cookies.get(SESSION_COOKIE)?.value);
  return { ...cookie, decoded: await verifyFamilySession(cookie.session) };
}

export async function GET(req: NextRequest) {
  const { decoded, unlock } = await familySession(req);
  if (!decoded) return fail('Please sign in again.', 401);
  return NextResponse.json({ open: await parentUnlockValid(decoded.uid, unlock) });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Invalid origin', 403);
  const { decoded, session } = await familySession(req);
  if (!decoded) return fail('Please sign in again.', 401);
  try {
    const body = (await req.json()) as { idToken?: unknown };
    if (typeof body.idToken !== 'string') throw new Error('Missing token');
    const token = await adminAuth().verifyIdToken(body.idToken, true);
    if (token.uid !== decoded.uid || Object.hasOwn(token, 'role'))
      return fail('Sign in with the family account that is already open.', 403);
    if (Date.now() / 1000 - token.auth_time > FRESH_SIGN_IN_SECONDS)
      return fail('Please sign in again to continue', 401);
    const unlock = await createParentUnlock(body.idToken);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE,
      sessionCookieValue(session, unlock),
      sessionCookieOptions(remaining(decoded.exp)),
    );
    return response;
  } catch {
    return fail('Please sign in again to continue', 401);
  }
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return fail('Invalid origin', 403);
  const { decoded, session, unlock } = await familySession(req);
  const response = NextResponse.json({ ok: true });
  if (decoded && unlock)
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions(remaining(decoded.exp)));
  return response;
}
