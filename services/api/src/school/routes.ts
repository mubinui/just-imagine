import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  DocumentIdSchema,
  LanguageSchema,
  SchoolDocSchema,
  SchoolClassDocSchema,
  StudentDocSchema,
  AttemptDocSchema,
  schoolPaths,
} from '@just-imagine/protocol';
import {
  isSchoolSuspended,
  requireSchoolAdmin,
  requireStudent,
  SchoolRoleRequiredError,
  type SchoolAdminActor,
  type StudentActor,
} from '@just-imagine/server-core';
import { ApiFault } from '../errors';
import { db, newId, read, schoolId, fail } from './common';
import { login, acceptInvite } from './login';
import {
  ClassBodySchema,
  createStudents,
  parseCsv,
  listStudents,
  updateStudent,
  resetPin,
  deleteStudent,
} from './roster';
import {
  listLessons,
  authorLesson,
  saveLesson,
  approveLesson,
  publishLesson,
  copyLesson,
  archiveLesson,
  studentLesson,
  studentLessons,
} from './lessons';
import { draftLesson, translateLesson } from './authoring';
import { grade, boards, results, hint, teacherBoards } from './grading';
import { react } from './chemistry';
import type { SchoolModel } from './ai';
declare module 'fastify' {
  interface FastifyRequest {
    schoolActor: SchoolAdminActor | null;
    studentActor: StudentActor | null;
  }
}
export interface SchoolRouteOptions {
  verifySchoolAdmin?: (idToken: string, schoolId?: string) => Promise<SchoolAdminActor>;
  verifyStudent?: (idToken: string) => Promise<StudentActor>;
  isSchoolSuspended?: (schoolId: string) => Promise<boolean>;
  model?: SchoolModel;
}
function bearer(req: FastifyRequest) {
  const value = req.headers.authorization;
  if (!value?.startsWith('Bearer '))
    throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return value.slice(7);
}
function roleFault(error: unknown, forbidden: string) {
  return error instanceof SchoolRoleRequiredError
    ? new ApiFault(403, 'FORBIDDEN', forbidden)
    : new ApiFault(401, 'UNAUTHENTICATED', 'Sign in again to continue.');
}
export function schoolActor(req: FastifyRequest): SchoolAdminActor {
  if (!req.schoolActor) throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return req.schoolActor;
}
export function studentActor(req: FastifyRequest): StudentActor {
  if (!req.studentActor) throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return req.studentActor;
}
const id = (p: unknown) => z.object({ id: DocumentIdSchema }).parse(p).id;
const revision = (body: unknown) =>
  z.object({ expectedRevision: z.number().int().nonnegative() }).parse(body).expectedRevision;
export function registerSchoolRoutes(app: FastifyInstance, options: SchoolRouteOptions = {}) {
  const verifyTeacher = options.verifySchoolAdmin ?? requireSchoolAdmin,
    verifyPupil = options.verifyStudent ?? requireStudent,
    suspended = options.isSchoolSuspended ?? isSchoolSuspended;
  app.post('/v1/study/login', { bodyLimit: 2048 }, (req) => login(req.body));
  app.post('/v1/school/invites/accept', (req) =>
    acceptInvite(z.object({ token: z.string().max(500) }).parse(req.body).token, bearer(req)),
  );
  app.register(async (routes) => {
    routes.decorateRequest('schoolActor', null);
    routes.addHook('preHandler', async (req) => {
      const { schoolId } = z
        .object({ schoolId: DocumentIdSchema.optional() })
        .parse(req.query ?? {});
      try {
        req.schoolActor = await verifyTeacher(bearer(req), schoolId);
      } catch (e) {
        throw roleFault(e, 'This account is not a school administrator.');
      }
      if (
        req.method !== 'GET' &&
        req.schoolActor.schoolId &&
        (await suspended(req.schoolActor.schoolId))
      )
        return fail(403, 'Your school is paused. You can still read its records.');
    });
    routes.get('/v1/school/me', async (req) => {
      const actor = schoolActor(req);
      if (!actor.schoolId) return actor;
      const snap = await db().doc(schoolPaths.school(actor.schoolId)).get();
      return {
        uid: actor.uid,
        schoolId: actor.schoolId,
        superAdmin: actor.superAdmin,
        ...(snap.exists ? { school: { id: snap.id, ...SchoolDocSchema.parse(snap.data()) } } : {}),
      };
    });
    routes.get('/v1/school/classes', async (req) => {
      const sid = await schoolId(schoolActor(req)),
        snap = await db().collection(schoolPaths.classes(sid)).get();
      return {
        classes: snap.docs.map((d) => ({ id: d.id, ...SchoolClassDocSchema.parse(d.data()) })),
      };
    });
    routes.post('/v1/school/classes', async (req) => {
      const sid = await schoolId(schoolActor(req)),
        cid = newId('c'),
        value = SchoolClassDocSchema.parse({
          ...ClassBodySchema.parse(req.body),
          createdAt: Date.now(),
        });
      await db().runTransaction(async (tx) => {
        if (
          SchoolDocSchema.parse((await tx.get(db().doc(schoolPaths.school(sid)))).data()).status !==
          'active'
        )
          return fail(403, 'This school is paused.');
        tx.create(db().doc(schoolPaths.schoolClass(sid, cid)), value);
      });
      return { class: { id: cid, ...value } };
    });
    routes.patch('/v1/school/classes/:id', async (req) => {
      const sid = await schoolId(schoolActor(req)),
        cid = id(req.params),
        body = ClassBodySchema.partial().parse(req.body);
      return db().runTransaction(async (tx) => {
        const ref = db().doc(schoolPaths.schoolClass(sid, cid));
        const [snap, school] = await Promise.all([
          tx.get(ref),
          tx.get(db().doc(schoolPaths.school(sid))),
        ]);
        if (!snap.exists) return fail(404, 'Class not found.');
        if (SchoolDocSchema.parse(school.data()).status !== 'active')
          return fail(403, 'This school is paused.');
        const value = SchoolClassDocSchema.parse({ ...snap.data(), ...body });
        tx.set(ref, value);
        return { class: { id: cid, ...value } };
      });
    });
    routes.delete('/v1/school/classes/:id', async (req) => {
      const sid = await schoolId(schoolActor(req)),
        cid = id(req.params);
      await db().runTransaction(async (tx) => {
        const [students, school] = await Promise.all([
          tx.get(db().collection(schoolPaths.students(sid)).where('classId', '==', cid)),
          tx.get(db().doc(schoolPaths.school(sid))),
        ]);
        if (SchoolDocSchema.parse(school.data()).status !== 'active')
          return fail(403, 'This school is paused.');
        if (!students.empty) return fail(409, 'Move or delete this class’s students first.');
        tx.delete(db().doc(schoolPaths.schoolClass(sid, cid)));
      });
      return { ok: true };
    });
    routes.get('/v1/school/students', (req) =>
      listStudents(
        schoolActor(req),
        z.object({ classId: DocumentIdSchema.optional() }).parse(req.query).classId,
      ),
    );
    routes.post(
      '/v1/school/students',
      async (req) => (await createStudents(schoolActor(req), [req.body])).students[0],
    );
    routes.post('/v1/school/students/import', { bodyLimit: 262144 }, (req) =>
      createStudents(
        schoolActor(req),
        parseCsv(z.object({ csv: z.string().max(250000) }).parse(req.body).csv),
      ),
    );
    routes.patch('/v1/school/students/:id', (req) =>
      updateStudent(schoolActor(req), id(req.params), req.body),
    );
    routes.delete('/v1/school/students/:id', (req) =>
      deleteStudent(schoolActor(req), id(req.params)),
    );
    routes.post('/v1/school/students/:id/reset-pin', (req) =>
      resetPin(schoolActor(req), id(req.params)),
    );
    routes.get('/v1/school/lessons', (req) =>
      z.object({ scope: z.literal('global').optional() }).parse(req.query).scope === 'global'
        ? db()
            .collection('lessons')
            .where('scope', '==', 'global')
            .where('status', '==', 'published')
            .get()
            .then((s) => ({ lessons: s.docs.map((d) => ({ id: d.id, ...d.data() })) }))
        : listLessons(schoolActor(req)),
    );
    routes.post('/v1/school/lessons', (req) => saveLesson(schoolActor(req), req.body));
    routes.get('/v1/school/lessons/:id', (req) => authorLesson(schoolActor(req), id(req.params)));
    routes.patch('/v1/school/lessons/:id', (req) =>
      saveLesson(schoolActor(req), req.body, id(req.params)),
    );
    routes.post('/v1/school/lessons/:id/draft', (req) =>
      draftLesson(schoolActor(req), id(req.params), req.body, options.model),
    );
    routes.post('/v1/school/lessons/:id/translate', (req) =>
      translateLesson(
        schoolActor(req),
        id(req.params),
        z.object({ targetLanguage: z.enum(['en', 'bn']) }).parse(req.body).targetLanguage,
        options.model,
      ),
    );
    routes.post('/v1/school/lessons/:id/approve', (req) =>
      approveLesson(
        schoolActor(req),
        id(req.params),
        z.object({ language: z.enum(['en', 'bn']) }).parse(req.body).language,
        revision(req.body),
      ),
    );
    routes.post('/v1/school/lessons/:id/publish', (req) =>
      publishLesson(schoolActor(req), id(req.params), revision(req.body)),
    );
    routes.post('/v1/school/lessons/:id/archive', (req) =>
      archiveLesson(schoolActor(req), id(req.params), revision(req.body)),
    );
    routes.post('/v1/school/lessons/:id/copy', (req) =>
      copyLesson(schoolActor(req), id(req.params)),
    );
    routes.get('/v1/school/boards', (req) => {
      const q = z
        .object({
          scope: z.enum(['class', 'school']).default('class'),
          period: z.enum(['week', 'all']).default('week'),
          classId: DocumentIdSchema.optional(),
        })
        .parse(req.query);
      return teacherBoards(schoolActor(req), q.scope, q.period, q.classId);
    });
    routes.get('/v1/school/results', (req) => {
      const q = z
        .object({ classId: DocumentIdSchema, lessonId: DocumentIdSchema })
        .parse(req.query);
      return results(schoolActor(req), q.classId, q.lessonId);
    });
  });
  app.register(async (routes) => {
    routes.decorateRequest('studentActor', null);
    routes.addHook('preHandler', async (req) => {
      try {
        req.studentActor = await verifyPupil(bearer(req));
      } catch (e) {
        throw roleFault(e, 'This is not a student account.');
      }
      if (await suspended(req.studentActor.schoolId))
        return fail(403, 'Your school is paused right now. Please ask your teacher.');
    });
    routes.get('/v1/study/me', async (req) => {
      const actor = studentActor(req),
        snap = await db().doc(schoolPaths.student(actor.schoolId, actor.studentId)).get();
      if (!snap.exists) return actor;
      return {
        ...actor,
        student: { id: snap.id, ...StudentDocSchema.parse(snap.data()) },
        school: {
          id: actor.schoolId,
          ...(await read(schoolPaths.school(actor.schoolId), SchoolDocSchema)),
        },
        class: {
          id: actor.classId,
          ...(await read(
            schoolPaths.schoolClass(actor.schoolId, actor.classId),
            SchoolClassDocSchema,
          )),
        },
      };
    });
    routes.patch('/v1/study/me', async (req) => {
      const actor = studentActor(req),
        body = z.object({ language: LanguageSchema }).parse(req.body);
      return db().runTransaction(async (tx) => {
        const ref = db().doc(schoolPaths.student(actor.schoolId, actor.studentId));
        const [snap, school] = await Promise.all([
          tx.get(ref),
          tx.get(db().doc(schoolPaths.school(actor.schoolId))),
        ]);
        if (!snap.exists || SchoolDocSchema.parse(school.data()).status !== 'active')
          return fail(403, 'Your school is paused.');
        const student = StudentDocSchema.parse({ ...snap.data(), language: body.language });
        if (student.classId !== actor.classId)
          return fail(403, 'Your class changed. Sign in again.');
        tx.set(ref, student);
        return { student: { id: actor.studentId, ...student } };
      });
    });
    routes.get('/v1/study/lessons', (req) => studentLessons(studentActor(req)));
    routes.get('/v1/study/lessons/:id', async (req) => {
      const actor = studentActor(req),
        lessonId = id(req.params),
        lesson = await studentLesson(actor, lessonId),
        snap = await db()
          .doc(schoolPaths.attempt(actor.schoolId, actor.studentId, lessonId))
          .get();
      return { lesson, attempt: snap.exists ? AttemptDocSchema.parse(snap.data()) : null };
    });
    routes.post('/v1/study/lessons/:id/check', (req) =>
      grade(studentActor(req), id(req.params), req.body, false),
    );
    routes.post('/v1/study/lessons/:id/quiz', (req) =>
      grade(studentActor(req), id(req.params), req.body, true),
    );
    routes.post('/v1/study/lessons/:id/hint', (req) => {
      const b = z
        .object({
          itemId: z.string(),
          hintIndex: z.number().int().min(0).max(1),
          revision: z.number().int().nonnegative(),
        })
        .parse(req.body);
      return hint(studentActor(req), id(req.params), b.itemId, b.hintIndex, b.revision);
    });
    routes.get('/v1/study/boards', (req) => {
      const q = z
        .object({
          scope: z.enum(['class', 'school']).default('class'),
          period: z.enum(['week', 'all']).default('week'),
        })
        .parse(req.query);
      return boards(studentActor(req), q.scope, q.period);
    });
    routes.post('/v1/study/react', (req) => react(studentActor(req), req.body, options.model));
  });
}
