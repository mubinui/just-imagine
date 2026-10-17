// Runs one command inside throwaway Firestore and Auth emulators on the test ports
// (8085/9095), leaving the demo emulators (8080/9099) and their data untouched.
// Usage: node scripts/test-emulators-for.mjs "<command>"
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const command = process.argv.slice(2).join(' ');
if (!command) {
  console.error('Usage: node scripts/test-emulators-for.mjs "<command>"');
  process.exit(2);
}
const java = resolve('.tools/amazon-corretto-21.jdk/Contents/Home');
const env = {
  ...process.env,
  DEBUG: '',
  ...(!process.env.JAVA_HOME && existsSync(java) ? { JAVA_HOME: java } : {}),
};
const directory = mkdtempSync(join(tmpdir(), 'just-imagine-tests-'));
for (const file of ['firestore.rules', 'firestore.indexes.json'])
  copyFileSync(resolve(file), join(directory, file));
const config = join(directory, 'firebase.json');
writeFileSync(
  config,
  JSON.stringify({
    emulators: {
      firestore: { port: 8085, websocketPort: 9155 },
      auth: { port: 9095 },
      hub: { port: 4405 },
      logging: { port: 4505 },
      ui: { enabled: false },
      singleProjectMode: true,
    },
    firestore: { rules: 'firestore.rules', indexes: 'firestore.indexes.json' },
  }),
);
let status = 1;
try {
  const result = spawnSync(
    resolve('node_modules/.bin/firebase'),
    [
      'emulators:exec',
      '--config',
      config,
      '--only',
      'firestore,auth',
      '--project',
      'demo-just-imagine',
      command,
    ],
    { stdio: 'inherit', env },
  );
  status = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
process.exit(status);
