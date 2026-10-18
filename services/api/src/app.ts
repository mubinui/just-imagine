import Fastify from 'fastify';
import type { ContentEditions } from '@just-imagine/server-core';
import {
  LanguageSchema,
  paths,
  contentTexts,
  textUsesLanguage,
  type Language,
  type ContentKind,
} from '@just-imagine/protocol';
import { FirestoreStoryStore, storyRoutes } from './stories';
import cors from '@fastify/cors';
import { z } from 'zod';
import {
  CreateChildBodySchema,
  CreateCompanionBodySchema,
  UpdateChildBodySchema,
  CheckoutBodySchema,
  DocumentIdSchema,
} from '@just-imagine/protocol';
import { ApiFault } from './errors';
import type { CompanionService } from './companion';
import type { ApiStore } from './store';
import { registerAdminRoutes, suspensionCheckFor, type AdminRouteOptions } from './admin';
import { FirestoreLearnStore, learnRoutes, type LearnStore } from './learn';
import { registerSchoolRoutes, type SchoolRouteOptions } from './school/routes';
import { registerAdminSchoolRoutes } from './admin-schools';
import { registerAdminCatalogRoutes } from './admin-catalog';
import { registerAdminLessonRoutes } from './admin-lessons';
import { catalogRoutes } from './catalog';

export interface Billing {
  /** `stripe` takes real (test-mode) payments; `no-payment` starts plans without one. */
  readonly mode: 'stripe' | 'no-payment';
  checkout(uid: string): Promise<{ url: string }>;
  portal(uid: string): Promise<{ url: string }>;
  webhook(raw: Buffer, signature: string): Promise<void>;
  cancel(uid: string): Promise<void>;
}
export interface ApiOptions {
  store: ApiStore;
  verifyToken(token: string): Promise<{ uid: string }>;
  billing?: Billing;
  companion?: CompanionService;
  /** Super admin routes (`/v1/admin/*`); defaults use Firestore and the admin claim. */
  admin?: AdminRouteOptions;
  /** Refuses parent routes for suspended accounts; defaults to Firestore when the store is. */
  isSuspended?: (uid: string) => Promise<boolean>;
  learn?: LearnStore;
  stories?: FirestoreStoryStore;
  editions?: ContentEditions;
  /** Teacher (`/v1/school/*`) and student (`/v1/study/*`) routes; defaults use Firebase. */
  school?: SchoolRouteOptions;
  origins: string[];
}
export function createApi(options: ApiOptions) {
  const app = Fastify({ bodyLimit: 64 * 1024, logger: false });
  app.register(cors, {
    origin: options.origins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    credentials: true,
  });
  app.get('/health', async () => ({ ok: true }));
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ApiFault)
      return reply
        .status(error.status)
        .send({ error: { code: error.code, message: error.message } });
    if (
      error instanceof z.ZodError ||
      (typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        error.statusCode === 400)
    )
      return reply.status(400).send({
        error: {
          code: 'INVALID_ARGUMENT',
          message: 'Check the supplied information and try again.',
        },
      });
    return reply
      .status(500)
      .send({ error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
  });
  app.register(async (routes) => {
    routes.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) =>
      done(null, body),
    );
    routes.post('/v1/billing/webhook', async (req, reply) => {
      if (!options.billing) throw new ApiFault(503, 'INTERNAL', 'Billing is not configured yet.');
      const signature = req.headers['stripe-signature'];
      if (typeof signature !== 'string')
        throw new ApiFault(400, 'INVALID_ARGUMENT', 'Missing payment signature.');
      await options.billing.webhook(req.body as Buffer, signature);
      return reply.send({ received: true });
    });
  });
  registerAdminRoutes(
    app,
    { store: options.store, billingConfigured: Boolean(options.billing) },
    options.admin,
  );
  registerSchoolRoutes(app, options.school);
  registerAdminSchoolRoutes(app);
  registerAdminCatalogRoutes(app);
  registerAdminLessonRoutes(app);
  const isSuspended = options.isSuspended ?? suspensionCheckFor(options.store);
  app.register(async (routes) => {
    routes.decorateRequest('parentUid', '');
    routes.addHook('preHandler', async (req, reply) => {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer '))
        throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in to continue.');
      try {
        req.parentUid = (await options.verifyToken(header.slice(7))).uid;
      } catch {
        throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in again to continue.');
      }
      if (await isSuspended?.(req.parentUid))
        return reply.status(403).send({
          error: {
            code: 'ACCOUNT_SUSPENDED',
            message: 'This account is paused. Please contact support.',
          },
        });
    });
    const id = (params: unknown, key: string) =>
      DocumentIdSchema.parse(z.record(z.string(), z.unknown()).parse(params)[key]);
    routes.get('/v1/me', async (req) => ({
      ...(await options.store.me(req.parentUid)),
      billing: options.billing?.mode ?? 'off',
    }));
    routes.post('/v1/children', async (req, reply) =>
      reply
        .status(201)
        .send(
          await options.store.createChild(req.parentUid, CreateChildBodySchema.parse(req.body)),
        ),
    );
    routes.post('/v1/children/:childId/companion', { bodyLimit: 5700000 }, async (req) => {
      const input = CreateCompanionBodySchema.parse(req.body);
      if (!options.companion)
        throw new ApiFault(
          503,
          'INTERNAL',
          'Photo companions are not connected yet. Choose a ready-made friend for now.',
        );
      return options.companion.create(req.parentUid, id(req.params, 'childId'), input);
    });
    routes.patch('/v1/children/:childId', (req) =>
      options.store.updateChild(
        req.parentUid,
        id(req.params, 'childId'),
        UpdateChildBodySchema.parse(req.body),
      ),
    );
    routes.delete('/v1/children/:childId', async (req, reply) => {
      await options.store.deleteChild(req.parentUid, id(req.params, 'childId'));
      return reply.status(204).send();
    });
    const selectedLanguage = (headers: Record<string, unknown>): Language | undefined =>
      headers['x-app-language'] === undefined
        ? undefined
        : LanguageSchema.parse(headers['x-app-language']);
    const edition = async <T>(
      uid: string,
      language: Language | undefined,
      kind: ContentKind,
      path: string,
      childId: string,
      value: T,
    ): Promise<T> => {
      if (!language) return value;
      if (!options.editions) {
        if (contentTexts(kind, value).every((entry) => textUsesLanguage(entry.text, language)))
          return value;
        throw new ApiFault(
          503,
          'INTERNAL',
          'This language edition is not ready. Please try again shortly.',
        );
      }
      try {
        return await options.editions.apply({ uid, childId, kind, path }, language, value);
      } catch {
        throw new ApiFault(
          503,
          'INTERNAL',
          'This language edition is not ready. Please try again shortly.',
        );
      }
    };
    routes.get('/v1/children/:childId/worlds', async (req) => {
      const childId = id(req.params, 'childId'),
        language = selectedLanguage(req.headers);
      const result = await options.store.listWorlds(req.parentUid, childId);
      if (!language) return result;
      if (!options.editions) {
        if (result.worlds.every((world) => textUsesLanguage(world.title, language))) return result;
        throw new ApiFault(
          503,
          'INTERNAL',
          'This language edition is not ready. Please try again shortly.',
        );
      }
      return {
        worlds: await Promise.all(
          result.worlds.map(async (summary) => {
            const canonical = await options.store.getWorld(req.parentUid, summary.id);
            const localized = await edition(
              req.parentUid,
              language,
              'world',
              paths.world(summary.id),
              childId,
              canonical,
            );
            return { ...summary, title: localized.title };
          }),
        ),
      };
    });
    routes.get('/v1/children/:childId/sessions', async (req) => {
      const childId = id(req.params, 'childId'),
        result = await options.store.listSessions(req.parentUid, childId);
      return {
        sessions: await Promise.all(
          result.sessions.map((value) =>
            edition(
              req.parentUid,
              selectedLanguage(req.headers),
              'session',
              paths.session(value.id),
              childId,
              value,
            ),
          ),
        ),
      };
    });
    routes.get('/v1/children/:childId/discoveries', async (req) => {
      const childId = id(req.params, 'childId'),
        result = await options.store.listDiscoveries(req.parentUid, childId);
      return {
        discoveries: await Promise.all(
          result.discoveries.map((value) =>
            edition(
              req.parentUid,
              selectedLanguage(req.headers),
              'discovery',
              paths.discovery(req.parentUid, childId, value.concept),
              childId,
              value,
            ),
          ),
        ),
      };
    });
    routes.get('/v1/worlds/:worldId', async (req) => {
      const worldId = id(req.params, 'worldId'),
        value = await options.store.getWorld(req.parentUid, worldId);
      return edition(
        req.parentUid,
        selectedLanguage(req.headers),
        'world',
        paths.world(worldId),
        value.childId,
        value,
      );
    });
    routes.post('/v1/worlds/:worldId/text-edition', async (req) => {
      const worldId = id(req.params, 'worldId'),
        value = await options.store.getWorld(req.parentUid, worldId);
      const body = z
        .strictObject({
          language: LanguageSchema,
          texts: z.array(z.string().trim().min(1).max(1000)).min(1).max(16),
        })
        .parse(req.body);
      if (!options.editions) throw new ApiFault(503, 'INTERNAL', 'Translation is unavailable.');
      try {
        return {
          texts: await options.editions.runtime(
            {
              kind: 'world',
              path: paths.world(worldId),
              uid: req.parentUid,
              childId: value.childId,
            },
            body.language,
            body.texts,
          ),
        };
      } catch {
        throw new ApiFault(
          503,
          'INTERNAL',
          'This language edition is not ready. Please try again shortly.',
        );
      }
    });
    routes.delete('/v1/worlds/:worldId', async (req, reply) => {
      await options.store.deleteWorld(req.parentUid, id(req.params, 'worldId'));
      return reply.status(204).send();
    });
    routes.get('/v1/usage/today', (req) => options.store.usageToday(req.parentUid));
    learnRoutes(routes, options.learn ?? new FirestoreLearnStore());
    catalogRoutes(routes);
    storyRoutes(routes, options.stories ?? new FirestoreStoryStore(), options.editions);
    routes.post('/v1/me/delete', async (req, reply) => {
      const me = await options.store.me(req.parentUid);
      if (me.user.stripeCustomerId && !options.billing)
        throw new ApiFault(503, 'INTERNAL', 'Billing must be available to close this account.');
      await options.store.deleteAccountData(req.parentUid);
      return reply.status(202).send({ accepted: true });
    });
    routes.post('/v1/billing/checkout', async (req) => {
      CheckoutBodySchema.parse(req.body);
      if (!options.billing) throw new ApiFault(503, 'INTERNAL', 'Billing is not configured yet.');
      return options.billing.checkout(req.parentUid);
    });
    routes.post('/v1/billing/portal', async (req) => {
      if (!options.billing) throw new ApiFault(503, 'INTERNAL', 'Billing is not configured yet.');
      return options.billing.portal(req.parentUid);
    });
    routes.post('/v1/billing/cancel', async (req) => {
      if (options.billing?.mode !== 'no-payment')
        throw new ApiFault(409, 'PLAN_LIMIT', 'Manage your subscription in billing.');
      await options.billing.cancel(req.parentUid);
      return { plan: 'free' as const };
    });
  });
  return app;
}
declare module 'fastify' {
  interface FastifyRequest {
    parentUid: string;
  }
}
