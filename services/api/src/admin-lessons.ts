import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DocumentIdSchema } from '@just-imagine/protocol';
import { adminActor } from './admin-schools';
import {
  authorLesson,
  listLessons,
  saveLesson,
  approveLesson,
  publishLesson,
  archiveLesson,
} from './school/lessons';
import { assistLessonText, draftLesson, translateLesson } from './school/authoring';
import { generateLab } from './school/lab-generation';
import { reasonSchema } from './school/common';
export function registerAdminLessonRoutes(app: FastifyInstance) {
  app.register(async (routes) => {
    routes.addHook('preHandler', async (req) => {
      await adminActor(req);
    });
    const id = (p: unknown) => z.object({ id: DocumentIdSchema }).parse(p).id;
    const mutation = z.object({
      expectedRevision: z.number().int().nonnegative(),
      reason: reasonSchema,
    });
    routes.get('/v1/admin/lessons', async (req) => listLessons(await adminActor(req)));
    routes.get('/v1/admin/lessons/:id', async (req) =>
      authorLesson(await adminActor(req), id(req.params)),
    );
    routes.post('/v1/admin/lessons', async (req) =>
      saveLesson(
        await adminActor(req),
        req.body,
        undefined,
        true,
        z.object({ reason: reasonSchema }).parse(req.body).reason,
      ),
    );
    routes.post('/v1/admin/lesson-text/assist', async (req) => {
      z.object({ reason: reasonSchema }).parse(req.body);
      return assistLessonText(await adminActor(req), req.body);
    });
    routes.post('/v1/admin/lab/generate', async (req) => {
      z.object({ reason: reasonSchema }).parse(req.body);
      return generateLab(await adminActor(req), req.body);
    });
    routes.patch('/v1/admin/lessons/:id', async (req) =>
      saveLesson(
        await adminActor(req),
        req.body,
        id(req.params),
        true,
        z.object({ reason: reasonSchema }).parse(req.body).reason,
      ),
    );
    routes.post('/v1/admin/lessons/:id/approve', async (req) => {
      const b = mutation.extend({ language: z.enum(['en', 'bn']) }).parse(req.body);
      return approveLesson(
        await adminActor(req),
        id(req.params),
        b.language,
        b.expectedRevision,
        b.reason,
      );
    });
    routes.post('/v1/admin/lessons/:id/publish', async (req) => {
      const b = mutation.parse(req.body);
      return publishLesson(await adminActor(req), id(req.params), b.expectedRevision, b.reason);
    });
    routes.post('/v1/admin/lessons/:id/archive', async (req) => {
      const b = mutation.parse(req.body);
      return archiveLesson(await adminActor(req), id(req.params), b.expectedRevision, b.reason);
    });
    routes.post('/v1/admin/lessons/:id/draft', async (req) => {
      reasonSchema.parse((req.body as Record<string, unknown>)['reason']);
      return draftLesson(await adminActor(req), id(req.params), req.body);
    });
    routes.post('/v1/admin/lessons/:id/translate', async (req) => {
      const b = z
        .object({ targetLanguage: z.enum(['en', 'bn']), reason: reasonSchema })
        .parse(req.body);
      return translateLesson(await adminActor(req), id(req.params), b.targetLanguage);
    });
  });
}
