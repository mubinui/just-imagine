import { it, expect, beforeAll } from 'vitest';
import { adminAuth, db } from '@just-imagine/server-core';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';

async function idToken(uid: string, claims: Record<string, unknown>) {
  const custom = await adminAuth().createCustomToken(uid, claims);
  const res = await fetch(
    `http://${process.env['FIREBASE_AUTH_EMULATOR_HOST']}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  return ((await res.json()) as { idToken: string }).idToken;
}

const base = () =>
  `http://${process.env['FIRESTORE_EMULATOR_HOST']}/v1/projects/demo-just-imagine/databases/(default)/documents/`;
async function status(path: string, token: string | null) {
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
  return (await fetch(base() + path, { headers })).status;
}

const tokens: Record<string, string> = {};
beforeAll(async () => {
  if (!process.env['FIRESTORE_EMULATOR_HOST']) throw new Error('Emulators required');
  const school = {
    name: 'Rules School',
    nameBn: 'রুলস স্কুল',
    code: 'RU2S3S',
    status: 'active',
    seats: 10,
    voiceSecondsPerDay: 0,
    createdAt: 1,
  };
  await db().doc('schools/rs1').set(school);
  await db()
    .doc('schools/rs2')
    .set({ ...school, code: 'RU2S3T' });
  await db()
    .doc('schools/rs1/members/rt1')
    .set({ role: 'schoolAdmin', email: 't@example.test', displayName: null, joinedAt: 1 });
  await db()
    .doc('schools/rs1/classes/c1')
    .set({ grade: 9, section: 'A', name: '9-A', createdAt: 1 });
  await db()
    .doc('schools/rs1/classes/c2')
    .set({ grade: 9, section: 'B', name: '9-B', createdAt: 1 });
  await db()
    .doc('schools/rs1/students/p1')
    .set({
      firstName: 'Rahim',
      username: 'rahim',
      classId: 'c1',
      avatar: 'fox',
      language: 'bn',
      createdAt: 1,
    });
  await db()
    .doc('schools/rs1/students/p2')
    .set({
      firstName: 'Karim',
      username: 'karim',
      classId: 'c2',
      avatar: 'owl',
      language: 'en',
      createdAt: 1,
    });
  await db()
    .doc('schools/rs1/studentSecrets/p1')
    .set({ pinHash: 'aa', salt: 'bb', failedAttempts: 0, lockedUntil: null });
  await db()
    .doc('schools/rs1/invites/i1')
    .set({
      email: 't@example.test',
      tokenHash: 'a'.repeat(64),
      expiresAt: 9,
      createdBy: 'ops',
      createdAt: 1,
    });
  await db().doc('schools/rs1/attempts/p1_l1').set({ studentId: 'p1', lessonId: 'l1' });
  await db().doc('schools/rs1/attempts/p2_l1').set({ studentId: 'p2', lessonId: 'l1' });
  await db()
    .doc('schools/rs1/boards/class_c1_all')
    .set({
      scope: 'class',
      classId: 'c1',
      period: 'all',
      weekKey: null,
      entries: [],
      updatedAt: 1,
    });
  await db()
    .doc('schools/rs1/boards/class_c2_all')
    .set({
      scope: 'class',
      classId: 'c2',
      period: 'all',
      weekKey: null,
      entries: [],
      updatedAt: 1,
    });
  await db()
    .doc('schools/rs1/boards/school_all')
    .set({
      scope: 'school',
      classId: null,
      period: 'all',
      weekKey: null,
      entries: [],
      updatedAt: 1,
    });
  const lesson = (scope: string, schoolId: string | null, classIds: string[], status: string) => ({
    scope,
    schoolId,
    classIds,
    status,
  });
  await db()
    .doc('lessons/lg_pub')
    .set(lesson('global', null, [], 'published'));
  await db()
    .doc('lessons/lg_draft')
    .set(lesson('global', null, [], 'draft'));
  await db()
    .doc('lessons/ls_pub')
    .set(lesson('school', 'rs1', [], 'published'));
  await db()
    .doc('lessons/ls_draft')
    .set(lesson('school', 'rs1', [], 'draft'));
  await db()
    .doc('lessons/lc1_pub')
    .set(lesson('class', 'rs1', ['c1'], 'published'));
  await db()
    .doc('lessons/lother_pub')
    .set(lesson('school', 'rs2', [], 'published'));
  await db().doc('lessonKeys/lg_pub').set({ revision: 0, items: {} });
  await db().doc('schoolCodes/RU2S3S').set({ schoolId: 'rs1' });
  tokens['teacher'] = await idToken('rt1', { role: 'schoolAdmin', schoolId: 'rs1' });
  tokens['student'] = await idToken('st_rs1_p1', {
    role: 'student',
    schoolId: 'rs1',
    studentId: 'p1',
    classId: 'c1',
  });
  tokens['otherSchoolStudent'] = await idToken('st_rs2_q1', {
    role: 'student',
    schoolId: 'rs2',
    studentId: 'q1',
    classId: 'k1',
  });
  tokens['admin'] = await idToken('rops', { admin: true });
  tokens['parent'] = await idToken('rparent', {});
});

it('lets a teacher read their own school tree but not secrets or invites', async () => {
  const t = tokens['teacher']!;
  expect(await status('schools/rs1', t)).toBe(200);
  expect(await status('schools/rs1/members/rt1', t)).toBe(200);
  expect(await status('schools/rs1/classes/c2', t)).toBe(200);
  expect(await status('schools/rs1/students/p2', t)).toBe(200);
  expect(await status('schools/rs1/attempts/p2_l1', t)).toBe(200);
  expect(await status('schools/rs1/boards/class_c2_all', t)).toBe(200);
  expect(await status('schools/rs1/studentSecrets/p1', t)).toBe(403);
  expect(await status('schools/rs1/invites/i1', t)).toBe(403);
  expect(await status('schools/rs2', t)).toBe(403);
});

it('confines a student to their own record, class and boards', async () => {
  const s = tokens['student']!;
  expect(await status('schools/rs1', s)).toBe(200);
  expect(await status('schools/rs1/students/p1', s)).toBe(200);
  expect(await status('schools/rs1/students/p2', s)).toBe(403);
  expect(await status('schools/rs1/classes/c1', s)).toBe(200);
  expect(await status('schools/rs1/classes/c2', s)).toBe(403);
  expect(await status('schools/rs1/attempts/p1_l1', s)).toBe(200);
  expect(await status('schools/rs1/attempts/p2_l1', s)).toBe(403);
  expect(await status('schools/rs1/boards/class_c1_all', s)).toBe(200);
  expect(await status('schools/rs1/boards/class_c2_all', s)).toBe(403);
  expect(await status('schools/rs1/boards/school_all', s)).toBe(200);
  expect(await status('schools/rs1/members/rt1', s)).toBe(403);
  expect(await status('schools/rs1/studentSecrets/p1', s)).toBe(403);
  expect(await status('schools/rs2', s)).toBe(403);
});

it('shows lessons only within scope and only published ones to students', async () => {
  const s = tokens['student']!;
  expect(await status('lessons/lg_pub', s)).toBe(200);
  expect(await status('lessons/lg_draft', s)).toBe(403);
  expect(await status('lessons/ls_pub', s)).toBe(200);
  expect(await status('lessons/ls_draft', s)).toBe(403);
  expect(await status('lessons/lc1_pub', s)).toBe(200);
  expect(await status('lessons/lother_pub', s)).toBe(403);
  const o = tokens['otherSchoolStudent']!;
  expect(await status('lessons/ls_pub', o)).toBe(403);
  expect(await status('lessons/lc1_pub', o)).toBe(403);
  const t = tokens['teacher']!;
  expect(await status('lessons/ls_draft', t)).toBe(200);
  expect(await status('lessons/lg_pub', t)).toBe(200);
  expect(await status('lessons/lg_draft', t)).toBe(403);
  expect(await status('lessons/lother_pub', t)).toBe(403);
});

it('keeps answer keys, school codes and every school path closed to everyone else', async () => {
  for (const who of ['teacher', 'student', 'admin', 'parent'])
    expect(await status('lessonKeys/lg_pub', tokens[who]!)).toBe(403);
  expect(await status('schoolCodes/RU2S3S', tokens['student']!)).toBe(403);
  expect(await status('schools/rs1', tokens['parent']!)).toBe(403);
  expect(await status('lessons/lg_pub', tokens['parent']!)).toBe(403);
  expect(await status('schools/rs1', null)).toBe(403);
});

it('denies every client write', async () => {
  const res = await fetch(base() + 'schools/rs1/students/p1', {
    method: 'PATCH',
    headers: { authorization: `Bearer ${tokens['teacher']}`, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { firstName: { stringValue: 'X' } } }),
  });
  expect(res.status).toBe(403);
});
