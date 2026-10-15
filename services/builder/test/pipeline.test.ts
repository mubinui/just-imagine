import { it, expect, vi } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import { buildScene, patchScene } from '../src/pipeline';
import type { BuildWorldJob } from '@just-imagine/protocol';
const job: BuildWorldJob = {
  kind: 'build',
  jobId: 'j_test',
  worldId: 'w_test',
  uid: 'u_test',
  childId: 'c_test',
  sessionId: 's_test',
  plan: 'free',
  description: 'Jelly dragon',
  concepts: ['bounce'],
  ageBand: '8-10',
  tier: 'playground',
  styleVersion: 'v1',
  promptVersion: 'v1',
  conversationSummary: '',
};
const fixture = FIXTURE_WORLDS.jellyDragon;
function generated() {
  const { schemaVersion: _s, worldId: _w, ...doc } = structuredClone(fixture);
  return {
    ...doc,
    materials: Object.entries(doc.materials).map(([name, m]) => ({ name, ...m })),
    entities: doc.entities.map(({ asset: _a, ...e }) => e),
  };
}
it('repairs invalid structured output exactly once before publishing', async () => {
  const generate = vi.fn().mockResolvedValueOnce({}).mockResolvedValueOnce(generated());
  const doc = await buildScene(job, generate);
  expect(doc.worldId).toBe(job.worldId);
  expect(generate).toHaveBeenCalledTimes(2);
  expect(generate.mock.calls[1]?.[0]).toContain('Validation');
});
it('fails after two invalid scenes and rejects identity changes in patches', async () => {
  const generate = vi.fn().mockResolvedValue({});
  await expect(buildScene(job, generate)).rejects.toThrow();
  expect(generate).toHaveBeenCalledTimes(2);
  await expect(
    patchScene(fixture, 'change id', async () => [
      { op: 'replace', path: '/worldId', value: 'w_other' },
    ]),
  ).rejects.toThrow();
});
it('returns an immutable validated patch', async () => {
  const patched = await patchScene(fixture, 'new title', async () => [
    { op: 'replace', path: '/title', value: 'A bouncy world' },
  ]);
  expect(patched.doc.title).toBe('A bouncy world');
  expect(fixture.title).not.toBe('A bouncy world');
});
it('rejects a patch introducing an unapproved remote asset', async () => {
  await expect(
    patchScene(fixture, 'add art', async () => [
      {
        op: 'add',
        path: '/entities/0/asset',
        value: {
          url: 'https://unapproved.example/image.webp',
          status: 'ready',
          width: 64,
          height: 64,
        },
      },
    ]),
  ).rejects.toThrow('unapproved asset');
});
