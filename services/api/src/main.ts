import { geminiEditions } from './editions';
import { startTelemetry, logEvent, localDevelopment } from '@just-imagine/server-core';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { requireParent } from '@just-imagine/server-core';
import { FirestoreCompanionService, GeminiCompanionGenerator } from './companion';
import { createApi } from './app';
import { FirestoreApiStore } from './store';
import { StripeBilling } from './billing';
import { NoPaymentBilling } from './no-payment-billing';
import { FirestoreStoryStore } from './stories';
import { deletionQueue, storyQueue } from './tasks';
import { processDeletion, retryDeletions } from './deletion';
const stopTelemetry = startTelemetry('api');
const env = z
  .object({
    GEMINI_API_KEY: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional(),
    ),
    COMPANION_VERTEX: z.enum(['0', '1']).default('0'),
    COMPANION_IMAGE_MODEL: z.string().default('gemini-nano-banana-2.1'),
    FAST_MODEL: z.string().default('gemini-3.8-flash'),
    PORT: z.coerce.number().int().min(0).max(65535).default(8081),
    WEB_URL: z.url().default('http://localhost:3000'),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_ID: z.string().optional(),
    GOOGLE_CLOUD_PROJECT: z.string().optional(),
    API_AUDIENCE: z.url().optional(),
    BUILDER_URL: z.url().optional(),
    BUILDER_QUEUE: z.string().default('world-builds'),
    TASK_SERVICE_ACCOUNT: z.email().optional(),
    DELETION_QUEUE: z.string().default('deletions'),
    SUBSCRIPTIONS_WITHOUT_PAYMENT: z.enum(['0', '1']).default('0'),
  })
  .parse(process.env);
const billing =
  env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.STRIPE_PRICE_ID
    ? new StripeBilling({
        secretKey: env.STRIPE_SECRET_KEY,
        webhookSecret: env.STRIPE_WEBHOOK_SECRET,
        priceId: env.STRIPE_PRICE_ID,
        webUrl: env.WEB_URL,
      })
    : env.SUBSCRIPTIONS_WITHOUT_PAYMENT === '1'
      ? new NoPaymentBilling({ webUrl: env.WEB_URL })
      : undefined;
const local = localDevelopment();
const queue =
  !local && env.GOOGLE_CLOUD_PROJECT && env.API_AUDIENCE && env.TASK_SERVICE_ACCOUNT
    ? deletionQueue({
        project: env.GOOGLE_CLOUD_PROJECT,
        queue: env.DELETION_QUEUE,
        url: env.API_AUDIENCE,
        serviceAccount: env.TASK_SERVICE_ACCOUNT,
      })
    : undefined;
if (process.env['K_SERVICE'] && !queue)
  throw new Error('Cloud deployment requires a durable deletion queue');
const app = createApi({
  store: new FirestoreApiStore(
    queue ?? { enqueue: (id) => processDeletion(id, billing?.cancel.bind(billing)) },
  ),
  verifyToken: requireParent,
  editions:
    env.GEMINI_API_KEY || (env.COMPANION_VERTEX === '1' && env.GOOGLE_CLOUD_PROJECT)
      ? geminiEditions({
          apiKey: env.GEMINI_API_KEY,
          project: env.GOOGLE_CLOUD_PROJECT,
          model: env.FAST_MODEL,
        })
      : undefined,
  companion:
    env.GEMINI_API_KEY || (env.COMPANION_VERTEX === '1' && env.GOOGLE_CLOUD_PROJECT)
      ? new FirestoreCompanionService(
          new GeminiCompanionGenerator({
            apiKey: env.GEMINI_API_KEY,
            project: env.GOOGLE_CLOUD_PROJECT,
            imageModel: env.COMPANION_IMAGE_MODEL,
            fastModel: env.FAST_MODEL,
          }),
        )
      : undefined,
  billing,
  stories: new FirestoreStoryStore(
    !local && env.GOOGLE_CLOUD_PROJECT && env.BUILDER_URL && env.TASK_SERVICE_ACCOUNT
      ? storyQueue({
          project: env.GOOGLE_CLOUD_PROJECT,
          queue: env.BUILDER_QUEUE,
          url: env.BUILDER_URL,
          serviceAccount: env.TASK_SERVICE_ACCOUNT,
        })
      : undefined,
  ),
  origins: [env.WEB_URL],
  school: { promotions: billing?.mode === 'no-payment' },
});
const auth = new OAuth2Client();
app.register(async (internal) => {
  internal.addHook('preHandler', async (req, reply) => {
    try {
      if (!env.API_AUDIENCE || !env.TASK_SERVICE_ACCOUNT)
        return reply.status(503).send({ error: 'Not configured' });
      const token = req.headers.authorization?.replace(/^Bearer /, '');
      if (!token) return reply.status(401).send({ error: 'Unauthenticated' });
      const ticket = await auth.verifyIdToken({ idToken: token, audience: env.API_AUDIENCE });
      if (
        ticket.getPayload()?.email !== env.TASK_SERVICE_ACCOUNT ||
        ticket.getPayload()?.email_verified !== true
      )
        return reply.status(403).send({ error: 'Forbidden' });
    } catch {
      return reply.status(401).send({ error: 'Unauthenticated' });
    }
  });
  internal.post('/internal/deletions/:id', async (req) => {
    await processDeletion(
      z.object({ id: z.string() }).parse(req.params).id,
      billing?.cancel.bind(billing),
    );
    return { ok: true };
  });
  internal.post('/internal/deletions', async () => {
    await retryDeletions(billing?.cancel.bind(billing));
    return { ok: true };
  });
});
app.addHook('onResponse', async (req, reply) => {
  logEvent('http_request', { status: reply.statusCode, durationMs: reply.elapsedTime });
});
await app.listen({ host: '0.0.0.0', port: env.PORT });
const deletionRetry = local
  ? setInterval(() => {
      void retryDeletions(billing?.cancel.bind(billing)).catch(() =>
        logEvent('local_deletion_retry', {}, 'ERROR'),
      );
    }, 10000)
  : undefined;
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    clearInterval(deletionRetry);
    void app.close().then(async () => {
      await stopTelemetry();
      process.exit(0);
    });
  });
