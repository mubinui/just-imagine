import { AdminFlagsDocSchema, adminPaths } from '@just-imagine/protocol';
import { adminAuth, db } from './firebase';

export class AuthError extends Error {
  readonly code = 'UNAUTHENTICATED' as const;
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function verifyIdToken(idToken: string): Promise<{ uid: string }> {
  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    return { uid: decoded.uid };
  } catch (e) {
    throw new AuthError(e instanceof Error ? e.message : 'invalid token');
  }
}

/** The caller's token is valid but does not carry the admin custom claim. */
export class AdminRequiredError extends Error {
  readonly code = 'FORBIDDEN' as const;
  constructor() {
    super('admin claim required');
    this.name = 'AdminRequiredError';
  }
}

/** True only for the exact custom claim `admin: true` (granted by scripts/grant-admin.mjs). */
export function isAdmin(claims: Record<string, unknown> | null | undefined): boolean {
  return claims?.['admin'] === true;
}

/**
 * Verifies an ID token (checking revocation) and requires the admin claim.
 * Throws AuthError for a missing, invalid or revoked token and AdminRequiredError otherwise.
 */
export async function requireAdmin(
  idToken: string,
): Promise<{ uid: string; email: string | null }> {
  let decoded: Awaited<ReturnType<ReturnType<typeof adminAuth>['verifyIdToken']>>;
  try {
    decoded = await adminAuth().verifyIdToken(idToken, true);
  } catch (e) {
    throw new AuthError(e instanceof Error ? e.message : 'invalid token');
  }
  if (!isAdmin(decoded)) throw new AdminRequiredError();
  return { uid: decoded.uid, email: decoded.email ?? null };
}

/**
 * Whether an admin has suspended this parent account. The api refuses parent routes and the
 * gateway must refuse `hello` while this is true. Read errors propagate so callers fail closed.
 */
export async function isAccountSuspended(uid: string): Promise<boolean> {
  const snap = await db().doc(adminPaths.flags(uid)).get();
  if (!snap.exists) return false;
  return AdminFlagsDocSchema.parse(snap.data()).suspended;
}
