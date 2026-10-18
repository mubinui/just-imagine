import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { adminAuth, transaction } from '@just-imagine/server-core';
import {
  SchoolCodeSchema,
  StudentUsernameSchema,
  StudentPinSchema,
  SchoolDocSchema,
  StudentDocSchema,
  StudentSecretDocSchema,
  SchoolInviteDocSchema,
  schoolPaths,
  DocumentIdSchema,
  studentUid,
} from '@just-imagine/protocol';
import { db, read, fail, digits, hash, matches, secret, newId } from './common';
export const LoginBodySchema = z.strictObject({
  schoolCode: SchoolCodeSchema,
  username: StudentUsernameSchema,
  pin: z.string().transform(digits).pipe(StudentPinSchema),
});
const dummy = secret('000000');
export async function login(input: unknown) {
  const body = LoginBodySchema.parse(input),
    code = await db().doc(schoolPaths.schoolCode(body.schoolCode)).get();
  if (!code.exists) {
    return fail(403, 'Check your school code, username and PIN.');
  }
  const sid = DocumentIdSchema.parse(code.get('schoolId'));
  const school = await read(schoolPaths.school(sid), SchoolDocSchema);
  if (school.status !== 'active')
    return fail(403, 'Your school is paused. Please ask your teacher.');
  const students = await db()
    .collection(schoolPaths.students(sid))
    .where('username', '==', body.username)
    .limit(1)
    .get();
  const found = students.docs[0];
  const profile = found ? StudentDocSchema.parse(found.data()) : undefined;
  const loginKey = hash(sid + ':' + body.username),
    limitRef = db().doc('schoolLoginLimits/' + sid),
    userRef = db().doc('schoolLoginUsers/' + loginKey);
  // Check the shared lock before using a crypto worker; reserve a bounded request budget too.
  await transaction(async (tx) => {
    const [s, u] = await Promise.all([tx.get(limitRef), tx.get(userRef)]);
    const now = Date.now(),
      data = s.data();
    const current = Number(data?.['windowAt']) > now - 60000;
    if (
      (current && Number(data?.['failures'] ?? 0) >= 60) ||
      Number(u.get('lockedUntil') ?? 0) > now ||
      (current && Number(data?.['requests'] ?? 0) >= 120)
    )
      return fail(429, 'Too many PIN attempts. Please wait 15 minutes or ask your teacher.');
    tx.set(limitRef, {
      windowAt: current ? data!['windowAt'] : now,
      failures: current ? Number(data?.['failures'] ?? 0) : 0,
      requests: (current ? Number(data?.['requests'] ?? 0) : 0) + 1,
    });
  });
  const valid = found
    ? await matches(
        body.pin,
        StudentSecretDocSchema.parse(
          (await db().doc(schoolPaths.studentSecret(sid, found.id)).get()).data(),
        ),
      )
    : (await matches(body.pin, await dummy)) && false;
  await transaction(async (tx) => {
    const [schoolLimit, userLimit] = await Promise.all([tx.get(limitRef), tx.get(userRef)]);
    const now = Date.now(),
      schoolData = schoolLimit.data(),
      userData = userLimit.data();
    const failures =
      Number(schoolData?.['windowAt']) > now - 60000 ? Number(schoolData?.['failures'] ?? 0) : 0;
    if (failures >= 60 || Number(userData?.['lockedUntil'] ?? 0) > now)
      return fail(429, 'Too many PIN attempts. Please wait 15 minutes or ask your teacher.');
    if (valid) tx.set(userRef, { failures: 0, lockedUntil: 0 });
    else {
      const n = Number(userData?.['failures'] ?? 0) + 1;
      tx.set(userRef, { failures: n >= 5 ? 0 : n, lockedUntil: n >= 5 ? now + 900000 : 0 });
      tx.set(limitRef, {
        windowAt: failures ? schoolData?.['windowAt'] : now,
        failures: failures + 1,
        requests: Number(schoolData?.['requests'] ?? 0),
      });
    }
  });
  if (!valid || !found || !profile) return fail(403, 'Check your school code, username and PIN.');
  if (profile.status === 'suspended')
    return fail(403, 'Your account is paused. Please ask your teacher.');
  if (!(await db().doc(schoolPaths.schoolClass(sid, profile.classId)).get()).exists)
    return fail(403, 'Your class is not available. Ask your teacher.');
  const uid = studentUid(sid, found.id);
  if (uid.length > 128) return fail(400, 'This student identity needs an operator repair.');
  const customToken = await adminAuth().createCustomToken(uid, {
    role: 'student',
    authVersion: profile.authVersion,
    schoolId: sid,
    studentId: found.id,
    classId: profile.classId,
  });
  return { customToken };
}
/**
 * Anonymous pre-check so the join page never creates an account for a dead link. Only the token
 * holder learns the invited email; acceptance still re-checks everything after sign-in.
 */
export async function checkInvite(token: string) {
  const parts = token.split('.'),
    [sid, inviteId, entropy] = parts;
  DocumentIdSchema.parse(sid);
  DocumentIdSchema.parse(inviteId);
  if (!sid || !inviteId || !entropy || parts.length !== 3)
    return fail(400, 'This invite link is incomplete.');
  const snap = await db().doc(schoolPaths.invite(sid, inviteId)).get();
  if (!snap.exists) return fail(403, 'This invite has expired or was already used.');
  const invite = SchoolInviteDocSchema.parse(snap.data());
  const actual = Buffer.from(hash(token), 'hex'),
    expected = Buffer.from(invite.tokenHash, 'hex');
  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected) ||
    invite.expiresAt < Date.now()
  )
    return fail(403, 'This invite has expired or was already used.');
  return { email: invite.email, schoolId: sid };
}
export async function acceptInvite(token: string, idToken: string) {
  const decoded = await adminAuth()
      .verifyIdToken(idToken, true)
      .catch(() => fail(401, 'Sign in again to accept this invitation.')),
    [sid, inviteId, entropy] = token.split('.');
  DocumentIdSchema.parse(sid);
  DocumentIdSchema.parse(inviteId);
  if (!sid || !inviteId || !entropy || token.split('.').length !== 3)
    return fail(400, 'This invite link is incomplete.');
  if (decoded['admin'] === true)
    return fail(403, 'Use a teacher account separate from your operator account.');
  if (decoded['role'] && !(decoded['role'] === 'schoolAdmin' && decoded['schoolId'] === sid))
    return fail(403, 'Use a separate teacher account for this invitation.');
  if (
    (
      await db()
        .doc('users/' + decoded.uid)
        .get()
    ).exists
  )
    return fail(403, 'Use a teacher account separate from your family account.');
  const ref = db().doc(schoolPaths.invite(sid, inviteId)),
    member = db().doc(schoolPaths.member(sid, decoded.uid));
  const prior = await member.get();
  if (prior.exists) {
    await adminAuth().setCustomUserClaims(decoded.uid, { role: 'schoolAdmin', schoolId: sid });
    return { schoolId: sid };
  }
  await transaction(async (tx) => {
    const [snap, members, school, family] = await Promise.all([
      tx.get(ref),
      tx.get(db().collection(schoolPaths.members(sid))),
      tx.get(db().doc(schoolPaths.school(sid))),
      tx.get(db().doc('users/' + decoded.uid)),
    ]);
    if (family?.exists)
      return fail(403, 'Use a teacher account separate from your family account.');
    if (!snap.exists) return fail(403, 'This invite has expired or was already used.');
    const invite = SchoolInviteDocSchema.parse(snap.data());
    const actual = Buffer.from(hash(token), 'hex'),
      expected = Buffer.from(invite.tokenHash, 'hex');
    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected) ||
      invite.expiresAt < Date.now()
    )
      return fail(403, 'This invite has expired or was already used.');
    if (decoded.email?.toLowerCase() !== invite.email.toLowerCase())
      return fail(403, 'Sign in with the email address on this invitation.');
    if (!school.exists || SchoolDocSchema.parse(school.data()).status !== 'active')
      return fail(403, 'This school is paused.');
    if (members.size) return fail(409, 'This school already has an administrator.');
    tx.set(db().doc('schoolPrincipals/' + decoded.uid), {
      role: 'schoolAdmin',
      schoolId: sid,
      createdAt: Date.now(),
    });
    tx.create(member, {
      role: 'schoolAdmin',
      email: invite.email,
      displayName: decoded.name ?? null,
      joinedAt: Date.now(),
    });
    tx.delete(ref);
    tx.create(db().doc('adminAudit/' + newId('j')), {
      actorUid: decoded.uid,
      actorEmail: decoded.email ?? null,
      action: 'school.update',
      target: { kind: 'school', id: sid },
      before: null,
      after: { memberUid: decoded.uid },
      reason: 'Teacher accepted invitation',
      at: Date.now(),
    });
  });
  await adminAuth().setCustomUserClaims(decoded.uid, { role: 'schoolAdmin', schoolId: sid });
  return { schoolId: sid };
}
