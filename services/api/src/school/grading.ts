import { z } from 'zod';
import { checkLockedSimTask, gradeLabSubmission, LabTaskSchema } from '@just-imagine/stem-sims';
import { REAGENTS, REACTIONS } from '@just-imagine/stem-content';
import {
  AttemptDocSchema,
  BoardDocSchema,
  StudentDocSchema,
  SchoolClassDocSchema,
  SchoolDocSchema,
  LessonDocSchema,
  LessonKeysDocSchema,
  boardId,
  weekKeyDhaka,
  schoolPaths,
  type QuizItem,
  type QuizKey,
  type BoardDoc,
} from '@just-imagine/protocol';
import type { StudentActor, SchoolAdminActor } from '@just-imagine/server-core';
import { db, read, fail, digits, schoolId, visible } from './common';
import { studentLesson, itemsOf } from './lessons';
export function correct(item: QuizItem, key: QuizKey, answer: unknown): boolean {
  if (item.kind !== key.kind) return false;
  switch (item.kind) {
    case 'mcq':
      return (
        key.kind === 'mcq' &&
        typeof answer === 'number' &&
        Number.isInteger(answer) &&
        answer === key.answer
      );
    case 'numeric': {
      if (key.kind !== 'numeric') return false;
      const text = typeof answer === 'string' ? digits(answer).trim() : answer;
      if ((typeof text !== 'number' && typeof text !== 'string') || text === '') return false;
      const n = Number(text);
      return (
        Number.isFinite(n) &&
        Math.abs(n - key.value) <=
          (key.tolerance.mode === 'abs'
            ? key.tolerance.amount
            : Math.abs(key.value) * key.tolerance.amount)
      );
    }
    case 'simTask': {
      if (key.kind !== 'simTask') return false;
      const check = checkLockedSimTask(item, answer, { predicate: key.predicate, args: key.args });
      return check.ok && check.met;
    }
    case 'labTask': {
      if (key.kind !== 'labTask') return false;
      const parsed = z
        .object({
          reagentIds: z.array(z.string()).max(12),
          heat: z.boolean(),
          amounts: z
            .record(
              z.string(),
              z.object({
                volumeMl: z.number().min(1).max(1000),
                concentrationM: z.number().min(0.001).max(5),
              }),
            )
            .optional(),
        })
        .safeParse(answer);
      if (!parsed.success) return false;
      const result = gradeLabSubmission(
        item,
        parsed.data,
        LabTaskSchema.parse(key.task),
        REAGENTS,
        REACTIONS,
      );
      return result.ok && result.met;
    }
  }
}
const AnswerSchema = z.strictObject({ itemId: z.string().min(1).max(32), answer: z.unknown() });
export const QuizSubmissionSchema = z.strictObject({
  revision: z.number().int().nonnegative(),
  answers: z.array(AnswerSchema).min(1).max(100),
});
export const CheckSubmissionSchema = AnswerSchema.extend({
  revision: z.number().int().nonnegative(),
});
export async function grade(actor: StudentActor, id: string, input: unknown, quiz: boolean) {
  const body = quiz
    ? QuizSubmissionSchema.parse(input)
    : (() => {
        const b = CheckSubmissionSchema.parse(input);
        return { revision: b.revision, answers: [{ itemId: b.itemId, answer: b.answer }] };
      })();
  if (new Set(body.answers.map((a) => a.itemId)).size !== body.answers.length)
    return fail(400, 'Each question may be submitted once.');
  const lesson = await studentLesson(actor, id),
    keys = await read(schoolPaths.lessonKeys(id), LessonKeysDocSchema);
  if (lesson.revision !== body.revision || keys.revision !== body.revision)
    return fail(409, 'Your teacher updated this lesson. Open it again.');
  const allowed = lesson.steps.flatMap((s) =>
    quiz ? (s.kind === 'quiz' ? s.items : []) : s.kind === 'check' ? [s.item] : [],
  );
  if (
    quiz &&
    (body.answers.length !== allowed.length ||
      allowed.some((i) => !body.answers.some((a) => a.itemId === i.id)))
  )
    return fail(400, 'Submit an answer for every quiz question.');
  const results = body.answers.map((a) => {
    const item = allowed.find((i) => i.id === a.itemId),
      key = keys.items[a.itemId]?.key;
    if (!item || !key) return fail(400, 'This question is not part of this assessment.');
    return {
      itemId: item.id,
      correct: correct(item, key, a.answer),
      points: quiz ? item.points : 0,
      answer: reviewAnswer(item, a.answer),
    };
  });
  const now = Date.now(),
    weekKey = weekKeyDhaka(now);
  return db().runTransaction(async (tx) => {
    const attemptRef = db().doc(schoolPaths.attempt(actor.schoolId, actor.studentId, id)),
      profileRef = db().doc(schoolPaths.student(actor.schoolId, actor.studentId)),
      lessonRef = db().doc(schoolPaths.lesson(id));
    const [attemptSnap, profileSnap, currentLesson] = await Promise.all([
      tx.get(attemptRef),
      tx.get(profileRef),
      tx.get(lessonRef),
    ]);
    if (
      currentLesson.get('revision') !== body.revision ||
      !visible(LessonDocSchema.parse(currentLesson.data()), actor)
    )
      return fail(409, 'This lesson changed. Open it again.');
    const activeSchool = await tx.get(db().doc(schoolPaths.school(actor.schoolId)));
    if (SchoolDocSchema.parse(activeSchool.data()).status !== 'active')
      return fail(403, 'This school is paused.');
    const profile = StudentDocSchema.parse(profileSnap.data());
    if (profile.classId !== actor.classId) return fail(403, 'Your class changed. Sign in again.');
    const attempt = AttemptDocSchema.parse(
      attemptSnap.exists
        ? attemptSnap.data()
        : {
            studentId: actor.studentId,
            lessonId: id,
            revision: lesson.revision,
            items: {},
            pointsAwarded: 0,
            completedAt: null,
            updatedAt: now,
          },
    );
    let pointsAwarded = 0;
    for (const result of results) {
      const prior = attempt.items[result.itemId];
      if (result.correct && !prior?.firstCorrectAt) pointsAwarded += result.points;
      attempt.items[result.itemId] = {
        correct: result.correct,
        answer: result.answer,
        tries: (prior?.tries ?? 0) + 1,
        firstCorrectAt: prior?.firstCorrectAt ?? (result.correct && quiz ? now : null),
        ...(prior?.firstCorrectTry !== undefined
          ? { firstCorrectTry: prior.firstCorrectTry }
          : result.correct && quiz && !prior?.firstCorrectAt
            ? { firstCorrectTry: (prior?.tries ?? 0) + 1 }
            : {}),
      };
    }
    const boardRefs = [
      { scope: 'class' as const, classId: actor.classId },
      { scope: 'school' as const },
    ]
      .flatMap((ref) => [
        { ref, period: 'week' as const, weekKey },
        { ref, period: 'all' as const, weekKey: null },
      ])
      .map((b) => ({
        ...b,
        doc: db().doc(
          schoolPaths.board(
            actor.schoolId,
            boardId(b.ref, b.weekKey ? { weekKey: b.weekKey } : 'all'),
          ),
        ),
      }));
    const boardSnaps = pointsAwarded ? await Promise.all(boardRefs.map((b) => tx.get(b.doc))) : [];
    const next = StudentDocSchema.parse({
      ...profile,
      pointsAll: profile.pointsAll + pointsAwarded,
      pointsWeek: {
        weekKey,
        points:
          (profile.pointsWeek?.weekKey === weekKey ? profile.pointsWeek.points : 0) + pointsAwarded,
      },
    });
    attempt.revision = body.revision;
    attempt.updatedAt = now;
    attempt.pointsAwarded += pointsAwarded;
    const quizIds = lesson.steps.flatMap((s) =>
      s.kind === 'quiz' ? s.items.map((i) => i.id) : [],
    );
    if (quizIds.every((q) => attempt.items[q]?.correct)) attempt.completedAt ??= now;
    tx.set(attemptRef, attempt);
    if (pointsAwarded) {
      tx.set(profileRef, next);
      boardRefs.forEach((b, i) => {
        const snap = boardSnaps[i]!;
        const board = BoardDocSchema.parse(
          snap.exists
            ? snap.data()
            : {
                scope: b.ref.scope,
                classId: b.ref.scope === 'class' ? b.ref.classId : null,
                period: b.period,
                weekKey: b.weekKey,
                entries: [],
                updatedAt: now,
              },
        );
        board.entries = [
          ...board.entries.filter((e) => e.studentId !== actor.studentId),
          {
            studentId: actor.studentId,
            firstName: next.firstName,
            avatar: next.avatar,
            points: b.period === 'week' ? next.pointsWeek!.points : next.pointsAll,
            reachedAt: now,
          },
        ]
          .sort(
            (a, b) =>
              b.points - a.points ||
              a.reachedAt - b.reachedAt ||
              a.studentId.localeCompare(b.studentId),
          )
          .slice(0, 50);
        board.updatedAt = now;
        tx.set(b.doc, board);
      });
    }
    return {
      results: results.map(({ itemId, correct }) => ({
        itemId,
        correct,
        explanation: keys.items[itemId]?.hints[0] ?? {
          en: correct ? 'Correct. Well done.' : 'Try again using the lesson model.',
          bn: correct ? 'ঠিক হয়েছে। ভালো করেছ।' : 'পাঠের মডেল দেখে আবার চেষ্টা করো।',
        },
      })),
      ...(quiz ? {} : results[0]),
      pointsAwarded,
      pointsAll: next.pointsAll,
      pointsWeek: next.pointsWeek,
      attempt,
    };
  });
}
export async function boards(
  actor: StudentActor,
  scope: 'class' | 'school',
  period: 'week' | 'all',
) {
  const weekKey = weekKeyDhaka(Date.now());
  if (
    scope === 'class' &&
    !(await read(schoolPaths.schoolClass(actor.schoolId, actor.classId), SchoolClassDocSchema))
      .boardsVisible
  )
    return fail(403, 'Your teacher has hidden this class board.');
  const ref = scope === 'class' ? { scope, classId: actor.classId } : { scope };
  const snap = await db()
    .doc(schoolPaths.board(actor.schoolId, boardId(ref, period === 'week' ? { weekKey } : 'all')))
    .get();
  const profile = await read(
      schoolPaths.student(actor.schoolId, actor.studentId),
      StudentDocSchema,
    ),
    points =
      period === 'all'
        ? profile.pointsAll
        : profile.pointsWeek?.weekKey === weekKey
          ? profile.pointsWeek.points
          : 0;
  let query: FirebaseFirestore.Query = db().collection(schoolPaths.students(actor.schoolId));
  if (scope === 'class') query = query.where('classId', '==', actor.classId);
  const peers = await query.get();
  const rank =
    1 +
    peers.docs.filter((d) => {
      const p = StudentDocSchema.parse(d.data());
      const n =
        period === 'all'
          ? p.pointsAll
          : p.pointsWeek?.weekKey === weekKey
            ? p.pointsWeek.points
            : 0;
      return n > points;
    }).length;
  const board: BoardDoc = snap.exists
    ? BoardDocSchema.parse(snap.data())
    : {
        scope,
        classId: scope === 'class' ? actor.classId : null,
        period,
        weekKey: period === 'week' ? weekKey : null,
        entries: [],
        updatedAt: Date.now(),
      };
  return { board, own: { points, rank } };
}
export async function results(actor: SchoolAdminActor, classId: string, lessonId: string) {
  const sid = await schoolId(actor);
  await read(schoolPaths.schoolClass(sid, classId), SchoolClassDocSchema);
  const lesson = await read(schoolPaths.lesson(lessonId), LessonDocSchema);
  if (lesson.schoolId !== sid && lesson.scope !== 'global')
    return fail(403, 'This lesson belongs to another school.');
  const students = await db()
    .collection(schoolPaths.students(sid))
    .where('classId', '==', classId)
    .get();
  return {
    lesson: {
      id: lessonId,
      title: lesson.title,
      revision: lesson.revision,
      quizItemIds: lesson.steps.flatMap((step) =>
        step.kind === 'quiz' ? step.items.map((item) => item.id) : [],
      ),
    },
    students: await Promise.all(
      students.docs.map(async (d) => {
        const attempt = await db()
          .doc(schoolPaths.attempt(sid, d.id, lessonId))
          .get();
        return {
          student: { id: d.id, ...StudentDocSchema.parse(d.data()) },
          attempt: attempt.exists ? AttemptDocSchema.parse(attempt.data()) : null,
        };
      }),
    ),
  };
}
export async function hint(
  actor: StudentActor,
  id: string,
  itemId: string,
  hintIndex: number,
  revision: number,
) {
  const lesson = await studentLesson(actor, id);
  if (lesson.revision !== revision || !itemsOf(lesson).some((i) => i.id === itemId))
    return fail(409, 'Open the current lesson first.');
  const keys = await read(schoolPaths.lessonKeys(id), LessonKeysDocSchema),
    hint = keys.items[itemId]?.hints[hintIndex];
  if (!hint) return fail(404, 'No more hints for this question.');
  return { hint };
}

export async function teacherBoards(
  actor: SchoolAdminActor,
  scope: 'class' | 'school',
  period: 'week' | 'all',
  classId?: string,
) {
  const sid = await schoolId(actor);
  if (scope === 'class') {
    if (!classId) return fail(400, 'Choose a class.');
    await read(schoolPaths.schoolClass(sid, classId), SchoolClassDocSchema);
  }
  const weekKey = weekKeyDhaka(Date.now()),
    ref = scope === 'class' ? { scope, classId: classId! } : { scope };
  const snap = await db()
    .doc(schoolPaths.board(sid, boardId(ref, period === 'week' ? { weekKey } : 'all')))
    .get();
  return {
    board: snap.exists
      ? BoardDocSchema.parse(snap.data())
      : {
          scope,
          classId: classId ?? null,
          period,
          weekKey: period === 'week' ? weekKey : null,
          entries: [],
          updatedAt: Date.now(),
        },
    own: null,
  };
}

function reviewAnswer(item: QuizItem, answer: unknown): unknown {
  if (item.kind === 'mcq')
    return typeof answer === 'number' && Number.isInteger(answer) ? answer : null;
  if (item.kind === 'numeric')
    return typeof answer === 'number' || (typeof answer === 'string' && answer.length <= 100)
      ? answer
      : null;
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return null;
  if (item.kind === 'simTask')
    return Object.fromEntries(
      Object.entries(answer).filter(
        ([key, value]) =>
          item.editableParams.includes(key) &&
          ((typeof value === 'number' && Number.isFinite(value)) ||
            typeof value === 'boolean' ||
            (typeof value === 'string' && value.length <= 32)),
      ),
    );
  const parsed = z
    .object({
      reagentIds: z.array(z.string().max(64)).max(12),
      heat: z.boolean(),
      amounts: z
        .record(
          z.string().max(64),
          z.object({
            volumeMl: z.number().min(1).max(1000),
            concentrationM: z.number().min(0.001).max(5),
          }),
        )
        .optional(),
    })
    .safeParse(answer);
  return parsed.success ? parsed.data : null;
}
