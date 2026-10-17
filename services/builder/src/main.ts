import { StoryWorker } from './story-worker';
import { StoryBuildJobSchema } from '@just-imagine/protocol';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { startLocalQueue } from './local-queue';
import { startTelemetry, logEvent, localDevelopment } from '@just-imagine/server-core';
import Fastify from 'fastify';
import { genkit, z as flowSchema } from 'genkit';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { BuilderWorker, EditError } from './worker';
import { MotionArtworkError } from './motion';
import { VertexModels } from './vertex';
import { GameScriptModel } from './game-model';
import { SceneValidationError } from './pipeline';
import { GameGenerationError } from './imagine-game';
const stopTelemetry = startTelemetry('builder');
const env = z
  .object({
    GEMINI_API_KEY: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional(),
    ),
    ASSET_DIRECTORY: z.string().optional(),
    PORT: z.coerce.number().default(8082),
    GOOGLE_CLOUD_PROJECT: z.string().min(1),
    ASSET_BUCKET: z.string().min(1),
    ASSET_BASE_URL: z.url(),
    BUILDER_AUDIENCE: z.url(),
    TASK_SERVICE_ACCOUNT: z.email(),
    SCENE_MODEL: z.string().default('gemini-4-argon'),
    GAME_MODEL: z.string().min(1).default('gemini-4-argon'),
    GAME_MODEL_LOCATION: z.string().min(1).default('global'),
    FAST_MODEL: z.string().default('gemini-3.8-flash'),
    HERO_MODEL: z.string().default('gemini-nano-banana-2.1'),
    PROP_MODEL: z.string().default('gemini-3.1-flash-lite-image'),
  })
  .parse(process.env);
const local = localDevelopment();
const gameModel = new GameScriptModel({
  project: env.GOOGLE_CLOUD_PROJECT,
  apiKey: env.GEMINI_API_KEY,
  model: env.GAME_MODEL,
  location: env.GAME_MODEL_LOCATION,
});
const worker = new BuilderWorker(
  new VertexModels({
    project: env.GOOGLE_CLOUD_PROJECT,
    apiKey: env.GEMINI_API_KEY,
    sceneModel: env.SCENE_MODEL,
    fastModel: env.FAST_MODEL,
    heroModel: env.HERO_MODEL,
    propModel: env.PROP_MODEL,
  }),
  {
    bucket: env.ASSET_BUCKET,
    assetBaseUrl: env.ASSET_BASE_URL,
    assetDirectory: local ? env.ASSET_DIRECTORY : undefined,
  },
  {
    generateScript: gameModel.generate,
    planGame: gameModel.plan,
  },
);
const storyWorker = new StoryWorker(
  new VertexModels({
    project: env.GOOGLE_CLOUD_PROJECT,
    apiKey: env.GEMINI_API_KEY,
    sceneModel: env.SCENE_MODEL,
    fastModel: env.FAST_MODEL,
    heroModel: env.HERO_MODEL,
    propModel: env.PROP_MODEL,
  }),
  {
    bucket: env.ASSET_BUCKET,
    assetBaseUrl: env.ASSET_BASE_URL,
    assetDirectory: local ? env.ASSET_DIRECTORY : undefined,
  },
);
const dispatcher = {
  run: (input: unknown) =>
    StoryBuildJobSchema.safeParse(input).success ? storyWorker.run(input) : worker.run(input),
};
const ai = genkit({});
const build = ai.defineFlow({ name: 'buildWorld', inputSchema: flowSchema.unknown() }, (input) =>
  dispatcher.run(input),
);
const auth = new OAuth2Client();
const app = Fastify({ bodyLimit: 128 * 1024, logger: false });
app.get('/health', async () => ({ ok: true }));
if (local && env.ASSET_DIRECTORY)
  app.get('/assets/:hash/:file', async (req, reply) => {
    const parsed = z
      .object({
        hash: z.string().regex(/^[a-f0-9]{64}$/),
        file: z.enum(['sprite.webp', 'collider.json']),
      })
      .safeParse(req.params);
    if (!parsed.success) return reply.code(404).send();
    try {
      const data = await readFile(
        join(env.ASSET_DIRECTORY!, 'assets', parsed.data.hash, parsed.data.file),
      );
      reply
        .header('Access-Control-Allow-Origin', '*')
        .header('Cache-Control', 'public,max-age=31536000,immutable');
      return reply
        .type(parsed.data.file.endsWith('.webp') ? 'image/webp' : 'application/json')
        .send(data);
    } catch {
      return reply.code(404).send();
    }
  });
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
  } catch (error) {
    if (
      error instanceof SceneValidationError ||
      error instanceof MotionArtworkError ||
      error instanceof GameGenerationError ||
      error instanceof EditError
    )
      return reply.send({ status: 'failed' });
    return reply.status(503).send({ error: 'Build failed; task may retry' });
  }
});
app.addHook('onResponse', async (_req, reply) => {
  logEvent('http_request', { status: reply.statusCode, durationMs: reply.elapsedTime });
});
await app.listen({ host: '0.0.0.0', port: env.PORT });
const stopQueue = local ? startLocalQueue(dispatcher) : async () => {};
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    void app.close().then(async () => {
      await stopQueue();
      await stopTelemetry();
      process.exit(0);
    });
  });
