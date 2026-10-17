import { spawnSync } from 'node:child_process';
import { existsSync, copyFileSync, chmodSync, constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const commands = {
  start: ['up', '-d', '--build'],
  stop: ['stop'],
  status: ['ps'],
  logs: ['logs', '--follow', '--tail=30'],
  'reload-key': ['up', '-d', '--no-deps', '--force-recreate', 'api', 'builder', 'gateway'],
};
export function runLocal(
  action = 'start',
  { directory = root, run = spawnSync, log = console.log, error = console.error } = {},
) {
  if (!Object.hasOwn(commands, action)) {
    error('Use start, stop, status, logs, or reload-key.');
    return 2;
  }
  const envPath = join(directory, '.env.local');
  if (!existsSync(envPath)) {
    if (action !== 'start') {
      error('No local configuration yet. Run pnpm local:start first.');
      return 1;
    }
    copyFileSync(join(directory, '.env.example'), envPath, constants.COPYFILE_EXCL);
    chmodSync(envPath, 0o600);
    log('Created .env.local. Add GEMINI_API_KEY there to enable voice and generation.');
  } else if (action === 'start' || action === 'reload-key') {
    chmodSync(envPath, 0o600);
  }
  const result = run(
    'docker',
    ['compose', '--env-file', '.env.local', '-f', 'compose.local.yaml', ...commands[action]],
    { cwd: directory, stdio: 'inherit' },
  );
  if (result.error) error('Docker could not start. Open Docker Desktop and try again.');
  if (result.status === 0 && action === 'start')
    log(
      'Open http://localhost:3300. Create a local parent account, add an explorer, and meet their play friend.',
    );
  return result.status ?? 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  process.exit(runLocal(process.argv[2]));
