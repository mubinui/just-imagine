import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('..', import.meta.url));
const result = spawnSync(
  resolve(root, 'services/api/node_modules/.bin/tsx'),
  [resolve(root, 'scripts/seed-schools.ts'), ...process.argv.slice(2)],
  { cwd: root, stdio: 'inherit', env: process.env },
);
process.exit(result.status ?? 1);
