import { z } from 'zod';
import { adminAuth, type SchoolAdminActor } from '@just-imagine/server-core';
import {
  AvatarSchema,
  LanguageSchema,
  SchoolClassDocSchema,
  SchoolDocSchema,
  StudentDocSchema,
  StudentUsernameSchema,
  StudentStatusSchema,
  studentUid,
  schoolPaths,
  DocumentIdSchema,
} from '@just-imagine/protocol';
import { db, newId, read, schoolId, fail, freshPin, secret, hash } from './common';
export const StudentBodySchema = z.strictObject({
  firstName: z.string().trim().min(1).max(40),
  username: StudentUsernameSchema,
  classId: DocumentIdSchema,
  avatar: AvatarSchema.default('fox'),
  language: LanguageSchema.default('bn'),
});
export const ClassBodySchema = SchoolClassDocSchema.omit({ createdAt: true });
export function parseCsv(csv: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = '',
    quote = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]!;
    if (c === '"') {
      if (quote && csv[i + 1] === '"') {
        field += '"';
        i++;
      } else quote = !quote;
    } else if (!quote && c === ',') {
      row.push(field.trim());
      field = '';
    } else if (!quote && c === '\n') {
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = '';
    } else if (c !== '\r') field += c;
  }
  if (quote) return fail(400, 'A CSV quoted field is unfinished.');
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  const header = rows.shift()?.map((s) => s.replace(/^\uFEFF/, '')) ?? [];
  if (!['firstName', 'username', 'classId'].every((k) => header.includes(k)))
    return fail(400, 'CSV needs firstName, username and classId columns.');
  return rows.map((values) => Object.fromEntries(header.map((key, i) => [key, values[i] ?? ''])));
}
/** PIN lockouts are kept per username; the teacher roster shows them without exposing secrets. */
const loginUserRef = (sid: string, username: string) =>
  db().doc('schoolLoginUsers/' + hash(sid + ':' + username));
export async function listStudents(actor: SchoolAdminActor, classId?: string) {
  const sid = await schoolId(actor);
  let query: FirebaseFirestore.Query = db().collection(schoolPaths.students(sid));
  if (classId) query = query.where('classId', '==', classId);
  const snap = await query.limit(5000).get();
  const students = snap.docs.map((d) => ({ id: d.id, ...StudentDocSchema.parse(d.data()) }));
  const limits = students.length
    ? await db().getAll(...students.map((st) => loginUserRef(sid, st.username)))
    : [];
  const now = Date.now();
  return {
    students: students
      .map((student, index) => {
        const limit = limits[index]?.data();
        const locked = Number(limit?.['lockedUntil'] ?? 0) > now;
        return {
          ...student,
          signIn: { failures: locked ? 0 : Number(limit?.['failures'] ?? 0), locked },
        };
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName)),
  };
}
export async function createStudents(actor: SchoolAdminActor, inputs: unknown[]) {
  const sid = await schoolId(actor),
    bodies = inputs.map((input) => StudentBodySchema.parse(input));
  if (!bodies.length || bodies.length > 100)
    return fail(400, 'Import between 1 and 100 students at a time.');
  if (new Set(bodies.map((b) => b.username)).size !== bodies.length)
    return fail(409, 'Each username must be unique.');
  const prepared = await Promise.all(
    bodies.map(async (body) => {
      const id = newId('c'),
        pin = freshPin();
      return { id, pin, body, secret: await secret(pin) };
    }),
  );
  return db().runTransaction(async (tx) => {
    const schoolRef = db().doc(schoolPaths.school(sid)),
      schoolSnap = await tx.get(schoolRef),
      existing = await tx.get(db().collection(schoolPaths.students(sid)));
    const school = SchoolDocSchema.parse(schoolSnap.data());
    if (school.status !== 'active') return fail(403, 'This school is paused.');
    if (existing.size + bodies.length > school.seats)
      return fail(409, 'This school has no seats left for this import.');
    const names = new Set(existing.docs.map((d) => d.get('username') as string));
    const classIds = [...new Set(bodies.map((b) => b.classId))];
    const classes = await Promise.all(
      classIds.map((cid) => tx.get(db().doc(schoolPaths.schoolClass(sid, cid)))),
    );
    if (classes.some((c) => !c.exists)) return fail(400, 'Choose a class in this school.');
    for (const { body } of prepared)
      if (names.has(body.username))
        return fail(409, 'Username ' + body.username + ' is already used.');
    const students = prepared.map((p) => {
      const student = StudentDocSchema.parse({
        ...p.body,
        pointsAll: 0,
        pointsWeek: null,
        createdAt: Date.now(),
      });
      tx.create(db().doc(schoolPaths.student(sid, p.id)), student);
      tx.set(db().doc('schoolPrincipals/' + studentUid(sid, p.id)), {
        role: 'student',
        schoolId: sid,
        studentId: p.id,
        createdAt: Date.now(),
      });
      tx.create(db().doc(schoolPaths.studentSecret(sid, p.id)), p.secret);
      return { student: { id: p.id, ...student }, pin: p.pin };
    });
    tx.set(schoolRef, school);
    return { students, imported: students.length };
  });
}
async function revoke(uid: string) {
  try {
    await adminAuth().revokeRefreshTokens(uid);
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/user-not-found') throw e;
  }
}
export async function updateStudent(actor: SchoolAdminActor, id: string, input: unknown) {
  const sid = await schoolId(actor),
    body = StudentBodySchema.partial().parse(input),
    ref = db().doc(schoolPaths.student(sid, id)),
    before = await read(ref.path, StudentDocSchema);
  if (body.classId && body.classId !== before.classId) await revoke(studentUid(sid, id));
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref),
      all = await tx.get(db().collection(schoolPaths.students(sid)));
    if (!snap.exists) return fail(404, 'Student not found.');
    const next = StudentDocSchema.parse({ ...snap.data(), ...body });
    const activeSchool = await tx.get(db().doc(schoolPaths.school(sid)));
    if (SchoolDocSchema.parse(activeSchool.data()).status !== 'active')
      return fail(403, 'This school is paused.');
    if (next.classId !== before.classId) next.authVersion++;
    if (!(await tx.get(db().doc(schoolPaths.schoolClass(sid, next.classId)))).exists)
      return fail(400, 'Choose a class in this school.');
    if (all.docs.some((d) => d.id !== id && d.get('username') === next.username))
      return fail(409, 'That username is already used.');
    const boards =
      next.classId !== before.classId
        ? await tx.get(
            db().collection(schoolPaths.boards(sid)).where('classId', '==', before.classId),
          )
        : null;
    tx.set(ref, next);
    for (const board of boards?.docs ?? [])
      tx.update(board.ref, {
        entries: (board.get('entries') as { studentId: string }[]).filter(
          (e) => e.studentId !== id,
        ),
      });
    return { student: { id, ...next } };
  });
}
export async function resetPin(actor: SchoolAdminActor, id: string) {
  const sid = await schoolId(actor),
    pin = freshPin(),
    saved = await secret(pin);
  await db().runTransaction(async (tx) => {
    const ref = db().doc(schoolPaths.student(sid, id)),
      profileSnap = await tx.get(ref),
      school = await tx.get(db().doc(schoolPaths.school(sid)));
    if (SchoolDocSchema.parse(school.data()).status !== 'active')
      return fail(403, 'This school is paused.');
    const profile = StudentDocSchema.parse(profileSnap.data());
    tx.update(ref, { authVersion: profile.authVersion + 1 });
    tx.set(db().doc(schoolPaths.studentSecret(sid, id)), saved);
    tx.delete(db().doc('schoolLoginUsers/' + hash(sid + ':' + profile.username)));
  });
  await revoke(studentUid(sid, id));
  return { studentId: id, pin };
}
/** Suspension keeps the record and history, ends live sessions and blocks sign-in. */
export async function setStudentStatus(actor: SchoolAdminActor, id: string, input: unknown) {
  const sid = await schoolId(actor),
    { status } = z.strictObject({ status: StudentStatusSchema }).parse(input),
    ref = db().doc(schoolPaths.student(sid, id));
  const result = await db().runTransaction(async (tx) => {
    const [snap, school] = await Promise.all([
      tx.get(ref),
      tx.get(db().doc(schoolPaths.school(sid))),
    ]);
    if (SchoolDocSchema.parse(school.data()).status !== 'active')
      return fail(403, 'This school is paused.');
    if (!snap.exists) return fail(404, 'Student not found.');
    const before = StudentDocSchema.parse(snap.data());
    const next = StudentDocSchema.parse({
      ...before,
      status,
      authVersion:
        status === 'suspended' && before.status !== 'suspended'
          ? before.authVersion + 1
          : before.authVersion,
    });
    tx.set(ref, next);
    return { student: { id, ...next } };
  });
  if (status === 'suspended') await revoke(studentUid(sid, id));
  return result;
}
/** Clears a PIN lockout (or the count of recent wrong PINs) without changing the PIN. */
export async function unlockStudent(actor: SchoolAdminActor, id: string) {
  const sid = await schoolId(actor),
    profile = await read(schoolPaths.student(sid, id), StudentDocSchema);
  await loginUserRef(sid, profile.username).delete();
  return { studentId: id, signIn: { failures: 0, locked: false } };
}
export async function deleteStudent(actor: SchoolAdminActor, id: string) {
  const sid = await schoolId(actor);
  await db().runTransaction(async (tx) => {
    const [school, boards] = await Promise.all([
      tx.get(db().doc(schoolPaths.school(sid))),
      tx.get(db().collection(schoolPaths.boards(sid))),
    ]);
    if (SchoolDocSchema.parse(school.data()).status !== 'active')
      return fail(403, 'This school is paused.');
    tx.delete(db().doc(schoolPaths.student(sid, id)));
    tx.delete(db().doc(schoolPaths.studentSecret(sid, id)));
    for (const board of boards.docs)
      tx.update(board.ref, {
        entries: (board.get('entries') as { studentId: string }[]).filter(
          (e) => e.studentId !== id,
        ),
      });
  });
  try {
    await adminAuth().deleteUser(studentUid(sid, id));
  } catch (e) {
    if ((e as { code?: string }).code !== 'auth/user-not-found') throw e;
  }
  const attempts = await db()
      .collection(schoolPaths.attempts(sid))
      .where('studentId', '==', id)
      .get(),
    writer = db().bulkWriter();
  for (const attempt of attempts.docs) writer.delete(attempt.ref);
  await writer.close();
  return { ok: true };
}
