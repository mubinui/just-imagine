import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const envPath = fileURLToPath(new URL('../.env.local', import.meta.url));
if (!existsSync(envPath)) {
  writeFileSync(
    envPath,
    '# Server-only Gemini key. Never use NEXT_PUBLIC_ for this key.\nGEMINI_API_KEY=\n',
    { mode: 0o600 },
  );
  console.log('Created .env.local. Add GEMINI_API_KEY there to enable voice and generation.');
}
chmodSync(envPath, 0o600);
const action = process.argv[2] ?? 'start';
const commands = {
  start: ['up', '-d', '--build'],
  stop: ['stop'],
  status: ['ps'],
  logs: ['logs', '--follow', '--tail=30'],
  'reload-key': ['up', '-d', '--no-deps', '--force-recreate', 'api', 'builder', 'gateway'],
};
if (!Object.hasOwn(commands, action))
  throw new Error('Use start, stop, status, logs, or reload-key.');
const result = spawnSync(
  'docker',
  ['compose', '--env-file', '.env.local', '-f', 'compose.local.yaml', ...commands[action]],
  { cwd: root, stdio: 'inherit' },
);
if (result.error) console.error('Docker could not start. Open Docker Desktop and try again.');
if (result.status === 0 && action === 'start')
  console.log(
    'Open http://localhost:3300. Create a local parent account, add an explorer, and meet their play friend.',
  );
process.exit(result.status ?? 1);
