import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { db, type SchoolAdminActor } from '@just-imagine/server-core';
import { LessonDocSchema, LessonKeysDocSchema, schoolPaths } from '@just-imagine/protocol';
import { DEMO_LESSONS } from '../src/school/demo-lessons';
import { approveLesson, publishLesson, saveLesson, validateLesson } from '../src/school/lessons';

const sid = 'publication_race_school',
  classId = 'publication_race_class';
const actor: SchoolAdminActor = {
  uid: 'publication_race_teacher',
  email: 'publication-race@example.test',
  schoolId: sid,
  superAdmin: false,
};
beforeAll(async () => {
  process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
  const batch = db().batch();
  batch.set(db().doc(schoolPaths.school(sid)), {
    name: 'Publication Race School',
    nameBn: 'প্রকাশনা পরীক্ষার বিদ্যালয়',
    code: 'PR2BC3',
    status: 'active',
    seats: 5,
    voiceSecondsPerDay: 60,
    createdAt: 100,
  });
  batch.set(db().doc(schoolPaths.schoolClass(sid, classId)), {
    grade: 9,
    section: 'A',
    name: '9-A',
    boardsVisible: true,
    createdAt: 100,
  });
  await batch.commit();
});
afterEach(() => vi.restoreAllMocks());

describe('publication validation binds the exact optimistic revision', () => {
  for (const operation of ['save', 'publish', 'approve'] as const) {
    it(`rejects a future revision before the ${operation} transaction can race a concurrent edit`, async () => {
      const id = 'publication_race_' + operation;
      const source = structuredClone(DEMO_LESSONS[0]!);
      const lesson = LessonDocSchema.parse({
        ...source.lesson,
        scope: 'class',
        schoolId: sid,
        classIds: [classId],
        authorUid: actor.uid,
        status: 'published',
        approved: { en: true, bn: true },
        revision: 0,
      });
      const keys = LessonKeysDocSchema.parse({ ...source.keys, revision: 0 });
      validateLesson(lesson, keys, true);
      const database = db(),
        lessonRef = database.doc(schoolPaths.lesson(id)),
        keyRef = database.doc(schoolPaths.lessonKeys(id));
      const batch = database.batch();
      batch.set(lessonRef, lesson);
      batch.set(keyRef, keys);
      await batch.commit();

      // Old code validates revision0, but trusts expected1 in the later transaction. Insert a
      // genuine Firestore edit precisely between those phases: save can overwrite revision1
      // without incrementing it; publish/approve can reuse revision0 validation and private keys.
      const originalTransaction = database.runTransaction.bind(database);
      const interleaved: typeof database.runTransaction = async (update, options) => {
        const concurrent = database.batch();
        concurrent.set(lessonRef, {
          ...lesson,
          revision: 1,
          status: 'draft',
          approved: { en: false, bn: false },
          title: { en: 'Concurrent unfinished edit', bn: '' },
          steps: [{ kind: 'intro', body: { en: 'Not yet an assessment', bn: '' } }],
        });
        concurrent.set(keyRef, { revision: 1, items: {} });
        await concurrent.commit();
        return originalTransaction(update, options);
      };
      const transaction = vi.spyOn(database, 'runTransaction').mockImplementationOnce(interleaved);
      const request = () =>
        operation === 'save'
          ? saveLesson(actor, { lesson, keys, expectedRevision: 1 }, id)
          : operation === 'publish'
            ? publishLesson(actor, id, 1)
            : approveLesson(actor, id, 'en', 1);

      await expect(request()).rejects.toMatchObject({ status: 409 });
      expect(transaction).not.toHaveBeenCalled();
      expect((await lessonRef.get()).data()).toEqual(lesson);
      expect((await keyRef.get()).data()).toEqual(keys);
    });
  }
});
