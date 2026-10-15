import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, db } from '@just-imagine/server-core';
import { UserDocSchema, paths } from '@just-imagine/protocol';
function sameOrigin(req: NextRequest) {
  return req.headers.get('origin') === req.nextUrl.origin;
}
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  try {
    const body = await req.json();
    if (typeof body.idToken !== 'string') throw new Error('Missing token');
    const token = await adminAuth().verifyIdToken(body.idToken, true);
    if (Date.now() / 1000 - token.auth_time > 300)
      throw new Error('Please sign in again to continue');
    await db().runTransaction(async (tx) => {
      const ref = db().doc(paths.user(token.uid));
      const lock = await tx.get(db().doc(`deletionLocks/${token.uid}`));
      if (lock.exists) throw new Error('Account deletion is in progress');
      const existing = await tx.get(ref);
      if (!existing.exists) {
        if (body.consent !== true)
          throw new Error('Parental consent is required to create your account');
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
    const response = NextResponse.json({ ok: true });
    response.cookies.set('__session', cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 5 * 24 * 60 * 60,
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      {
        status:
          error instanceof Error && error.message === 'Account deletion is in progress' ? 403 : 401,
      },
    );
  }
}
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set('__session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
