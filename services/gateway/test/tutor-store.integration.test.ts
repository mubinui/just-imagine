import { expect, it } from 'vitest';
import { adminAuth, db, requireParent } from '@just-imagine/server-core';
import { schoolPaths, studentUid } from '@just-imagine/protocol';
import { FirestoreTutorStore, tutorDate } from '../src/tutor/store';

process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
async function studentToken(schoolId: string, studentId: string, classId: string) {
  const token = await adminAuth().createCustomToken(studentUid(schoolId, studentId), {
    role: 'student',
    schoolId,
    studentId,
    classId,
  });
  const response = await fetch(
    `http://${process.env['FIREBASE_AUTH_EMULATOR_HOST']}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=test`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, returnSecureToken: true }),
    },
  );
  const body = (await response.json()) as { idToken?: string };
  if (!body.idToken) throw new Error('Cannot mint emulator student token.');
  return body.idToken;
}
async function fixture(suffix: string) {
  const schoolId = `s_tutor_${suffix}`,
    studentId = 'p_tutor',
    classId = 'c_tutor',
    lessonId = `l_tutor_${suffix}`;
  await db().doc(schoolPaths.school(schoolId)).set({
    name: 'Tutor school',
    nameBn: 'টিউটর স্কুল',
    code: 'TU2R3S',
    status: 'active',
    seats: 20,
    voiceSecondsPerDay: 20,
    createdAt: 1,
  });
  await db()
    .doc(schoolPaths.schoolClass(schoolId, classId))
    .set({ grade: 9, name: '9-A', section: 'A', createdAt: 1 });
  await db().doc(schoolPaths.student(schoolId, studentId)).set({
    firstName: 'Mita',
    username: 'mita',
    classId,
    avatar: 'owl',
    language: 'bn',
    createdAt: 1,
  });
  await db()
    .doc(schoolPaths.lesson(lessonId))
    .set({
      scope: 'class',
      schoolId,
      classIds: [classId],
      subject: 'physics',
      grade: 9,
      chapterId: 'physics-3',
      title: { en: 'Force', bn: 'বল' },
      steps: [
        {
          kind: 'check',
          item: {
            id: 'q1',
            kind: 'numeric',
            prompt: { en: 'Try', bn: 'চেষ্টা করো' },
            unit: 'N',
            points: 2,
          },
        },
      ],
      status: 'published',
      sourceLanguage: 'bn',
      approved: { en: true, bn: true },
      authorUid: 'teacher',
      revision: 1,
      updatedAt: 1,
    });
  await db()
    .doc(schoolPaths.lessonKeys(lessonId))
    .set({
      revision: 1,
      items: {
        q1: {
          key: { kind: 'numeric', value: 42, tolerance: { mode: 'abs', amount: 0 } },
          hints: [{ en: 'Use the force equation.', bn: 'বলের সমীকরণ ব্যবহার করো।' }],
        },
      },
    });
  return {
    schoolId,
    studentId,
    classId,
    lessonId,
    token: await studentToken(schoolId, studentId, classId),
    store: new FirestoreTutorStore(),
  };
}
it('meters concurrent repeated checkpoints once and never exceeds the school daily quota', async () => {
  const f = await fixture('meter');
  const record = await f.store.authorize(f.token, f.lessonId, 0);
  expect(record.language).toBe('bn');
  expect(record).not.toHaveProperty('keys');
  await Promise.all([f.store.meter(record, 10), f.store.meter(record, 10)]);
  const usage = db().doc(schoolPaths.usageDaily(f.schoolId, tutorDate()));
  expect((await usage.get()).get('voiceSeconds')).toBe(10);
  await db().doc(schoolPaths.student(f.schoolId, 'p_other')).set({
    firstName: 'Other',
    username: 'other',
    classId: f.classId,
    avatar: 'owl',
    language: 'bn',
    createdAt: 1,
  });
  const second = await f.store.authorize(
    await studentToken(f.schoolId, 'p_other', f.classId),
    f.lessonId,
    0,
  );
  expect(second.remaining).toBe(10);
  await Promise.all([f.store.meter(second, 15), f.store.meter(record, 15)]);
  expect((await usage.get()).get('voiceSeconds')).toBe(20);
  await expect(f.store.authorize(f.token, f.lessonId, 0)).rejects.toThrow('QUOTA_EXHAUSTED');
  await f.store.release(record, 15);
  await f.store.release(second, 15);
}, 30000);
it('admits one concurrent session per student and releases only its matching lease', async () => {
  const f = await fixture('lease');
  const results = await Promise.allSettled([
    f.store.authorize(f.token, f.lessonId, 0),
    f.store.authorize(f.token, f.lessonId, 0),
  ]);
  const accepted = results.filter((result) => result.status === 'fulfilled');
  expect(accepted).toHaveLength(1);
  const first = accepted[0]!;
  if (first.status !== 'fulfilled') throw new Error('No admitted session.');
  expect(
    (await db().doc(schoolPaths.usageDaily(f.schoolId, tutorDate())).get()).get('voiceSeconds'),
  ).toBe(1);
  await f.store.release(first.value, 0.1);
  const replacement = await f.store.authorize(f.token, f.lessonId, 0);
  await f.store.release(first.value, 0.1);
  await expect(f.store.authorize(f.token, f.lessonId, 0)).rejects.toThrow(
    'SESSION_ACTIVE_ELSEWHERE',
  );
  await f.store.release(replacement, 0.1);
});
it('atomically reserves the last school second before admitting different students', async () => {
  const f = await fixture('reserve');
  await db().doc(schoolPaths.school(f.schoolId)).update({ voiceSecondsPerDay: 1 });
  await db().doc(schoolPaths.student(f.schoolId, 'p_other')).set({
    firstName: 'Other',
    username: 'other',
    classId: f.classId,
    avatar: 'owl',
    language: 'bn',
    createdAt: 1,
  });
  const otherToken = await studentToken(f.schoolId, 'p_other', f.classId);
  const results = await Promise.allSettled([
    f.store.authorize(f.token, f.lessonId, 0),
    f.store.authorize(otherToken, f.lessonId, 0),
  ]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(
    (await db().doc(schoolPaths.usageDaily(f.schoolId, tutorDate())).get()).get('voiceSeconds'),
  ).toBe(1);
  for (const result of results)
    if (result.status === 'fulfilled') await f.store.release(result.value, 0.1);
});
it('rechecks class transfers, refuses the family path and releases only a teacher hint', async () => {
  const f = await fixture('scope');
  const record = await f.store.authorize(f.token, f.lessonId, 0);
  await expect(requireParent(f.token)).rejects.toThrow('family');
  expect(await f.store.hint(record, 'q1', 0)).toBe('বলের সমীকরণ ব্যবহার করো।');
  await expect(f.store.hint(record, 'other-question', 0)).rejects.toThrow('No hint');
  await db().doc(schoolPaths.student(f.schoolId, f.studentId)).update({ classId: 'c_other' });
  await expect(f.store.meter(record, 1)).rejects.toThrow();
  await expect(f.store.authorize(f.token, f.lessonId, 0)).rejects.toThrow();
});
