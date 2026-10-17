import { z } from 'zod';
import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from 'node:crypto';
import { db, newId, type SchoolAdminActor, type StudentActor } from '@just-imagine/server-core';
import {
  SchoolDocSchema,
  StudentDocSchema,
  schoolPaths,
  type LessonDoc,
} from '@just-imagine/protocol';
import { ApiFault } from '../errors';
export { db, newId };
export const fail = (status: number, message: string): never => {
  throw new ApiFault(
    status,
    status >= 500
      ? 'INTERNAL'
      : status === 401
        ? 'UNAUTHENTICATED'
        : status === 404
          ? 'NOT_FOUND'
          : status === 409
            ? 'CONFLICT'
            : status === 429
              ? 'QUOTA_EXHAUSTED'
              : status === 403
                ? 'FORBIDDEN'
                : 'INVALID_ARGUMENT',
    message,
  );
};
export async function read<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const snap = await db().doc(path).get();
  if (!snap.exists) return fail(404, 'This item is no longer available.');
  return schema.parse(snap.data());
}
export async function schoolId(actor: SchoolAdminActor): Promise<string> {
  if (!actor.schoolId) return fail(400, 'Choose a school first.');
  await read(schoolPaths.school(actor.schoolId), SchoolDocSchema);
  return actor.schoolId;
}
export async function student(actor: StudentActor) {
  const value = await read(schoolPaths.student(actor.schoolId, actor.studentId), StudentDocSchema);
  if (value.classId !== actor.classId) return fail(403, 'Your class changed. Sign in again.');
  return value;
}
export function visible(lesson: LessonDoc, actor: StudentActor): boolean {
  return (
    lesson.status === 'published' &&
    (lesson.scope === 'global' ||
      (lesson.schoolId === actor.schoolId &&
        (lesson.scope === 'school' || lesson.classIds.includes(actor.classId))))
  );
}
export const hash = (text: string) => createHash('sha256').update(text).digest('hex');
export const freshPin = () => String(randomInt(0, 1000000)).padStart(6, '0');
const derive = (pin: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(pin, salt, 64, (error, key) => (error ? reject(error) : resolve(key))),
  );
export async function secret(pin: string) {
  const salt = randomBytes(16).toString('hex');
  return {
    salt,
    pinHash: (await derive(pin, salt)).toString('hex'),
    failedAttempts: 0,
    lockedUntil: null,
  };
}
export async function matches(pin: string, saved: { salt: string; pinHash: string }) {
  const actual = await derive(pin, saved.salt);
  const expected = Buffer.from(saved.pinHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export const digits = (value: string) =>
  value.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6));
export const reasonSchema = z.string().trim().min(3).max(1000);
export const dateKey = () =>
  new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10).replaceAll('-', '');
export async function audit(
  actor: { uid: string; email: string | null },
  action: string,
  target: { kind: string; id: string },
  before: unknown,
  after: unknown,
  reason: string,
) {
  await db().collection('adminAudit').add({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action,
    target,
    before,
    after,
    reason,
    at: Date.now(),
  });
}
