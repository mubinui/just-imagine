import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, db } from '@just-imagine/server-core';
import { UserDocSchema, paths } from '@just-imagine/protocol';
import {
  FRESH_SIGN_IN_SECONDS,
  SESSION_COOKIE,
  createParentUnlock,
  sessionCookieOptions,
  sessionCookieValue,
} from '../../../lib/session';
const CONSENT_REQUIRED = 'Parental consent is required to create your account';
function sameOrigin(req: NextRequest) {
  const publicOrigin = process.env.WEB_URL
    ? new URL(process.env.WEB_URL).origin
    : req.nextUrl.origin;
  return req.headers.get('origin') === publicOrigin;
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const body = await req.json();
    if (typeof body.idToken !== 'string') throw new Error('Missing token');
    const token = await adminAuth().verifyIdToken(body.idToken, true);
    if (Object.hasOwn(token, 'role'))
      return NextResponse.json(
        { error: 'Use the school sign-in for this account.' },
        { status: 403 },
      );
    if (Date.now() / 1000 - token.auth_time > FRESH_SIGN_IN_SECONDS)
      throw new Error('Please sign in again to continue');
    await db().runTransaction(async (tx) => {
      const ref = db().doc(paths.user(token.uid));
      const lock = await tx.get(db().doc(`deletionLocks/${token.uid}`));
      if (lock.exists) throw new Error('Account deletion is in progress');
      const schoolPrincipal = await tx.get(db().doc(`schoolPrincipals/${token.uid}`));
      if (schoolPrincipal.exists)
        throw new Error('A school account cannot become a family account');
      const existing = await tx.get(ref);
      if (!existing.exists) {
        if (body.consent !== true) throw new Error(CONSENT_REQUIRED);
        tx.create(
          ref,
          UserDocSchema.parse({
            email: token.email || '',
            displayName: token.name || '',
            consentAt: Date.now(),
            plan: 'free',
            stripeCustomerId: null,
            createdAt: Date.now(),
          }),
        );
      }
    });
    const cookie = await adminAuth().createSessionCookie(body.idToken, {
      expiresIn: 5 * 24 * 60 * 60 * 1000,
    });
    // Signing in has just proved who this is, so the parent area starts open.
    const unlock = await createParentUnlock(body.idToken);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(
      SESSION_COOKIE,
      sessionCookieValue(cookie, unlock),
      sessionCookieOptions(5 * 24 * 60 * 60),
    );
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === CONSENT_REQUIRED)
      // A new account only: returning parents never reach this. The page asks for consent once.
      return NextResponse.json({ error: error.message, code: 'CONSENT_REQUIRED' }, { status: 403 });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      {
        status:
          error instanceof Error &&
          (error.message === 'Account deletion is in progress' ||
            error.message === 'A school account cannot become a family account')
            ? 403
            : 401,
      },
    );
  }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0));
  return response;
}
