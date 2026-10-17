import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, statSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runLocal } from './local.mjs';

function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'imagine-local-config-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, '.env.example'), '# Public template\nGEMINI_API_KEY=\n');
  const calls = [],
    messages = [];
  const options = {
    directory,
    run: (...args) => {
      calls.push(args);
      return { status: 0 };
    },
    log: (message) => messages.push(message),
    error: (message) => messages.push(message),
  };
  return { directory, calls, messages, options };
}

test('start copies the public template privately, preserves existing configuration and selects the local compose file', (t) => {
  const { directory, calls, options } = setup(t);
  const path = join(directory, '.env.local');
  assert.equal(runLocal('start', options), 0);
  assert.equal(readFileSync(path, 'utf8'), '# Public template\nGEMINI_API_KEY=\n');
  if (process.platform !== 'win32') assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.deepEqual(calls[0], [
    'docker',
    ['compose', '--env-file', '.env.local', '-f', 'compose.local.yaml', 'up', '-d', '--build'],
    { cwd: directory, stdio: 'inherit' },
  ]);
  writeFileSync(path, '# Existing local setup\nFAST_MODEL=local-test-model\n');
  assert.equal(runLocal('start', options), 0);
  assert.equal(readFileSync(path, 'utf8'), '# Existing local setup\nFAST_MODEL=local-test-model\n');
});

test('invalid commands never create configuration or invoke Docker', (t) => {
  const { directory, calls, options } = setup(t);
  assert.equal(runLocal('reset', options), 2);
  assert.equal(existsSync(join(directory, '.env.local')), false);
  assert.deepEqual(calls, []);
});

test('status, logs, stop and reload-key require prior setup without creating a file', (t) => {
  const { directory, calls, messages, options } = setup(t);
  for (const action of ['status', 'logs', 'stop', 'reload-key'])
    assert.equal(runLocal(action, options), 1);
  assert.equal(existsSync(join(directory, '.env.local')), false);
  assert.deepEqual(calls, []);
  assert.equal(
    messages.every((message) => message.includes('pnpm local:start')),
    true,
  );
});

test('inspection and stop preserve existing file contents and permissions', (t) => {
  const { directory, options, calls } = setup(t);
  const path = join(directory, '.env.local');
  writeFileSync(path, 'FAST_MODEL=test-only\n', { mode: 0o640 });
  const before = statSync(path);
  for (const action of ['status', 'logs', 'stop']) assert.equal(runLocal(action, options), 0);
  assert.equal(readFileSync(path, 'utf8'), 'FAST_MODEL=test-only\n');
  assert.equal(statSync(path).mode, before.mode);
  assert.equal(statSync(path).mtimeMs, before.mtimeMs);
  assert.deepEqual(
    calls.map((call) => call[1].slice(5)),
    [['ps'], ['logs', '--follow', '--tail=30'], ['stop']],
  );
});

test('reload-key recreates only AI services without rebuilding or removing persistent volumes', (t) => {
  const { directory, options, calls } = setup(t);
  writeFileSync(join(directory, '.env.local'), 'GEMINI_API_KEY=\n');
  assert.equal(runLocal('reload-key', options), 0);
  assert.deepEqual(calls[0][1].slice(5), [
    'up',
    '-d',
    '--no-deps',
    '--force-recreate',
    'api',
    'builder',
    'gateway',
  ]);
});

test('Docker launch failures return a failure status without echoing configuration', (t) => {
  const { options, messages } = setup(t);
  assert.equal(
    runLocal('start', { ...options, run: () => ({ status: null, error: new Error('failed') }) }),
    1,
  );
  assert.equal(messages.at(-1), 'Docker could not start. Open Docker Desktop and try again.');
  assert.equal(runLocal('start', { ...options, run: () => ({ status: 17 }) }), 17);
});
