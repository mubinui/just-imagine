import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { DocumentIdSchema, SCHOOL_ROUTES, STUDY_ROUTES } from '@just-imagine/protocol';
import {
  isSchoolSuspended,
  requireSchoolAdmin,
  requireStudent,
  SchoolRoleRequiredError,
  type SchoolAdminActor,
  type StudentActor,
} from '@just-imagine/server-core';
import { ApiFault } from '../errors';

declare module 'fastify' {
  interface FastifyRequest {
    schoolActor: SchoolAdminActor | null;
    studentActor: StudentActor | null;
  }
}

/** Injectable for tests; defaults verify Firebase ID tokens and read Firestore. */
export interface SchoolRouteOptions {
  verifySchoolAdmin?: (idToken: string, schoolId?: string) => Promise<SchoolAdminActor>;
  verifyStudent?: (idToken: string) => Promise<StudentActor>;
  isSchoolSuspended?: (schoolId: string) => Promise<boolean>;
}

const SchoolQuerySchema = z.object({ schoolId: DocumentIdSchema.optional() });

function bearer(req: FastifyRequest): string {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return header.slice(7);
}

function roleFault(error: unknown, forbidden: string): ApiFault {
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

/**
 * Teacher routes (`/v1/school/*`) and student routes (`/v1/study/*`), each in its own
 * encapsulated scope so their guards never touch parent or admin routes. A super admin may
 * use teacher routes inside any school by passing `?schoolId=`.
 */
export function registerSchoolRoutes(app: FastifyInstance, options: SchoolRouteOptions = {}) {
  const verifySchoolAdmin = options.verifySchoolAdmin ?? requireSchoolAdmin;
  const verifyStudent = options.verifyStudent ?? requireStudent;
  const suspended = options.isSchoolSuspended ?? isSchoolSuspended;

  app.register(async (routes) => {
    routes.decorateRequest('schoolActor', null);
    routes.addHook('preHandler', async (req) => {
      const token = bearer(req);
      const { schoolId } = SchoolQuerySchema.parse(req.query ?? {});
      try {
        req.schoolActor = await verifySchoolAdmin(token, schoolId);
      } catch (error) {
        throw roleFault(error, 'This account is not a school administrator.');
      }
    });
    routes.get(SCHOOL_ROUTES.me.path, (req) => {
      const actor = schoolActor(req);
      return { uid: actor.uid, schoolId: actor.schoolId, superAdmin: actor.superAdmin };
    });
  });

  app.register(async (routes) => {
    routes.decorateRequest('studentActor', null);
    routes.addHook('preHandler', async (req) => {
      const token = bearer(req);
      try {
        req.studentActor = await verifyStudent(token);
      } catch (error) {
        throw roleFault(error, 'This is not a student account.');
      }
      if (await suspended(req.studentActor.schoolId))
        throw new ApiFault(
          403,
          'FORBIDDEN',
          'Your school is paused right now. Please ask your teacher.',
        );
    });
    routes.get(STUDY_ROUTES.me.path, (req) => {
      const s = studentActor(req);
      return { uid: s.uid, schoolId: s.schoolId, studentId: s.studentId, classId: s.classId };
    });
  });
}
