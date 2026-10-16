import { startTelemetry, logEvent } from '@just-imagine/server-core';
import { z } from 'zod';
import { startGateway } from './gateway';
import { FirestoreSessionStore } from './store';
import { VertexLiveProvider } from './live';
const stopTelemetry = startTelemetry('gateway');
const env = z
  .object({
    PORT: z.coerce.number().int().min(0).max(65535).default(8788),
    GOOGLE_CLOUD_PROJECT: z.string().min(1),
    WEB_URL: z.url(),
    BUILDER_URL: z.url(),
    TASK_SERVICE_ACCOUNT: z.email(),
    BUILDER_QUEUE: z.string().default('world-builds'),
    GEMINI_API_KEY: z.preprocess(
      (value) => (value === '' ? undefined : value),
      z.string().min(1).optional(),
    ),
    LIVE_MODEL: z.string().default('gemini-3.8-live'),
    COMPANION_IMAGE_MODEL: z.string().default('gemini-nano-banana-2.1'),
    FAST_MODEL: z.string().default('gemini-3.8-flash'),
  })
  .parse(process.env);
logEvent('gateway_start');
const gateway = startGateway({
  port: env.PORT,
  host: '0.0.0.0',
  origins: [env.WEB_URL],
  store: new FirestoreSessionStore({
    project: env.GOOGLE_CLOUD_PROJECT,
    queue: env.BUILDER_QUEUE,
    builderUrl: env.BUILDER_URL,
    serviceAccount: env.TASK_SERVICE_ACCOUNT,
  }),
  provider: new VertexLiveProvider({
    project: env.GOOGLE_CLOUD_PROJECT,
    liveModel: env.LIVE_MODEL,
    apiKey: env.GEMINI_API_KEY,
    fastModel: env.FAST_MODEL,
    imageModel: env.COMPANION_IMAGE_MODEL,
  }),
});
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    void gateway.close().then(async () => {
      await stopTelemetry();
      process.exit(0);
    });
  });
