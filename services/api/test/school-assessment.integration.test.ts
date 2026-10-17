import { beforeAll, describe, expect, it } from 'vitest';
import { db, type StudentActor } from '@just-imagine/server-core';
import {
  AttemptDocSchema,
  LessonDocSchema,
  LessonKeysDocSchema,
  schoolPaths,
  type LessonDoc,
} from '@just-imagine/protocol';
import { grade, hint } from '../src/school/grading';
const sid = 'assessment_school',
  studentId = 'assessment_student',
  classId = 'assessment_class',
  lessonId = 'assessment_lesson';
const actor: StudentActor = { uid: 'assessment_student_uid', schoolId: sid, studentId, classId };
const text = { en: 'Find the value', bn: 'মান বের করো' };
let lesson: LessonDoc;
const attemptRef = () => db().doc(schoolPaths.attempt(sid, studentId, lessonId));
const answer = (revision: number, stepIndex: number, values: Record<string, unknown>) =>
  grade(
    actor,
    lessonId,
    {
      revision,
      stepIndex,
      answers: Object.entries(values).map(([itemId, answer]) => ({ itemId, answer })),
    },
    true,
  );
beforeAll(async () => {
  process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
  lesson = LessonDocSchema.parse({
    scope: 'class',
    schoolId: sid,
    classIds: [classId],
    subject: 'math',
    grade: 9,
    chapterId: 'math-1',
    title: text,
    steps: [
      {
        kind: 'quiz',
        items: [
          { id: 'q1', kind: 'numeric', prompt: text, unit: '', points: 2 },
          { id: 'q2', kind: 'numeric', prompt: text, unit: '', points: 3 },
        ],
      },
      { kind: 'quiz', items: [{ id: 'q3', kind: 'numeric', prompt: text, unit: '', points: 4 }] },
    ],
    status: 'published',
    sourceLanguage: 'en',
    approved: { en: true, bn: true },
    authorUid: 'assessment_teacher',
    revision: 0,
    updatedAt: 100,
  });
  const batch = db().batch();
  batch.set(db().doc(schoolPaths.school(sid)), {
    name: 'Assessment School',
    nameBn: 'মূল্যায়ন বিদ্যালয়',
    code: 'QA2BC3',
    status: 'active',
    seats: 5,
    voiceSecondsPerDay: 60,
    createdAt: 100,
  });
  batch.set(db().doc(schoolPaths.student(sid, studentId)), {
    firstName: 'Assessment',
    username: 'assessment',
    classId,
    avatar: 'fox',
    language: 'en',
    pointsAll: 0,
    pointsWeek: null,
    createdAt: 100,
  });
  batch.set(db().doc(schoolPaths.lesson(lessonId)), lesson);
  batch.set(
    db().doc(schoolPaths.lessonKeys(lessonId)),
    LessonKeysDocSchema.parse({
      revision: 0,
      items: Object.fromEntries(
        ['q1', 'q2', 'q3'].map((id) => [
          id,
          {
            key: { kind: 'numeric', value: 1, tolerance: { mode: 'abs', amount: 0 } },
            hints: [text, { en: 'Second hint', bn: 'দ্বিতীয় ইঙ্গিত' }],
          },
        ]),
      ),
    }),
  );
  await batch.commit();
});
describe('assessment revisions and quiz sections in Firestore', () => {
  it('requires every selected-section question, completes across sections and awards each credit once under concurrency', async () => {
    await expect(answer(0, 0, { q1: 1 })).rejects.toMatchObject({ status: 400 });
    await expect(answer(0, 0, { q1: 1, q3: 1 })).rejects.toMatchObject({ status: 400 });
    const concurrent = await Promise.all([
      answer(0, 0, { q1: '১', q2: 1 }),
      answer(0, 0, { q1: 1, q2: 1 }),
    ]);
    expect(concurrent.reduce((sum, result) => sum + result.pointsAwarded, 0)).toBe(5);
    let attempt = AttemptDocSchema.parse((await attemptRef().get()).data());
    expect(attempt.completedAt).toBeNull();
    expect(attempt.items.q1!.firstCorrectTry).toBe(1);
    expect((await answer(0, 1, { q3: 1 })).pointsAwarded).toBe(4);
    attempt = AttemptDocSchema.parse((await attemptRef().get()).data());
    expect(attempt.completedAt).not.toBeNull();
    expect(attempt.pointsAwarded).toBe(9);
    expect(
      (
        await grade(
          actor,
          lessonId,
          { revision: 0, answers: ['q1', 'q2', 'q3'].map((itemId) => ({ itemId, answer: 1 })) },
          true,
        )
      ).pointsAwarded,
    ).toBe(0);
  });
  it('archives historical answers/first-correct tries and never reuses old correctness or reawards a changed key', async () => {
    const old = AttemptDocSchema.parse((await attemptRef().get()).data());
    const next = { ...lesson, revision: 1, updatedAt: 200 };
    const keys = LessonKeysDocSchema.parse({
      revision: 1,
      items: Object.fromEntries(
        ['q1', 'q2', 'q3'].map((id) => [
          id,
          {
            key: { kind: 'numeric', value: 2, tolerance: { mode: 'abs', amount: 0 } },
            hints: [text, { en: 'Second hint', bn: 'দ্বিতীয় ইঙ্গিত' }],
          },
        ]),
      ),
    });
    const batch = db().batch();
    batch.set(db().doc(schoolPaths.lesson(lessonId)), next);
    batch.set(db().doc(schoolPaths.lessonKeys(lessonId)), keys);
    await batch.commit();
    await expect(answer(0, 0, { q1: 1, q2: 1 })).rejects.toMatchObject({ status: 409 });
    const first = await answer(1, 0, { q1: 1, q2: 2 });
    expect(first.pointsAwarded).toBe(0);
    expect(first.attempt.completedAt).toBeNull();
    expect(first.attempt.items.q1).toMatchObject({
      correct: false,
      tries: 1,
      firstCorrectAt: null,
    });
    expect(first.attempt.items.q1).not.toHaveProperty('firstCorrectTry');
    expect(first.attempt.items.q3).toBeUndefined();
    const archived = AttemptDocSchema.parse(
      (await attemptRef().collection('revisions').doc('0').get()).data(),
    );
    expect(archived).toEqual(old);
    expect(archived.items.q1!.firstCorrectTry).toBe(1);
    const retry = await answer(1, 0, { q1: 2, q2: 2 });
    expect(retry.pointsAwarded).toBe(0);
    expect(retry.attempt.items.q1!.firstCorrectTry).toBe(2);
    expect(retry.attempt.completedAt).toBeNull();
    const completed = await answer(1, 1, { q3: 2 });
    expect(completed.attempt.completedAt).not.toBeNull();
    expect(completed.attempt.pointsAwarded).toBe(9);
    expect(completed.attempt.creditedItemIds!.sort()).toEqual(['q1', 'q2', 'q3']);
    expect((await db().doc(schoolPaths.student(sid, studentId)).get()).get('pointsAll')).toBe(9);
  });
  it('returns question-scoped progressive hint metadata and enforces revision', async () => {
    expect(await hint(actor, lessonId, 'q1', 0, 1)).toMatchObject({
      hintIndex: 0,
      remaining: 1,
      nextHintIndex: 1,
    });
    expect(await hint(actor, lessonId, 'q1', 1, 1)).toMatchObject({
      hintIndex: 1,
      remaining: 0,
      nextHintIndex: null,
    });
    expect(await hint(actor, lessonId, 'q2', 0, 1)).toMatchObject({ hintIndex: 0, remaining: 1 });
    await expect(hint(actor, lessonId, 'q1', 0, 0)).rejects.toMatchObject({ status: 409 });
  });
});
