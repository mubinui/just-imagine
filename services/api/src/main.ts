import { startTelemetry, logEvent } from '@just-imagine/server-core';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { verifyIdToken } from '@just-imagine/server-core';
import { createApi } from './app';
import { FirestoreApiStore } from './store';
import { StripeBilling } from './billing';
import { deletionQueue } from './tasks';
import { processDeletion, retryDeletions } from './deletion';
const stopTelemetry = startTelemetry('api');
const env = z
  .object({
    PORT: z.coerce.number().int().min(0).max(65535).default(8081),
    WEB_URL: z.url().default('http://localhost:3000'),
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SECRET: z.string().optional(),
    STRIPE_PRICE_ID: z.string().optional(),
    GOOGLE_CLOUD_PROJECT: z.string().optional(),
    API_AUDIENCE: z.url().optional(),
    TASK_SERVICE_ACCOUNT: z.email().optional(),
    DELETION_QUEUE: z.string().default('deletions'),
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
    : undefined;
const queue =
  env.GOOGLE_CLOUD_PROJECT && env.API_AUDIENCE && env.TASK_SERVICE_ACCOUNT
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
  verifyToken: verifyIdToken,
  billing,
  origins: [env.WEB_URL],
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
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    void app.close().then(async () => {
      await stopTelemetry();
      process.exit(0);
    });
  });
