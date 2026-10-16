import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, isAdmin } from '@just-imagine/server-core';

const MAX_AGE_SECONDS = 8 * 60 * 60;
function sameOrigin(req: NextRequest) {
  const origin = process.env.WEB_URL ? new URL(process.env.WEB_URL).origin : req.nextUrl.origin;
  return req.headers.get('origin') === origin;
}
const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge,
});

/** Operator sign-in: never creates a parent account, unlike /api/session. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  let idToken: unknown;
  try {
    idToken = (await req.json()).idToken;
  } catch {
    idToken = undefined;
  }
  if (typeof idToken !== 'string')
    return NextResponse.json({ error: 'Sign in again to continue.' }, { status: 401 });
  try {
    const token = await adminAuth().verifyIdToken(idToken, true);
    if (!isAdmin(token))
      return NextResponse.json(
        { error: 'This account is not an operator account.' },
        { status: 403 },
      );
    if (Date.now() / 1000 - token.auth_time > 300)
      return NextResponse.json({ error: 'Sign in again to continue.' }, { status: 401 });
    const cookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: MAX_AGE_SECONDS * 1000,
    });
    const response = NextResponse.json({ ok: true });
    response.cookies.set('__session', cookie, cookieOptions(MAX_AGE_SECONDS));
    return response;
  } catch {
    return NextResponse.json({ error: 'Sign in again to continue.' }, { status: 401 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set('__session', '', cookieOptions(0));
  return response;
}
