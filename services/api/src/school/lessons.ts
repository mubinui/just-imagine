import { z } from 'zod';
import {
  LessonDocSchema,
  AttemptDocSchema,
  SchoolDocSchema,
  LessonFieldsSchema,
  LessonKeysDocSchema,
  missingLanguages,
  lessonPublicationChecks,
  currentAttempt,
  schoolPaths,
  SchoolClassDocSchema,
  type LessonDoc,
  type QuizItem,
  type QuizKey,
} from '@just-imagine/protocol';
import {
  SIMS,
  SimIdSchema,
  LabTaskSchema,
  checkLockedSimTask,
  gradeLabSubmission,
  type SimModel,
} from '@just-imagine/stem-sims';
import { CHAPTERS, REAGENTS, REACTIONS } from '@just-imagine/stem-content';
import type { SchoolAdminActor, StudentActor } from '@just-imagine/server-core';
import { transaction } from '@just-imagine/server-core';
import { db, newId, read, schoolId, visible, fail } from './common';
export type LessonWithId = LessonDoc & { id: string };
export const itemsOf = (l: LessonDoc): QuizItem[] =>
  l.steps.flatMap((s) => (s.kind === 'quiz' ? s.items : s.kind === 'check' ? [s.item] : []));
export const editableLessonSchema = LessonFieldsSchema.omit({
  authorUid: true,
  revision: true,
  updatedAt: true,
}).extend({
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  approved: z.object({ en: z.boolean(), bn: z.boolean() }).default({ en: false, bn: false }),
});
export const LessonWriteSchema = z.object({
  lesson: editableLessonSchema,
  keys: LessonKeysDocSchema,
  expectedRevision: z.number().int().nonnegative().optional(),
});
const modelOf = (id: string): SimModel<unknown> => SIMS[SimIdSchema.parse(id)] as SimModel<unknown>;
export function validateLesson(
  lesson: LessonDoc,
  keys: z.infer<typeof LessonKeysDocSchema>,
  publish = false,
) {
  const chapter = CHAPTERS.find((c) => c.id === lesson.chapterId);
  if (!chapter || chapter.subject !== lesson.subject)
    return fail(400, 'Choose a chapter in this subject.');
  for (const step of lesson.steps) {
    if (step.kind === 'explore') {
      const model = modelOf(step.simId);
      model.params.parse(step.params);
      if (!chapter.sims.includes(SimIdSchema.parse(step.simId)))
        return fail(400, 'This simulation is not assigned to this chapter.');
      if (step.lockedParams.some((k) => !Object.hasOwn(step.params, k)))
        return fail(400, 'A locked parameter does not exist.');
    }
    if (
      step.kind === 'lab' &&
      (!chapter.lab || step.reagentIds.some((id) => !REAGENTS.some((r) => r.id === id)))
    )
      return fail(400, 'Choose known bench reagents in a chemistry chapter.');
  }
  for (const item of itemsOf(lesson)) {
    const key = keys.items[item.id]?.key;
    if (!key) {
      if (publish) return fail(400, 'Every assessment needs an answer key.');
      continue;
    }
    if (key.kind !== item.kind) return fail(400, 'An answer key does not match its question.');
    if (key.kind === 'numeric' && key.computedFrom) {
      const source = key.computedFrom;
      if (!chapter.sims.includes(SimIdSchema.parse(source.simId)))
        return fail(400, 'Numeric reading does not belong to this chapter.');
      const model = modelOf(source.simId),
        value = model.solve(model.params.parse(source.params))[source.observable];
      if (
        typeof value !== 'number' ||
        !Number.isFinite(value) ||
        Math.abs(value - key.value) > 1e-9
      )
        return fail(400, 'Numeric answer does not match its simulation reading.');
    }
    if (item.kind === 'mcq' && key.kind === 'mcq' && key.answer >= item.options.length)
      return fail(400, 'The correct option is outside the answer choices.');
    if (item.kind === 'simTask' && key.kind === 'simTask') {
      if (!chapter.sims.includes(SimIdSchema.parse(item.simId)))
        return fail(400, 'This simulation task does not belong to this chapter.');
      const model = modelOf(item.simId);
      model.params.parse(item.startParams);
      if (item.editableParams.some((k) => !Object.hasOwn(item.startParams, k)))
        return fail(400, 'An editable simulation parameter does not exist.');
      const predicate = model.predicates[key.predicate];
      if (!predicate) return fail(400, 'Choose a registered simulation task.');
      const args = predicate.args.parse(key.args) as Record<string, unknown>;
      if (publish) {
        const initial = checkLockedSimTask(item, {}, { predicate: key.predicate, args: key.args });
        if (initial.ok && initial.met)
          return fail(400, 'The simulation task is already solved at its starting settings.');
      }
      if (
        typeof args['min'] === 'number' &&
        typeof args['max'] === 'number' &&
        args['min'] > args['max']
      )
        return fail(400, 'Task minimum cannot exceed maximum.');
      if (key.exampleAnswer !== undefined) {
        const example = checkLockedSimTask(item, key.exampleAnswer, {
          predicate: key.predicate,
          args: key.args,
        });
        if (!example.ok || !example.met)
          return fail(400, 'The example solution does not meet this simulation task.');
      }
    }
    if (item.kind === 'labTask' && key.kind === 'labTask') {
      if (!chapter.lab) return fail(400, 'Lab tasks require a chemistry chapter.');
      const task = LabTaskSchema.parse(key.task);
      if (task.predicate === 'pHBetween' && task.min > task.max)
        return fail(400, 'pH minimum cannot exceed maximum.');
      if (item.reagentIds.some((id) => !REAGENTS.some((r) => r.id === id)))
        return fail(400, 'Unknown lab reagent.');
      if (key.exampleAnswer !== undefined) {
        const answer = z
          .strictObject({
            reagentIds: z.array(z.string()).min(1).max(12),
            heat: z.boolean(),
            amounts: z
              .record(
                z.string(),
                z.strictObject({
                  volumeMl: z.number().min(1).max(1000),
                  concentrationM: z.number().min(0.001).max(5),
                }),
              )
              .optional(),
          })
          .safeParse(key.exampleAnswer);
        if (!answer.success) return fail(400, 'The example lab solution needs a valid mixture.');
        const example = gradeLabSubmission(item, answer.data, task, REAGENTS, REACTIONS);
        if (!example.ok || !example.met)
          return fail(400, 'The example solution does not meet this lab task.');
      }
    }
  }
  const ids = new Set(itemsOf(lesson).map((i) => i.id));
  if (Object.keys(keys.items).some((id) => !ids.has(id)))
    return fail(400, 'Remove answer keys without a question.');
  if (publish && !lessonPublicationChecks(lesson, keys).ready)
    return fail(400, 'Resolve the lesson publication checks before publishing.');
  if (publish && (missingLanguages(lesson).length || !lesson.approved.en || !lesson.approved.bn))
    return fail(400, 'Complete and approve both English and Bangla before publishing.');
}
export async function authorLesson(actor: SchoolAdminActor, id: string) {
  const lesson = await read(schoolPaths.lesson(id), LessonDocSchema);
  if (
    !(actor.superAdmin && lesson.scope === 'global') &&
    lesson.schoolId !== (await schoolId(actor))
  )
    return fail(403, 'This lesson belongs to another school.');
  return {
    lesson: { id, ...lesson },
    keys: await read(schoolPaths.lessonKeys(id), LessonKeysDocSchema),
  };
}
export async function listLessons(actor: SchoolAdminActor) {
  const query =
    actor.superAdmin && !actor.schoolId
      ? db().collection('lessons').where('scope', '==', 'global')
      : db()
          .collection('lessons')
          .where('schoolId', '==', await schoolId(actor));
  const snap = await query.limit(200).get();
  return { lessons: snap.docs.map((d) => ({ id: d.id, ...LessonDocSchema.parse(d.data()) })) };
}
export async function saveLesson(
  actor: SchoolAdminActor,
  input: unknown,
  id?: string,
  global = false,
  auditReason?: string,
) {
  const body = LessonWriteSchema.parse(input),
    existing = id ? await authorLesson(actor, id) : undefined,
    sid = global ? null : await schoolId(actor);
  if (existing && existing.lesson.revision !== body.expectedRevision)
    return fail(409, 'This lesson changed. Reload it before saving.');
  if (body.lesson.scope === 'global' && !global)
    return fail(403, 'Only the operator publishes global lessons.');
  const nextId = id ?? newId('w');
  const scope = global ? 'global' : body.lesson.scope === 'class' ? 'class' : 'school';
  // Provenance is server-owned once a lesson exists; an omitted or undefined value is never stored.
  const { copiedFrom: requestedCopiedFrom, ...fields } = body.lesson;
  const copiedFrom = existing ? existing.lesson.copiedFrom : requestedCopiedFrom;
  const lesson = LessonDocSchema.parse({
    ...fields,
    ...(copiedFrom ? { copiedFrom } : {}),
    scope,
    schoolId: sid,
    classIds: scope === 'class' ? body.lesson.classIds : [],
    authorUid: existing?.lesson.authorUid ?? actor.uid,
    status: body.lesson.status === 'archived' ? 'archived' : 'draft',
    revision: existing ? existing.lesson.revision + 1 : 0,
    updatedAt: Date.now(),
    approved: { en: false, bn: false },
  });
  for (const cid of lesson.classIds) {
    const c = await read(schoolPaths.schoolClass(sid!, cid), SchoolClassDocSchema);
    if (c.grade !== lesson.grade) return fail(400, 'Lesson and class grades must match.');
  }
  const keys = LessonKeysDocSchema.parse({ ...body.keys, revision: lesson.revision });
  validateLesson(lesson, keys);
  await transaction(async (tx) => {
    const ref = db().doc(schoolPaths.lesson(nextId)),
      snap = await tx.get(ref);
    if (
      sid &&
      SchoolDocSchema.parse((await tx.get(db().doc(schoolPaths.school(sid)))).data()).status !==
        'active'
    )
      return fail(403, 'This school is paused.');
    if (existing && (!snap.exists || snap.get('revision') !== body.expectedRevision))
      return fail(409, 'This lesson changed. Reload it before saving.');
    tx.set(ref, lesson);
    tx.set(db().doc(schoolPaths.lessonKeys(nextId)), keys);
    if (global)
      lessonAudit(tx, actor, nextId, existing?.lesson ?? null, lesson, auditReason!, 'lesson.save');
  });
  return { lesson: { id: nextId, ...lesson }, keys };
}
export async function approveLesson(
  actor: SchoolAdminActor,
  id: string,
  language: 'en' | 'bn',
  expected: number,
  auditReason?: string,
) {
  const { lesson, keys } = await authorLesson(actor, id);
  if (lesson.revision !== expected)
    return fail(409, 'This lesson changed. Reload it before continuing.');
  if (missingLanguages(lesson).includes(language))
    return fail(400, 'Complete every field in this language first.');
  if (
    lessonPublicationChecks(lesson, keys).issues.some(
      (issue) => issue.severity === 'error' && (!issue.language || issue.language === language),
    )
  )
    return fail(400, 'Resolve the lesson publication checks before approving.');
  return mutateLesson(
    actor,
    id,
    expected,
    { approved: { ...lesson.approved, [language]: true } },
    keys,
    auditReason,
  );
}
async function mutateLesson(
  actor: SchoolAdminActor,
  id: string,
  expected: number,
  change: Partial<LessonDoc>,
  keys?: z.infer<typeof LessonKeysDocSchema>,
  auditReason?: string,
  action = 'lesson.approve',
) {
  const { lesson } = await authorLesson(actor, id);
  if (lesson.revision !== expected)
    return fail(409, 'This lesson changed. Reload it before continuing.');
  return transaction(async (tx) => {
    const ref = db().doc(schoolPaths.lesson(id)),
      snap = await tx.get(ref);
    const current = LessonDocSchema.parse(snap.data());
    if (
      current.schoolId &&
      SchoolDocSchema.parse((await tx.get(db().doc(schoolPaths.school(current.schoolId)))).data())
        .status !== 'active'
    )
      return fail(403, 'This school is paused.');
    if (snap.get('revision') !== expected)
      return fail(409, 'This lesson changed. Reload it before continuing.');
    const lesson = LessonDocSchema.parse({
      ...snap.data(),
      ...change,
      revision: expected + 1,
      updatedAt: Date.now(),
    });
    tx.set(ref, lesson);
    if (auditReason) lessonAudit(tx, actor, id, current, lesson, auditReason, action);
    if (keys) tx.set(db().doc(schoolPaths.lessonKeys(id)), { ...keys, revision: lesson.revision });
    else tx.update(db().doc(schoolPaths.lessonKeys(id)), { revision: lesson.revision });
    return { lesson: { id, ...lesson } };
  });
}
export async function publishLesson(
  actor: SchoolAdminActor,
  id: string,
  expected: number,
  auditReason?: string,
) {
  const { lesson, keys } = await authorLesson(actor, id);
  if (lesson.revision !== expected)
    return fail(409, 'This lesson changed. Reload it before continuing.');
  validateLesson(lesson, keys, true);
  return mutateLesson(
    actor,
    id,
    expected,
    { status: 'published' },
    keys,
    auditReason,
    'lesson.publish',
  );
}
export async function copyLesson(actor: SchoolAdminActor, id: string) {
  const source = await read(schoolPaths.lesson(id), LessonDocSchema);
  if (source.scope !== 'global' || source.status !== 'published')
    return fail(404, 'Published global lesson not found.');
  const copies = await db()
    .collection('lessons')
    .where('schoolId', '==', await schoolId(actor))
    .where('copiedFrom', '==', id)
    .limit(5)
    .get();
  if (copies.docs.some((d) => d.get('status') !== 'archived'))
    return fail(
      409,
      'This shared lesson is already in your school lessons. Open your copy instead.',
    );
  return saveLesson(actor, {
    lesson: { ...source, scope: 'school', status: 'draft', copiedFrom: id },
    keys: await read(schoolPaths.lessonKeys(id), LessonKeysDocSchema),
  });
}
export async function studentLesson(actor: StudentActor, id: string) {
  const lesson = await read(schoolPaths.lesson(id), LessonDocSchema);
  if (!visible(lesson, actor)) return fail(404, 'This lesson is not available to your class.');
  return { id, ...lesson };
}
export async function studentLessons(actor: StudentActor) {
  const collection = db().collection('lessons');
  const [global, school, ownClass, attempts] = await Promise.all([
    collection.where('scope', '==', 'global').where('status', '==', 'published').get(),
    collection
      .where('scope', '==', 'school')
      .where('schoolId', '==', actor.schoolId)
      .where('status', '==', 'published')
      .get(),
    collection
      .where('scope', '==', 'class')
      .where('schoolId', '==', actor.schoolId)
      .where('classIds', 'array-contains', actor.classId)
      .where('status', '==', 'published')
      .get(),
    db()
      .collection(schoolPaths.attempts(actor.schoolId))
      .where('studentId', '==', actor.studentId)
      .get(),
  ]);
  const lessons = [global, school, ownClass].flatMap((s) =>
      s.docs.map((d) => ({ id: d.id, ...LessonDocSchema.parse(d.data()) })),
    ),
    ids = new Set(lessons.map((l) => l.id));
  return {
    lessons,
    attemptsByLesson: Object.fromEntries(
      attempts.docs
        .map((d) => AttemptDocSchema.parse(d.data()))
        .filter((a) => ids.has(a.lessonId))
        .map((a) => [
          a.lessonId,
          currentAttempt(a, lessons.find((lesson) => lesson.id === a.lessonId)!.revision),
        ]),
    ),
  };
}
export function keyFor(item: QuizItem, key: QuizKey) {
  if (item.kind !== key.kind) return fail(400, 'Question key mismatch.');
  return key;
}

export async function archiveLesson(
  actor: SchoolAdminActor,
  id: string,
  expected: number,
  auditReason?: string,
) {
  return mutateLesson(
    actor,
    id,
    expected,
    { status: 'archived' },
    undefined,
    auditReason,
    'lesson.archive',
  );
}

function lessonAudit(
  tx: FirebaseFirestore.Transaction,
  actor: SchoolAdminActor,
  id: string,
  before: LessonDoc | null,
  after: LessonDoc,
  reason: string,
  action: string,
) {
  if (!reason) return fail(400, 'An operator reason is required.');
  tx.create(db().doc('adminAudit/' + newId('j')), {
    actorUid: actor.uid,
    actorEmail: actor.email,
    action,
    target: { kind: 'lesson', id },
    before: before ? { revision: before.revision, status: before.status } : null,
    after: { revision: after.revision, status: after.status },
    reason,
    at: Date.now(),
  });
}
