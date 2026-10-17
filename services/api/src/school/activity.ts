import {
  AttemptDocSchema,
  LessonDocSchema,
  StudentDocSchema,
  currentAttempt,
  schoolPaths,
} from '@just-imagine/protocol';
import type { SchoolAdminActor } from '@just-imagine/server-core';
import { db, schoolId } from './common';

/** The newest real attempts in this school, for the teacher overview. Answers are never returned. */
export async function recentActivity(actor: SchoolAdminActor, limit = 8) {
  const sid = await schoolId(actor);
  const attempts = await db()
    .collection(schoolPaths.attempts(sid))
    .orderBy('updatedAt', 'desc')
    .limit(limit)
    .get();
  const rows = attempts.docs.map((d) => AttemptDocSchema.parse(d.data()));
  if (!rows.length) return { activity: [] };
  const [students, lessons] = await Promise.all([
    db().getAll(
      ...[...new Set(rows.map((r) => r.studentId))].map((id) =>
        db().doc(schoolPaths.student(sid, id)),
      ),
    ),
    db().getAll(
      ...[...new Set(rows.map((r) => r.lessonId))].map((id) => db().doc(schoolPaths.lesson(id))),
    ),
  ]);
  const studentById = new Map(
    students.filter((s) => s.exists).map((s) => [s.id, StudentDocSchema.parse(s.data())]),
  );
  const lessonById = new Map(
    lessons.filter((l) => l.exists).map((l) => [l.id, LessonDocSchema.parse(l.data())]),
  );
  return {
    activity: rows.flatMap((raw) => {
      const student = studentById.get(raw.studentId),
        lesson = lessonById.get(raw.lessonId);
      if (!student || !lesson || (lesson.schoolId !== sid && lesson.scope !== 'global')) return [];
      const attempt = currentAttempt(raw, lesson.revision);
      const quizIds = lesson.steps.flatMap((s) =>
        s.kind === 'quiz' ? s.items.map((i) => i.id) : [],
      );
      const submitted =
        quizIds.length > 0 && quizIds.every((id) => (attempt.items[id]?.tries ?? 0) > 0);
      if (!Object.keys(attempt.items).length) return [];
      return [
        {
          studentId: raw.studentId,
          firstName: student.firstName,
          classId: student.classId,
          lessonId: raw.lessonId,
          lessonTitle: lesson.title,
          status: submitted ? ('submitted' as const) : ('inProgress' as const),
          score: submitted
            ? {
                correct: quizIds.filter((id) => attempt.items[id]?.correct).length,
                total: quizIds.length,
              }
            : null,
          completedAt: attempt.completedAt,
          updatedAt: raw.updatedAt,
        },
      ];
    }),
  };
}
