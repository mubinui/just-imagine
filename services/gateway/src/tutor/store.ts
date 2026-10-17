import {
  AttemptDocSchema,
  LessonDocSchema,
  LessonKeysDocSchema,
  SchoolDocSchema,
  SchoolUsageDailyDocSchema,
  StudentDocSchema,
  schoolPaths,
} from '@just-imagine/protocol';
import { db, newId, requireStudent } from '@just-imagine/server-core';
import type { TutorRecord, TutorStore } from './contracts';

export function tutorDate(now = Date.now()): string {
  return new Date(now + 6 * 3600000).toISOString().slice(0, 10).replaceAll('-', '');
}
export function lessonVisible(
  lesson: ReturnType<typeof LessonDocSchema.parse>,
  actor: { schoolId: string; classId: string },
) {
  return (
    lesson.status === 'published' &&
    (lesson.scope === 'global' ||
      (lesson.schoolId === actor.schoolId &&
        (lesson.scope === 'school' || lesson.classIds.includes(actor.classId))))
  );
}
export class FirestoreTutorStore implements TutorStore {
  private lease(uid: string) {
    return db().doc(`schoolTutorLeases/${uid}`);
  }
  async authorize(token: string, lessonId: string, stepIndex: number): Promise<TutorRecord> {
    const actor = await requireStudent(token);
    const id = newId('s');
    return db().runTransaction(async (tx) => {
      const date = tutorDate(),
        usageRef = db().doc(schoolPaths.usageDaily(actor.schoolId, date)),
        leaseRef = this.lease(actor.uid);
      const [schoolSnap, studentSnap, lessonSnap, runtime, usageSnap, lease] = await Promise.all([
        tx.get(db().doc(schoolPaths.school(actor.schoolId))),
        tx.get(db().doc(schoolPaths.student(actor.schoolId, actor.studentId))),
        tx.get(db().doc(schoolPaths.lesson(lessonId))),
        tx.get(db().doc('config/runtime')),
        tx.get(usageRef),
        tx.get(leaseRef),
      ]);
      if (runtime.data()?.['killSwitch'] === true) throw new Error('KILL_SWITCH');
      const school = SchoolDocSchema.parse(schoolSnap.data());
      const student = StudentDocSchema.parse(studentSnap.data());
      const lesson = LessonDocSchema.parse(lessonSnap.data());
      if (
        school.status !== 'active' ||
        !lessonVisible(lesson, actor) ||
        student.classId !== actor.classId ||
        !lesson.steps[stepIndex]
      )
        throw new Error('FORBIDDEN');
      const usage = usageSnap.exists
        ? SchoolUsageDailyDocSchema.parse(usageSnap.data()).voiceSeconds
        : 0;
      const remaining = Math.max(0, school.voiceSecondsPerDay - usage);
      if (remaining <= 0) throw new Error('QUOTA_EXHAUSTED');
      if ((lease.data()?.['expiresAt'] ?? 0) > Date.now())
        throw new Error('SESSION_ACTIVE_ELSEWHERE');
      const reserved = Math.min(1, remaining);
      tx.set(usageRef, {
        ...(usageSnap.exists
          ? SchoolUsageDailyDocSchema.parse(usageSnap.data())
          : SchoolUsageDailyDocSchema.parse({ schoolId: actor.schoolId, date })),
        voiceSeconds: usage + reserved,
      });
      tx.set(leaseRef, { sessionId: id, schoolId: actor.schoolId, expiresAt: Date.now() + 15000 });
      tx.create(db().doc(`schoolTutorMeters/${id}`), {
        schoolId: actor.schoolId,
        seconds: reserved,
        updatedAt: Date.now(),
      });
      return {
        ...actor,
        id,
        token,
        lessonId,
        lesson,
        stepIndex,
        language: student.language,
        characterId: lesson.subject === 'math' ? 'onkomama' : 'pori',
        startedAt: Date.now(),
        remaining,
      };
    });
  }
  async meter(record: TutorRecord, totalSeconds: number): Promise<number> {
    // Revoked PIN sessions and class transfers fail before any further model use.
    const actor = await requireStudent(record.token);
    if (
      actor.schoolId !== record.schoolId ||
      actor.studentId !== record.studentId ||
      actor.classId !== record.classId
    )
      throw new Error('FORBIDDEN');
    const date = tutorDate();
    return db().runTransaction(async (tx) => {
      const usageRef = db().doc(schoolPaths.usageDaily(record.schoolId, date));
      const checkpointRef = db().doc(`schoolTutorMeters/${record.id}`);
      const leaseRef = this.lease(record.uid);
      const [schoolSnap, usageSnap, checkpoint, runtime, lessonSnap, lease] = await Promise.all([
        tx.get(db().doc(schoolPaths.school(record.schoolId))),
        tx.get(usageRef),
        tx.get(checkpointRef),
        tx.get(db().doc('config/runtime')),
        tx.get(db().doc(schoolPaths.lesson(record.lessonId))),
        tx.get(leaseRef),
      ]);
      if (lease.get('sessionId') !== record.id || (lease.get('expiresAt') ?? 0) <= Date.now())
        throw new Error('FORBIDDEN');
      if (runtime.data()?.['killSwitch'] === true) throw new Error('KILL_SWITCH');
      const school = SchoolDocSchema.parse(schoolSnap.data());
      const lesson = LessonDocSchema.parse(lessonSnap.data());
      if (school.status !== 'active' || !lessonVisible(lesson, record))
        throw new Error('FORBIDDEN');
      if (lesson.revision !== record.lesson.revision) throw new Error('FORBIDDEN');
      const usage = SchoolUsageDailyDocSchema.parse(
        usageSnap.exists ? usageSnap.data() : { schoolId: record.schoolId, date },
      );
      const previous = Number(checkpoint.data()?.['seconds'] ?? 0);
      if (!Number.isFinite(totalSeconds) || totalSeconds < 0)
        throw new Error('Invalid tutor meter.');
      const total = Math.max(previous, Math.ceil(totalSeconds));
      const delta = Math.max(0, total - previous);
      const remaining = Math.max(0, school.voiceSecondsPerDay - usage.voiceSeconds);
      tx.set(usageRef, { ...usage, voiceSeconds: usage.voiceSeconds + Math.min(delta, remaining) });
      const paidThrough = previous + Math.min(delta, remaining);
      tx.set(checkpointRef, {
        schoolId: record.schoolId,
        seconds: paidThrough,
        updatedAt: Date.now(),
      });
      tx.set(leaseRef, {
        sessionId: record.id,
        schoolId: record.schoolId,
        expiresAt: Date.now() + 15000,
      });
      return Math.max(0, remaining - Math.min(delta, remaining) + paidThrough - totalSeconds);
    });
  }
  async release(record: TutorRecord, totalSeconds: number): Promise<void> {
    await db().runTransaction(async (tx) => {
      const leaseRef = this.lease(record.uid),
        usageRef = db().doc(schoolPaths.usageDaily(record.schoolId, tutorDate())),
        checkpointRef = db().doc(`schoolTutorMeters/${record.id}`);
      const [lease, school, usage, checkpoint] = await Promise.all([
        tx.get(leaseRef),
        tx.get(db().doc(schoolPaths.school(record.schoolId))),
        tx.get(usageRef),
        tx.get(checkpointRef),
      ]);
      if (lease.get('sessionId') !== record.id) return;
      if (school.exists && Number.isFinite(totalSeconds) && totalSeconds >= 0) {
        const current = SchoolUsageDailyDocSchema.parse(
          usage.exists ? usage.data() : { schoolId: record.schoolId, date: tutorDate() },
        );
        const before = Number(checkpoint.get('seconds') ?? 0),
          delta = Math.min(
            Math.max(0, Math.ceil(totalSeconds) - before),
            Math.max(
              0,
              SchoolDocSchema.parse(school.data()).voiceSecondsPerDay - current.voiceSeconds,
            ),
          );
        tx.set(usageRef, { ...current, voiceSeconds: current.voiceSeconds + delta });
        tx.set(checkpointRef, {
          schoolId: record.schoolId,
          seconds: before + delta,
          updatedAt: Date.now(),
        });
      }
      tx.delete(leaseRef);
    });
  }
  async hint(record: TutorRecord, itemId: string, index: number): Promise<string> {
    const step = record.lesson.steps[record.stepIndex];
    const items = step?.kind === 'check' ? [step.item] : step?.kind === 'quiz' ? step.items : [];
    if (
      !items.some((item) => item.id === itemId) ||
      !Number.isInteger(index) ||
      index < 0 ||
      index > 1
    )
      throw new Error('No hint available for this step.');
    const snap = await db().doc(schoolPaths.lessonKeys(record.lessonId)).get();
    const keys = LessonKeysDocSchema.parse(snap.data());
    if (keys.revision !== record.lesson.revision)
      throw new Error('Lesson changed. Reopen the lesson.');
    return (
      keys.items[itemId]?.hints[index]?.[record.language] ||
      'There are no more teacher hints for this question.'
    );
  }
  async result(record: TutorRecord): Promise<unknown> {
    const snap = await db()
      .doc(schoolPaths.attempt(record.schoolId, record.studentId, record.lessonId))
      .get();
    if (!snap.exists) return { message: 'No submitted result yet.' };
    const attempt = AttemptDocSchema.parse(snap.data());
    if (attempt.revision !== record.lesson.revision)
      return { message: 'No submitted result for this lesson revision yet.' };
    return {
      revision: attempt.revision,
      items: attempt.items,
      pointsAwarded: attempt.pointsAwarded,
    };
  }
}
