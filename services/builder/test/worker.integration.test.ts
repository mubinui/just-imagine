import { it, expect, vi } from 'vitest';
import { db, writeDoc } from '@just-imagine/server-core';
import { UserDocSchema, ChildDocSchema, paths, type BuildWorldJob } from '@just-imagine/protocol';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import { BuilderWorker } from '../src/worker';
import type { VertexModels } from '../src/vertex';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
it('publishes placeholders through ready, replays idempotently and refuses a deleted child', async () => {
  if (!process.env['FIRESTORE_EMULATOR_HOST']) throw new Error('Emulator required');
  await writeDoc(paths.user('builder_parent'), UserDocSchema, {
    email: 'parent@example.test',
    displayName: 'Parent',
    consentAt: 1,
    plan: 'free',
    stripeCustomerId: null,
    createdAt: 1,
  });
  await writeDoc(paths.child('builder_parent', 'c_builder'), ChildDocSchema, {
    firstName: 'Mira',
    avatar: 'owl',
    ageBand: '8-10',
    tier: 'playground',
    labsUnlocked: false,
    captions: true,
    sessionTargetMinutes: 8,
    loopsCompleted: 0,
    createdAt: 1,
  });
  const {
    schemaVersion: _s,
    worldId: _w,
    ...fixture
  } = structuredClone(FIXTURE_WORLDS.jellyDragon);
  const generate = vi.fn(async () => ({
    ...fixture,
    materials: Object.entries(fixture.materials).map(([name, m]) => ({ name, ...m })),
    entities: fixture.entities.map(({ asset: _a, ...entity }) => entity),
  }));
  const models = {
    generate,
    image: vi.fn(async () => {
      throw new Error('Image unavailable');
    }),
  } as unknown as VertexModels;
  const worker = new BuilderWorker(models, {
    bucket: 'unused-test-bucket',
    assetBaseUrl: 'https://assets.invalid',
  });
  const job: BuildWorldJob = {
    kind: 'build',
    jobId: 'j_worker',
    worldId: 'w_worker',
    uid: 'builder_parent',
    childId: 'c_builder',
    sessionId: 's_worker',
    plan: 'free',
    description: 'Jelly dragon',
    concepts: ['bounce'],
    ageBand: '8-10',
    tier: 'playground',
    styleVersion: 'v1',
    promptVersion: 'v1',
    conversationSummary: '',
  };
  expect(await worker.run(job)).toEqual({ status: 'complete' });
  expect((await db().doc(paths.world(job.worldId)).get()).data()?.['status']).toBe('ready');
  expect(await worker.run(job)).toEqual({ status: 'already-complete' });
  expect(generate).toHaveBeenCalledOnce();
  await db().doc('users/builder_parent/deletionLocks/c_builder').set({ requestedAt: Date.now() });
  await expect(worker.run({ ...job, jobId: 'j_deleted', worldId: 'w_deleted' })).rejects.toThrow(
    'unavailable',
  );
  expect((await db().doc('worlds/w_deleted').get()).exists).toBe(false);
});

it('commits a patch, version, and completion marker atomically', async () => {
  const uid = 'patch_parent',
    childId = 'c_patch',
    worldId = 'w_patch';
  await writeDoc(paths.user(uid), UserDocSchema, {
    email: 'parent@example.test',
    displayName: 'Parent',
    consentAt: 1,
    plan: 'free',
    stripeCustomerId: null,
    createdAt: 1,
  });
  await writeDoc(paths.child(uid, childId), ChildDocSchema, {
    firstName: 'Mira',
    avatar: 'owl',
    ageBand: '8-10',
    tier: 'playground',
    labsUnlocked: false,
    captions: true,
    sessionTargetMinutes: 8,
    loopsCompleted: 0,
    createdAt: 1,
  });
  await db()
    .doc(paths.world(worldId))
    .set({
      ownerUid: uid,
      childId,
      title: FIXTURE_WORLDS.jellyDragon.title,
      status: 'ready',
      doc: { ...FIXTURE_WORLDS.jellyDragon, worldId },
      schemaVersion: 1,
      promptVersion: 'v1',
      styleVersion: 'v1',
      assets: {},
      concepts: ['bounce'],
      thumbnailUrl: null,
      jobId: 'j_initial',
      createdAt: 1,
      updatedAt: 1,
    });
  const generate = vi.fn(async () => [{ op: 'replace', path: '/title', value: 'Patched once' }]);
  const worker = new BuilderWorker({ generate } as unknown as VertexModels, {
    bucket: 'unused',
    assetBaseUrl: 'https://assets.invalid',
  });
  const job = {
    kind: 'patch',
    jobId: 'j_atomic_patch',
    worldId,
    uid,
    childId,
    sessionId: 's_patch',
    plan: 'free',
    instruction: 'Rename the world',
    promptVersion: 'v1',
  };
  generate.mockRejectedValueOnce(new Error('Temporary patch failure'));
  await expect(worker.run(job)).rejects.toThrow('Temporary patch failure');
  expect((await db().doc(paths.world(worldId)).get()).data()?.['status']).toBe('ready');
  expect(await worker.run(job)).toEqual({ status: 'complete' });
  expect(await worker.run(job)).toEqual({ status: 'already-complete' });
  expect(generate).toHaveBeenCalledTimes(2);
  expect(
    (
      await db()
        .doc(`${paths.worldVersions(worldId)}/${job.jobId}`)
        .get()
    ).exists,
  ).toBe(true);
  expect((await db().doc(paths.world(worldId)).get()).data()?.['title']).toBe('Patched once');
  await db().doc(`worldDeletionLocks/${worldId}`).set({ requestedAt: 1 });
  await db().recursiveDelete(db().doc(paths.world(worldId)));
  await expect(worker.run({ ...job, jobId: 'j_deleted_patch' })).rejects.toThrow('unavailable');
  expect((await db().doc(paths.world(worldId)).get()).exists).toBe(false);
});
it('records admission failure before a world exists', async () => {
  const worker = new BuilderWorker({} as VertexModels, {
    bucket: 'unused',
    assetBaseUrl: 'https://assets.invalid',
  });
  const job = {
    kind: 'build',
    jobId: 'j_admission_failure',
    worldId: 'w_admission_failure',
    uid: 'missing_parent',
    childId: 'c_missing',
    sessionId: 's_missing',
    plan: 'free',
    description: 'A cloud',
    concepts: ['gravity'],
    ageBand: '8-10',
    tier: 'playground',
    styleVersion: 'v1',
    promptVersion: 'v1',
    conversationSummary: '',
  };
  await expect(worker.run(job)).rejects.toThrow('unavailable');
  expect((await db().doc('builderJobs/j_admission_failure').get()).data()?.['status']).toBe(
    'failed',
  );
  expect((await db().doc('worlds/w_admission_failure').get()).exists).toBe(false);
});
