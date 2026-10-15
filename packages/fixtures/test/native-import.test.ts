import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { expect, it } from 'vitest';

it('loads fixture and scene entry points in native Node ESM and applies a patch', () => {
  const fixturesUrl = new URL('../src/browser.ts', import.meta.url).href;
  const sceneUrl = new URL('../../scene-schema/src/index.ts', import.meta.url).href;
  const script = `
    import { fixtureWorldDoc } from ${JSON.stringify(fixturesUrl)};
    import { applyScenePatch } from ${JSON.stringify(sceneUrl)};
    const world = fixtureWorldDoc('projectileLab');
    const result = applyScenePatch(world.doc, [{ op: 'replace', path: '/title', value: 'Native ESM works' }]);
    if (!result.ok) throw new Error(JSON.stringify(result.issues));
    console.log(result.doc.title);
  `;
  const result = spawnSync(
    process.execPath,
    [
      '--import',
      createRequire(import.meta.url).resolve('tsx'),
      '--input-type=module',
      '-e',
      script,
    ],
    { encoding: 'utf8', timeout: 10_000 },
  );
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim()).toBe('Native ESM works');
});
