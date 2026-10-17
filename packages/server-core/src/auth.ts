import {
  AdminFlagsDocSchema,
  adminPaths,
  SchoolDocSchema,
  schoolClaimsOf,
  schoolPaths,
  studentUid,
} from '@just-imagine/protocol';
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

// ---------- schools (docs/superpowers/specs/2026-10-17-schools-stem-design.md §4.2) ----------

/** The token is valid but lacks the school role this route needs. */
export class SchoolRoleRequiredError extends Error {
  readonly code = 'FORBIDDEN' as const;
  constructor(message = 'school role required') {
    super(message);
    this.name = 'SchoolRoleRequiredError';
  }
}

export interface SchoolAdminActor {
  uid: string;
  email: string | null;
  /** Null only for a super admin who did not name a school. */
  schoolId: string | null;
  superAdmin: boolean;
}
export interface StudentActor {
  uid: string;
  schoolId: string;
  studentId: string;
  classId: string;
}

async function decodeChecked(idToken: string) {
  try {
    return await adminAuth().verifyIdToken(idToken, true);
  } catch (e) {
    throw new AuthError(e instanceof Error ? e.message : 'invalid token');
  }
}

/**
 * A teacher of `schoolId` (or of their own school when omitted), or the super admin acting
 * inside `schoolId`. Throws AuthError for bad tokens and SchoolRoleRequiredError otherwise.
 */
export async function requireSchoolAdmin(
  idToken: string,
  schoolId?: string,
): Promise<SchoolAdminActor> {
  const decoded = await decodeChecked(idToken);
  const email = decoded.email ?? null;
  if (isAdmin(decoded))
    return { uid: decoded.uid, email, schoolId: schoolId ?? null, superAdmin: true };
  const claims = schoolClaimsOf(decoded);
  if (claims?.role !== 'schoolAdmin' || (schoolId !== undefined && schoolId !== claims.schoolId))
    throw new SchoolRoleRequiredError();
  return { uid: decoded.uid, email, schoolId: claims.schoolId, superAdmin: false };
}

/** A student whose uid is exactly the one the api mints for their claims. */
export async function requireStudent(idToken: string): Promise<StudentActor> {
  const decoded = await decodeChecked(idToken);
  const claims = schoolClaimsOf(decoded);
  if (claims?.role !== 'student' || decoded.uid !== studentUid(claims.schoolId, claims.studentId))
    throw new SchoolRoleRequiredError();
  return {
    uid: decoded.uid,
    schoolId: claims.schoolId,
    studentId: claims.studentId,
    classId: claims.classId,
  };
}

/** True when the school is suspended or missing. Read errors propagate (callers fail closed). */
export async function isSchoolSuspended(schoolId: string): Promise<boolean> {
  const snap = await db().doc(schoolPaths.school(schoolId)).get();
  if (!snap.exists) return true;
  return SchoolDocSchema.parse(snap.data()).status === 'suspended';
}
