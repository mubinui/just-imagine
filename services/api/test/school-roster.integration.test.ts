import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { adminAuth, db, requireParent, requireStudent } from '@just-imagine/server-core';
import { schoolPaths } from '@just-imagine/protocol';
import { createApi } from '../src/app';
import type { ApiStore } from '../src/store';
import { DEMO_LESSONS } from '../src/school/demo-lessons';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
async function exchange(custom: string) {
  const response = await fetch(
    'http://' +
      process.env['FIREBASE_AUTH_EMULATOR_HOST'] +
      '/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  const data = (await response.json()) as { idToken: string };
  if (!data.idToken) throw new Error('Cannot sign in emulator fixture.');
  return data.idToken;
}
const token = async (uid: string, claims: Record<string, unknown> = {}) =>
  exchange(await adminAuth().createCustomToken(uid, claims));
const app = createApi({
  store: new Proxy({}, { get: () => async () => ({}) }) as ApiStore,
  verifyToken: requireParent,
  origins: [],
});
const call = (
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  bearer?: string,
  payload?: unknown,
) =>
  app.inject({
    method,
    url,
    headers: bearer ? { authorization: 'Bearer ' + bearer } : {},
    ...(payload ? { payload } : {}),
  });
let inviteCheck: Awaited<ReturnType<typeof call>>, usedInviteToken: string;
let teacher: string, sid: string, code: string, cid: string, studentId: string, pin: string;
const login = (pinValue = pin, username = 'mina') =>
  call('POST', '/v1/study/login', undefined, { schoolCode: code, username, pin: pinValue });
beforeAll(async () => {
  const operator = await token('roster_ops', { admin: true });
  await adminAuth().createUser({
    uid: 'roster_teacher',
    email: 'teacher-roster@example.test',
    emailVerified: true,
  });
  teacher = await token('roster_teacher');
  const created = await call('POST', '/v1/admin/schools', operator, {
    name: 'Roster School',
    nameBn: 'রোস্টার বিদ্যালয়',
    seats: 10,
    voiceSecondsPerDay: 600,
    reason: 'Roster acceptance',
  });
  expect(created.statusCode).toBe(201);
  sid = created.json().school.id;
  code = created.json().school.code;
  const invite = await call('POST', '/v1/admin/schools/' + sid + '/invites', operator, {
    email: 'teacher-roster@example.test',
    reason: 'Invite roster teacher',
  });
  const raw = new URL(invite.json().inviteUrl).searchParams.get('invite');
  inviteCheck = await call('POST', '/v1/school/invites/check', undefined, { token: raw });
  usedInviteToken = raw!;
  expect(
    (await call('POST', '/v1/school/invites/accept', teacher, { token: raw })).statusCode,
  ).toBe(200);
  teacher = await token('roster_teacher', { role: 'schoolAdmin', schoolId: sid });
  cid = (
    await call('POST', '/v1/school/classes', teacher, { grade: 9, section: 'A', name: '9-A' })
  ).json().class.id;
  const student = await call('POST', '/v1/school/students', teacher, {
    firstName: 'Mina',
    username: 'mina',
    classId: cid,
  });
  expect(student.statusCode).toBe(200);
  studentId = student.json().student.id;
  pin = student.json().pin;
});
afterAll(() => app.close());

describe('suspending and restoring a student', () => {
  it('blocks sign-in and live sessions while suspended, then restores access', async () => {
    const ok = await login();
    expect(ok.statusCode).toBe(200);
    const pupil = await exchange(ok.json().customToken);
    const suspended = await call('PATCH', '/v1/school/students/' + studentId + '/status', teacher, {
      status: 'suspended',
    });
    expect(suspended.statusCode).toBe(200);
    expect(suspended.json().student.status).toBe('suspended');
    await expect(requireStudent(pupil)).rejects.toThrow();
    const blocked = await login();
    expect(blocked.statusCode).toBe(403);
    expect(blocked.json().error.message).toMatch(/account is paused/i);
    const listed = await call('GET', '/v1/school/students', teacher);
    expect(listed.json().students[0].status).toBe('suspended');
    const restored = await call('PATCH', '/v1/school/students/' + studentId + '/status', teacher, {
      status: 'active',
    });
    expect(restored.json().student.status).toBe('active');
    expect((await login()).statusCode).toBe(200);
  });

  it('does not reveal suspension to someone without the right PIN', async () => {
    await call('PATCH', '/v1/school/students/' + studentId + '/status', teacher, {
      status: 'suspended',
    });
    const wrong = await login(pin === '111111' ? '222222' : '111111');
    expect(wrong.statusCode).toBe(403);
    expect(wrong.json().error.message).not.toMatch(/paused/i);
    await call('PATCH', '/v1/school/students/' + studentId + '/status', teacher, {
      status: 'active',
    });
    await call('POST', '/v1/school/students/' + studentId + '/unlock', teacher, {});
  });

  it('rejects an unknown status', async () => {
    expect(
      (
        await call('PATCH', '/v1/school/students/' + studentId + '/status', teacher, {
          status: 'removed',
        })
      ).statusCode,
    ).toBe(400);
  });
});

describe('teacher unlock after repeated wrong PINs', () => {
  it('shows the lock on the roster and clears it without changing the PIN', async () => {
    const wrong = pin === '000000' ? '999999' : '000000';
    for (let i = 0; i < 5; i++) expect((await login(wrong)).statusCode).toBe(403);
    expect((await login()).statusCode).toBe(429);
    const row = (await call('GET', '/v1/school/students', teacher)).json().students[0];
    expect(row.signIn.locked).toBe(true);
    const unlocked = await call(
      'POST',
      '/v1/school/students/' + studentId + '/unlock',
      teacher,
      {},
    );
    expect(unlocked.statusCode).toBe(200);
    expect((await call('GET', '/v1/school/students', teacher)).json().students[0].signIn).toEqual({
      failures: 0,
      locked: false,
    });
    expect((await login()).statusCode).toBe(200);
  });

  it('counts failures below the lock threshold', async () => {
    const wrong = pin === '000000' ? '999999' : '000000';
    await login(wrong);
    await login(wrong);
    const row = (await call('GET', '/v1/school/students', teacher)).json().students[0];
    expect(row.signIn).toEqual({ failures: 2, locked: false });
    await call('POST', '/v1/school/students/' + studentId + '/unlock', teacher, {});
  });
});

describe('copying a shared lesson', () => {
  it('copies a shared lesson once and keeps where it came from across saves', async () => {
    const seed = DEMO_LESSONS[1]!;
    const globalId = 'w_roster_shared';
    await db()
      .doc(schoolPaths.lesson(globalId))
      .set({
        ...seed.lesson,
        scope: 'global',
        schoolId: null,
        classIds: [],
        status: 'published',
        approved: { en: true, bn: true },
        authorUid: 'ops',
        revision: 0,
        updatedAt: Date.now(),
      });
    await db()
      .doc(schoolPaths.lessonKeys(globalId))
      .set({ ...seed.keys, revision: 0 });
    const first = await call('POST', '/v1/school/lessons/' + globalId + '/copy', teacher, {});
    expect(first.statusCode).toBe(200);
    expect(first.json().lesson.copiedFrom).toBe(globalId);
    const second = await call('POST', '/v1/school/lessons/' + globalId + '/copy', teacher, {});
    expect(second.statusCode).toBe(409);
    expect(second.json().error.message).toMatch(/already/i);
    const copy = first.json().lesson;
    const saved = await call('PATCH', '/v1/school/lessons/' + copy.id, teacher, {
      lesson: {
        ...copy,
        id: undefined,
        copiedFrom: undefined,
        title: { en: 'Edited copy', bn: 'সম্পাদিত কপি' },
      },
      keys: first.json().keys,
      expectedRevision: copy.revision,
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json().lesson.copiedFrom).toBe(globalId);
  });
});

describe('recent class activity for the overview', () => {
  it('lists the latest real attempts with student and lesson names, newest first', async () => {
    const empty = await call('GET', '/v1/school/activity', teacher);
    expect(empty.statusCode).toBe(200);
    expect(empty.json().activity).toEqual([]);
    const seed = DEMO_LESSONS[1]!;
    const lessonId = 'w_roster_activity';
    await db()
      .doc(schoolPaths.lesson(lessonId))
      .set({
        ...seed.lesson,
        scope: 'school',
        schoolId: sid,
        classIds: [],
        status: 'published',
        approved: { en: true, bn: true },
        authorUid: 'roster_teacher',
        revision: 0,
        updatedAt: Date.now(),
      });
    const quizIds = seed.lesson.steps.flatMap((s) =>
      s.kind === 'quiz' ? s.items.map((i) => i.id) : [],
    );
    await db()
      .doc(schoolPaths.attempt(sid, studentId, lessonId))
      .set({
        studentId,
        lessonId,
        revision: 0,
        items: Object.fromEntries(
          quizIds.map((id, i) => [id, { correct: i === 0, tries: 1, firstCorrectAt: null }]),
        ),
        pointsAwarded: 2,
        completedAt: null,
        updatedAt: Date.now(),
      });
    const activity = (await call('GET', '/v1/school/activity', teacher)).json().activity;
    expect(activity).toHaveLength(1);
    expect(activity[0]).toMatchObject({
      studentId,
      firstName: 'Mina',
      lessonId,
      lessonTitle: seed.lesson.title,
      status: 'submitted',
      score: { correct: 1, total: quizIds.length },
    });
    expect(JSON.stringify(activity)).not.toContain('answer');
  });
});

describe('checking an invitation before creating an account', () => {
  it('confirms a valid invitation and the email it was sent to', () => {
    expect(inviteCheck.statusCode).toBe(200);
    expect(inviteCheck.json()).toEqual({ email: 'teacher-roster@example.test', schoolId: sid });
  });

  it('refuses a used, forged or malformed invitation without needing a sign-in', async () => {
    const used = await call('POST', '/v1/school/invites/check', undefined, {
      token: usedInviteToken,
    });
    expect(used.statusCode).toBe(403);
    expect(used.json().error.message).toMatch(/expired or was already used/);
    const forged = usedInviteToken.replace(/\.[^.]+$/, '.forged');
    expect(
      (await call('POST', '/v1/school/invites/check', undefined, { token: forged })).statusCode,
    ).toBe(403);
    const malformed = await call('POST', '/v1/school/invites/check', undefined, { token: 'abc' });
    expect(malformed.statusCode).toBe(400);
  });
});
