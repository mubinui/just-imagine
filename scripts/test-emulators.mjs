import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
const java = resolve('.tools/amazon-corretto-21.jdk/Contents/Home');
const env = {
  ...process.env,
  ...(!process.env.JAVA_HOME && existsSync(java) ? { JAVA_HOME: java } : {}),
};
const result = spawnSync(
  process.execPath,
  [
    process.env.npm_execpath,
    'exec',
    'firebase',
    'emulators:exec',
    '--only',
    'firestore,auth',
    '--project',
    'demo-just-imagine',
    'pnpm --filter @just-imagine/server-core exec vitest run && pnpm --filter @just-imagine/api test && pnpm --filter @just-imagine/builder test && pnpm --filter @just-imagine/gateway test',
  ],
  { stdio: 'inherit', env },
);
process.exit(result.status ?? 1);
