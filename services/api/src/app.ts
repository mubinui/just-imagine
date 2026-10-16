import Fastify from 'fastify';
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

export interface Billing {
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
    routes.get('/v1/me', (req) => options.store.me(req.parentUid));
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
    routes.get('/v1/children/:childId/worlds', (req) =>
      options.store.listWorlds(req.parentUid, id(req.params, 'childId')),
    );
    routes.get('/v1/children/:childId/sessions', (req) =>
      options.store.listSessions(req.parentUid, id(req.params, 'childId')),
    );
    routes.get('/v1/children/:childId/discoveries', (req) =>
      options.store.listDiscoveries(req.parentUid, id(req.params, 'childId')),
    );
    routes.get('/v1/worlds/:worldId', (req) =>
      options.store.getWorld(req.parentUid, id(req.params, 'worldId')),
    );
    routes.delete('/v1/worlds/:worldId', async (req, reply) => {
      await options.store.deleteWorld(req.parentUid, id(req.params, 'worldId'));
      return reply.status(204).send();
    });
    routes.get('/v1/usage/today', (req) => options.store.usageToday(req.parentUid));
    learnRoutes(routes, options.learn ?? new FirestoreLearnStore());
    storyRoutes(routes, options.stories ?? new FirestoreStoryStore());
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
  });
  return app;
}
declare module 'fastify' {
  interface FastifyRequest {
    parentUid: string;
  }
}
