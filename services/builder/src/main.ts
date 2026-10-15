import { startTelemetry, logEvent } from '@just-imagine/server-core';
import Fastify from 'fastify';
import { genkit, z as flowSchema } from 'genkit';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { BuilderWorker } from './worker';
import { VertexModels } from './vertex';
const stopTelemetry = startTelemetry('builder');
const env = z
  .object({
    PORT: z.coerce.number().default(8082),
    GOOGLE_CLOUD_PROJECT: z.string().min(1),
    ASSET_BUCKET: z.string().min(1),
    ASSET_BASE_URL: z.url(),
    BUILDER_AUDIENCE: z.url(),
    TASK_SERVICE_ACCOUNT: z.email(),
    SCENE_MODEL: z.string().default('gemini-4-argon'),
    FAST_MODEL: z.string().default('gemini-3.8-flash'),
    HERO_MODEL: z.string().default('gemini-nano-banana-2.1'),
    PROP_MODEL: z.string().default('gemini-3.1-flash-lite-image'),
  })
  .parse(process.env);
const worker = new BuilderWorker(
  new VertexModels({
    project: env.GOOGLE_CLOUD_PROJECT,
    sceneModel: env.SCENE_MODEL,
    fastModel: env.FAST_MODEL,
    heroModel: env.HERO_MODEL,
    propModel: env.PROP_MODEL,
  }),
  { bucket: env.ASSET_BUCKET, assetBaseUrl: env.ASSET_BASE_URL },
);
const ai = genkit({});
const build = ai.defineFlow({ name: 'buildWorld', inputSchema: flowSchema.unknown() }, (input) =>
  worker.run(input),
);
const auth = new OAuth2Client();
const app = Fastify({ bodyLimit: 128 * 1024, logger: false });
app.get('/health', async () => ({ ok: true }));
app.post('/jobs', async (req, reply) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    if (!token) return reply.status(401).send({ error: 'Unauthenticated' });
    const ticket = await auth.verifyIdToken({ idToken: token, audience: env.BUILDER_AUDIENCE });
    if (
      ticket.getPayload()?.email !== env.TASK_SERVICE_ACCOUNT ||
      ticket.getPayload()?.email_verified !== true
    )
      return reply.status(403).send({ error: 'Forbidden' });
  } catch {
    return reply.status(401).send({ error: 'Unauthenticated' });
  }
  try {
    return await build(req.body);
  } catch {
    return reply.status(503).send({ error: 'Build failed; task may retry' });
  }
});
app.addHook('onResponse', async (_req, reply) => {
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
