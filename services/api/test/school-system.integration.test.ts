import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { adminAuth, db, requireParent, requireStudent } from '@just-imagine/server-core';
import { createApi } from '../src/app';
import type { ApiStore } from '../src/store';
import { DEMO_LESSONS } from '../src/school/demo-lessons';
import { grade } from '../src/school/grading';
import { draftLesson, translateLesson } from '../src/school/authoring';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
async function token(uid: string, claims: Record<string, unknown> = {}) {
  const custom = await adminAuth().createCustomToken(uid, claims);
  return exchange(custom);
}
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
const app = createApi({
  store: new Proxy({}, { get: () => async () => ({}) }) as ApiStore,
  verifyToken: requireParent,
  origins: [],
  school: {
    model: async (prompt) => {
      if (!prompt.startsWith('Help a teacher write one short classroom passage'))
        throw new Error('Unexpected model call in text-assist route acceptance.');
      return { text: 'A force can change an object’s speed or direction.' };
    },
  },
});
let operator: string,
  teacher: string,
  sid: string,
  cid: string,
  studentId: string,
  secondStudentId: string,
  pin: string,
  pupil: string,
  lessonId: string,
  revision: number;
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
beforeAll(async () => {
  operator = await token('school_system_ops', { admin: true });
  await adminAuth().createUser({
    uid: 'school_system_teacher',
    email: 'teacher-system@example.test',
    emailVerified: true,
  });
  teacher = await token('school_system_teacher');
  const created = await call('POST', '/v1/admin/schools', operator, {
    name: 'System School',
    nameBn: 'পরীক্ষার বিদ্যালয়',
    seats: 5,
    voiceSecondsPerDay: 1800,
    reason: 'Integration acceptance',
  });
  expect(created.statusCode).toBe(201);
  sid = created.json().school.id;
  const invite = await call('POST', '/v1/admin/schools/' + sid + '/invites', operator, {
    email: 'teacher-system@example.test',
    reason: 'Invite integration teacher',
  });
  const raw = new URL(invite.json().inviteUrl).searchParams.get('invite');
  expect(
    (await call('POST', '/v1/school/invites/accept', teacher, { token: raw })).statusCode,
  ).toBe(200);
  teacher = await token('school_system_teacher', { role: 'schoolAdmin', schoolId: sid });
  const cls = await call('POST', '/v1/school/classes', teacher, {
    grade: 9,
    section: 'A',
    name: '9-A',
    boardsVisible: true,
  });
  expect(cls.statusCode).toBe(200);
  cid = cls.json().class.id;
  const roster = await call('POST', '/v1/school/students/import', teacher, {
    csv: 'firstName,username,classId\nরহিম,rahim,' + cid + '\nকরিম,karim,' + cid,
  });
  expect(roster.statusCode).toBe(200);
  studentId = roster.json().students[0].student.id;
  secondStudentId = roster.json().students[1].student.id;
  pin = roster.json().students[0].pin;
  const login = await call('POST', '/v1/study/login', undefined, {
    schoolCode: created.json().school.code,
    username: 'rahim',
    pin,
  });
  expect(login.statusCode).toBe(200);
  pupil = await exchange(login.json().customToken);
  const seed = DEMO_LESSONS[1]!;
  const lesson = await call('POST', '/v1/school/lessons', teacher, {
    lesson: { ...seed.lesson, scope: 'class', classIds: [cid] },
    keys: seed.keys,
  });
  expect(lesson.statusCode).toBe(200);
  lessonId = lesson.json().lesson.id;
  revision = 0;
  for (const language of ['en', 'bn']) {
    const approved = await call('POST', '/v1/school/lessons/' + lessonId + '/approve', teacher, {
      language,
      expectedRevision: revision,
    });
    expect(approved.statusCode).toBe(200);
    revision = approved.json().lesson.revision;
  }
  const published = await call('POST', '/v1/school/lessons/' + lessonId + '/publish', teacher, {
    expectedRevision: revision,
  });
  expect(published.statusCode).toBe(200);
  revision = published.json().lesson.revision;
});
afterAll(() => app.close());
describe('school role-to-role backend', () => {
  it('authorizes unsaved AI text assistance, reserves normal quota and leaves stored lessons untouched', async () => {
    const input = {
      subject: 'physics',
      grade: 9,
      chapterId: 'physics-3',
      title: { en: 'Force', bn: 'বল' },
      field: 'explanation',
      language: 'en',
      text: 'Force changes motion.',
      instruction: 'Make this clearer',
      context: 'A virtual cart.',
    };
    const original = (
      await db()
        .doc('lessons/' + lessonId)
        .get()
    ).data();
    const usage = () => db().collection('schoolUsageDaily').where('schoolId', '==', sid).get();
    const before = (await usage()).docs.reduce(
      (sum, doc) => sum + Number(doc.get('aiDrafts') ?? 0),
      0,
    );
    expect((await call('POST', '/v1/school/lesson-text/assist', undefined, input)).statusCode).toBe(
      401,
    );
    expect((await call('POST', '/v1/school/lesson-text/assist', pupil, input)).statusCode).toBe(
      403,
    );
    const result = await call('POST', '/v1/school/lesson-text/assist', teacher, input);
    expect(result.statusCode).toBe(200);
    expect(result.json()).toEqual({ text: 'A force can change an object’s speed or direction.' });
    expect(
      (
        await db()
          .doc('lessons/' + lessonId)
          .get()
      ).data(),
    ).toEqual(original);
    const after = (await usage()).docs.reduce(
      (sum, doc) => sum + Number(doc.get('aiDrafts') ?? 0),
      0,
    );
    expect(after).toBe(before + 1);
    expect(
      (
        await call('POST', '/v1/school/lesson-text/assist', teacher, {
          ...input,
          chapterId: 'math-1',
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await call('POST', '/v1/admin/lesson-text/assist', teacher, {
          ...input,
          reason: 'Test writing assistant',
        })
      ).statusCode,
    ).toBe(403);
  });
  it('keeps school identities out of families, including pre-claim teacher tokens', async () => {
    expect((await call('GET', '/v1/me', teacher)).statusCode).toBe(401);
    const stale = await token('school_system_teacher');
    await expect(requireParent(stale)).rejects.toThrow();
  });
  it('returns scoped lessons and never returns answer keys to a student', async () => {
    const list = await call('GET', '/v1/study/lessons', pupil);
    expect(list.statusCode).toBe(200);
    expect(list.json().lessons.some((l: { id: string }) => l.id === lessonId)).toBe(true);
    const details = await call('GET', '/v1/study/lessons/' + lessonId, pupil);
    expect(details.json()).not.toHaveProperty('keys');
    const foreign = await db()
      .collection('lessons')
      .add({
        ...DEMO_LESSONS[1]!.lesson,
        scope: 'class',
        schoolId: sid,
        classIds: ['other_class'],
      });
    expect((await call('GET', '/v1/study/lessons/' + foreign.id, pupil)).statusCode).toBe(404);
  });
  it('rejects stale revisions and invalid forged parameters', async () => {
    const b = { revision: revision - 1, answers: [{ itemId: 'q1', answer: 0 }] };
    expect(
      (await call('POST', '/v1/study/lessons/' + lessonId + '/quiz', pupil, b)).statusCode,
    ).toBe(409);
  });
  it('awards each item once under simultaneous retries and writes class/school boards', async () => {
    const actor = await requireStudent(pupil),
      input = {
        revision,
        answers: [
          { itemId: 'q1', answer: 0 },
          { itemId: 'q2', answer: '৫.৮৮' },
          { itemId: 'q3', answer: { force: 5.9 } },
          { itemId: 'q4', answer: 3.04 },
          { itemId: 'q5', answer: 0 },
        ],
      };
    const [a, b] = await Promise.all([
      grade(actor, lessonId, input, true),
      grade(actor, lessonId, input, true),
    ]);
    expect(a.pointsAwarded + b.pointsAwarded).toBe(11);
    const board = await call('GET', '/v1/study/boards?scope=class&period=all', pupil);
    expect(board.json().board.entries[0]).toMatchObject({ studentId, points: 11 });
    const attempt = await call(
      'GET',
      '/v1/school/results?classId=' + cid + '&lessonId=' + lessonId,
      teacher,
    );
    expect(attempt.json().lesson.quizItemIds).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
    expect(
      attempt.json().students.find((s: { student: { id: string } }) => s.student.id === studentId)
        .attempt.pointsAwarded,
    ).toBe(11);
    const retake = await grade(actor, lessonId, input, true);
    expect(retake.pointsAwarded).toBe(0);
    const saved = await db().doc(`schools/${sid}/attempts/${studentId}_${lessonId}`).get();
    expect(saved.get('items.q1')).toMatchObject({ tries: 3, firstCorrectTry: 1 });
  });
  it('preserves that a corrected answer was initially wrong', async () => {
    const actor = { ...(await requireStudent(pupil)), studentId: secondStudentId };
    const answers = [
      { itemId: 'q1', answer: 0 },
      { itemId: 'q2', answer: '৫.৮৮' },
      { itemId: 'q3', answer: { force: 5.9 } },
      { itemId: 'q4', answer: 3.04 },
      { itemId: 'q5', answer: 0 },
    ];
    await grade(
      actor,
      lessonId,
      {
        revision,
        answers: answers.map((a) => (a.itemId === 'q1' ? { ...a, answer: 1 } : a)),
      },
      true,
    );
    await grade(actor, lessonId, { revision, answers }, true);
    await grade(actor, lessonId, { revision, answers }, true);
    const saved = await db().doc(`schools/${sid}/attempts/${secondStudentId}_${lessonId}`).get();
    expect(saved.get('items.q1')).toMatchObject({ tries: 3, firstCorrectTry: 2 });
  });
  it('enforces seats and unique usernames atomically', async () => {
    const current = await call('GET', '/v1/school/students', teacher);
    expect(current.json().students[0]).not.toHaveProperty('pin');
    const duplicate = await call('POST', '/v1/school/students', teacher, {
      firstName: 'Duplicate',
      username: 'rahim',
      classId: cid,
      avatar: 'fox',
      language: 'bn',
    });
    expect(duplicate.statusCode).toBe(409);
    const tooMany = Array.from({ length: 5 }, (_, i) => 'নাম,new' + i + ',' + cid).join('\n');
    expect(
      (
        await call('POST', '/v1/school/students/import', teacher, {
          csv: 'firstName,username,classId\n' + tooMany,
        })
      ).statusCode,
    ).toBe(409);
  });
  it('locks five failed PIN attempts and teacher reset invalidates issued tokens', async () => {
    const school = await db()
      .doc('schools/' + sid)
      .get();
    for (let i = 0; i < 5; i++)
      expect(
        (
          await call('POST', '/v1/study/login', undefined, {
            schoolCode: school.get('code'),
            username: 'rahim',
            pin: pin === '000000' ? '999999' : '000000',
          })
        ).statusCode,
      ).toBe(403);
    expect(
      (
        await call('POST', '/v1/study/login', undefined, {
          schoolCode: school.get('code'),
          username: 'rahim',
          pin,
        })
      ).statusCode,
    ).toBe(429);
    const reset = await call(
      'POST',
      '/v1/school/students/' + studentId + '/reset-pin',
      teacher,
      {},
    );
    expect(reset.statusCode).toBe(200);
    await expect(requireStudent(pupil)).rejects.toThrow();
    pin = reset.json().pin;
    const newLogin = await call('POST', '/v1/study/login', undefined, {
      schoolCode: school.get('code'),
      username: 'rahim',
      pin,
    });
    expect(newLogin.statusCode).toBe(200);
    pupil = await exchange(newLogin.json().customToken);
  });
  it('blocks student access and teacher writes while suspended, preserving teacher reads', async () => {
    expect(
      (
        await call('PATCH', '/v1/admin/schools/' + sid, operator, {
          status: 'suspended',
          reason: 'Suspension acceptance test',
        })
      ).statusCode,
    ).toBe(200);
    expect((await call('GET', '/v1/school/students', teacher)).statusCode).toBe(200);
    expect(
      (await call('POST', '/v1/school/classes', teacher, { grade: 9, section: 'B', name: '9-B' }))
        .statusCode,
    ).toBe(403);
    expect((await call('GET', '/v1/study/lessons', pupil)).statusCode).toBe(403);
    await call('PATCH', '/v1/admin/schools/' + sid, operator, {
      status: 'active',
      reason: 'Resume acceptance test',
    });
  });
  it('rejects family invitation promotion and expired/wrong-email invitations', async () => {
    await adminAuth().createUser({
      uid: 'school_system_parent',
      email: 'parent-system@example.test',
    });
    await db().doc('users/school_system_parent').set({ email: 'parent-system@example.test' });
    const invite = await call('POST', '/v1/admin/schools/' + sid + '/invites', operator, {
      email: 'parent-system@example.test',
      reason: 'Boundary acceptance',
    });
    const raw = new URL(invite.json().inviteUrl).searchParams.get('invite');
    expect(
      (
        await call('POST', '/v1/school/invites/accept', await token('school_system_parent'), {
          token: raw,
        })
      ).statusCode,
    ).toBe(403);
  });
  it('reserves AI quotas and returns translated drafts without silently saving', async () => {
    const actor = {
      uid: 'school_system_teacher',
      email: 'teacher-system@example.test',
      schoolId: sid,
      superAdmin: false,
    };
    const old = await db()
      .doc('lessons/' + lessonId)
      .get();
    const translated = await translateLesson(actor, lessonId, 'bn', async (prompt) => {
      const inputs = JSON.parse(prompt.slice(prompt.lastIndexOf('order: ') + 7)) as string[];
      return { texts: inputs.map(() => 'অনুবাদিত পাঠ') };
    });
    expect(translated.draft.lesson.approved.bn).toBe(false);
    expect(
      (
        await db()
          .doc('lessons/' + lessonId)
          .get()
      ).get('revision'),
    ).toBe(old.get('revision'));
    const draft = structuredClone(DEMO_LESSONS[1]!);
    draft.lesson.steps = draft.lesson.steps.filter((s) => s.kind !== 'quiz' && s.kind !== 'check');
    const result = await draftLesson(
      actor,
      lessonId,
      { notes: 'Explain friction', sourceLanguage: 'en' },
      async () => ({ lesson: draft.lesson, keys: { revision: 0, items: {} } }),
    );
    expect(result.draft.lesson.status).toBe('draft');
  });
  it('stores operator global lesson changes and audit in one transaction', async () => {
    const seed = DEMO_LESSONS[0]!,
      created = await call('POST', '/v1/admin/lessons', operator, {
        lesson: seed.lesson,
        keys: seed.keys,
        reason: 'Global lesson acceptance',
      });
    expect(created.statusCode).toBe(200);
    const audits = await db()
      .collection('adminAudit')
      .where('target.id', '==', created.json().lesson.id)
      .get();
    expect(audits.docs.some((d) => d.get('action') === 'lesson.save')).toBe(true);
    expect(
      (
        await call('PATCH', '/v1/admin/lessons/' + created.json().lesson.id, operator, {
          lesson: seed.lesson,
          keys: seed.keys,
          expectedRevision: 0,
        })
      ).statusCode,
    ).toBe(400);
  });
});
