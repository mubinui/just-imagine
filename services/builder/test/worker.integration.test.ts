import { it, expect, vi, beforeEach } from 'vitest';
import type * as ServerCore from '@just-imagine/server-core';
import type * as Budget from '../src/budget';

const events = vi.hoisted(() => [] as { event: string; [field: string]: unknown }[]);
const budgetOverride = vi.hoisted(() => ({ hardMs: 0 }));
vi.mock('@just-imagine/server-core', async (importOriginal) => {
  const actual = await importOriginal<typeof ServerCore>();
  return {
    ...actual,
    logEvent: (event: string, fields: Record<string, unknown> = {}, ...rest: unknown[]) => {
      events.push({ event, ...fields });
      return (actual.logEvent as (...args: unknown[]) => void)(event, fields, ...rest);
    },
  };
});
vi.mock('../src/budget', async (importOriginal) => {
  const actual = await importOriginal<typeof Budget>();
  return {
    ...actual,
    createBudget: (options: Parameters<typeof actual.createBudget>[0] = {}) =>
      actual.createBudget({
        ...options,
        ...(budgetOverride.hardMs ? { hardMs: budgetOverride.hardMs } : {}),
      }),
  };
});
beforeEach(() => {
  events.length = 0;
  budgetOverride.hardMs = 0;
});

import { db, writeDoc } from '@just-imagine/server-core';
import {
  UserDocSchema,
  ChildDocSchema,
  WorldDocSchema,
  paths,
  type BuildWorldJob,
  type WorldDoc,
} from '@just-imagine/protocol';
import { FIXTURE_WORLDS, GAME_WORLDS } from '@just-imagine/fixtures/browser';
import type { SceneDoc } from '@just-imagine/scene-schema';
import { BuilderWorker } from '../src/worker';
import type { VertexModels } from '../src/vertex';
import type { ArtAsset, ArtRequest } from '../src/art-phase';
import { toGenerated } from '../src/prompts/v1';
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
  expect((await db().doc('builderJobs/j_deleted').get()).exists).toBe(false);
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
  generate
    .mockRejectedValueOnce(new Error('Temporary patch failure'))
    .mockRejectedValueOnce(new Error('Temporary patch failure'));
  await expect(worker.run(job)).rejects.toThrow('Temporary patch failure');
  expect((await db().doc(paths.world(worldId)).get()).data()?.['status']).toBe('ready');
  expect(await worker.run(job)).toEqual({ status: 'complete' });
  expect(await worker.run(job)).toEqual({ status: 'already-complete' });
  expect(generate).toHaveBeenCalledTimes(3);
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
it('does not recreate retained job data for a missing or deleted profile', async () => {
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
  expect((await db().doc('builderJobs/j_admission_failure').get()).exists).toBe(false);
  expect((await db().doc('worlds/w_admission_failure').get()).exists).toBe(false);
});

it('persists only safe terminal game diagnostics and never paints or publishes rejected behavior', async () => {
  const uid = 'diagnostic_parent',
    childId = 'c_diagnostic';
  await writeDoc(paths.user(uid), UserDocSchema, {
    email: 'qa@example.test',
    displayName: 'QA',
    consentAt: 1,
    plan: 'free',
    stripeCustomerId: null,
    createdAt: 1,
  });
  await writeDoc(paths.child(uid, childId), ChildDocSchema, {
    firstName: 'Private child',
    avatar: 'owl',
    ageBand: '8-10',
    tier: 'playground',
    labsUnlocked: false,
    captions: true,
    sessionTargetMinutes: 8,
    loopsCompleted: 0,
    createdAt: 1,
  });
  const models = {
    generate: vi.fn(async () => toGenerated(FIXTURE_WORLDS.jellyDragon)),
    image: vi.fn(),
  } as unknown as VertexModels;
  const worker = new BuilderWorker(
    models,
    { bucket: 'unused', assetBaseUrl: 'https://assets.invalid' },
    {
      generateScript: async () => ({ kind: 'game', source: 'fetch("private-source");' }),
    },
  );
  const job: BuildWorldJob = {
    kind: 'build',
    jobId: 'j_safe_diagnostic',
    worldId: 'w_safe_diagnostic',
    uid,
    childId,
    sessionId: 's_diagnostic',
    plan: 'free',
    description: 'private wish',
    experience: 'freeplay',
    concepts: ['bounce'],
    ageBand: '8-10',
    tier: 'playground',
    styleVersion: 'v1',
    promptVersion: 'v1',
    conversationSummary: '',
  };
  await expect(worker.run(job)).rejects.toThrow('could not be validated');
  const result = (
    await db()
      .doc('builderJobs/' + job.jobId)
      .get()
  ).data()!;
  expect(result.status).toBe('failed');
  // Two candidates per round over two rounds: the terminal failure is the third script call.
  expect(result.failure).toMatchObject({
    code: 'SCRIPT_STATIC',
    attempt: 3,
    issues: [{ code: 'forbidden-identifier', line: 1 }],
  });
  expect(JSON.stringify(result.failure)).not.toMatch(/private|fetch|source|wish|child/i);
  expect((await db().doc(paths.world(job.worldId)).get()).exists).toBe(false);
  expect(models.image).not.toHaveBeenCalled();
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const flies = GAME_WORLDS.catchTheFlies;

/** A family whose game wish has a running frog hero, with art scripted per request. */
async function artWorld(
  suffix: string,
  asset: (request: ArtRequest) => Promise<ArtAsset>,
  generateScript: () => Promise<{ kind: 'game'; source: string }>,
) {
  const uid = 'art_parent_' + suffix,
    childId = 'c_art';
  const scene: SceneDoc = structuredClone(flies);
  delete scene.game;
  scene.entities.find((e) => e.id === 'frog')!.locomotion = {
    kind: 'run',
    stride: 1,
    facing: 'right',
  };
  const models = {
    generate: vi.fn(async () => toGenerated(scene)),
    image: vi.fn(),
  } as unknown as VertexModels;
  const worker = new BuilderWorker(
    models,
    { bucket: 'unused', assetBaseUrl: 'https://assets.invalid' },
    { generateScript },
  );
  const internals = worker as unknown as {
    asset: (job: BuildWorldJob, request: ArtRequest) => Promise<ArtAsset>;
    publish: (job: BuildWorldJob, lease: string, world: WorldDoc) => Promise<void>;
  };
  vi.spyOn(internals, 'asset').mockImplementation((_job, request) => asset(request));
  const published: WorldDoc[] = [];
  const publish = internals.publish.bind(worker);
  vi.spyOn(internals, 'publish').mockImplementation(async (job, lease, world) => {
    published.push(structuredClone(world));
    return publish(job, lease, world);
  });
  const job: BuildWorldJob = {
    kind: 'build',
    jobId: 'j_art_' + suffix,
    worldId: 'w_art_' + suffix,
    uid,
    childId,
    sessionId: 's_art',
    plan: 'free',
    description: 'a frog that must catch ten flies before the owl wakes up',
    experience: 'game',
    concepts: ['force'],
    ageBand: '8-10',
    tier: 'playground',
    styleVersion: 'v1',
    promptVersion: 'v1',
    conversationSummary: '',
  };
  const cleanup = async () => {
    await db().recursiveDelete(db().doc(paths.user(uid)));
    await db().recursiveDelete(db().doc(paths.world(job.worldId)));
    await db()
      .doc('builderJobs/' + job.jobId)
      .delete();
    await db()
      .doc('worldLocks/' + job.worldId)
      .delete();
  };
  await cleanup();
  await writeDoc(paths.user(uid), UserDocSchema, {
    email: 'qa@example.test',
    displayName: 'QA',
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
  const world = async () =>
    WorldDocSchema.parse((await db().doc(paths.world(job.worldId)).get()).data());
  return { worker, job, published, world, cleanup };
}
const picture = (id: string): ArtAsset => ({
  url: `https://assets.invalid/${id}.webp`,
  width: 64,
  height: 64,
  colliderUrl: null,
});

it('publishes building with art that finished during scripting, then ready, never failed, when a sheet is missing', async () => {
  let backdropDone!: () => void;
  const backdropReady = new Promise<void>((resolve) => (backdropDone = resolve));
  const h = await artWorld(
    'early',
    async (request) => {
      if (request.id === 'backdrop') {
        setTimeout(backdropDone, 0);
        return picture('backdrop');
      }
      if (request.id === 'frog') throw new Error('The run cycle could not be registered');
      return picture(request.id);
    },
    async () => {
      // The script is written only after the backdrop art has come back.
      await backdropReady;
      await sleep(20);
      return { kind: 'game', source: flies.game!.script.source };
    },
  );
  try {
    expect(await h.worker.run(h.job)).toEqual({ status: 'complete' });
    expect(h.published[0]!.status).toBe('building');
    expect(h.published[0]!.doc.theme.backdrop).toMatchObject({
      status: 'ready',
      url: 'https://assets.invalid/backdrop.webp',
    });
    expect(h.published.some((w) => w.status === 'failed')).toBe(false);
    expect(h.published.at(-1)!.status).toBe('ready');
    const world = await h.world();
    expect(world.status).toBe('ready');
    const frog = world.doc.entities.find((e) => e.id === 'frog')!;
    expect(frog.locomotion).toBeUndefined();
    expect(world.assets['frog']).toEqual({ status: 'failed' });
    expect(world.doc.game?.script.source).toBe(flies.game!.script.source);
    expect(
      (
        await db()
          .doc('builderJobs/' + h.job.jobId)
          .get()
      ).data()?.['status'],
    ).toBe('complete');
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'art_locomotion_dropped', ids: ['frog'] }),
    );
  } finally {
    await h.cleanup();
  }
});

it('publishes ready with partial art when the hard deadline passes during art', async () => {
  budgetOverride.hardMs = 3000;
  let release!: (asset: ArtAsset) => void;
  const frogArt = new Promise<ArtAsset>((resolve) => (release = resolve));
  const h = await artWorld(
    'deadline',
    async (request) => (request.id === 'frog' ? frogArt : picture(request.id)),
    async () => ({ kind: 'game', source: flies.game!.script.source }),
  );
  try {
    expect(await h.worker.run(h.job)).toEqual({ status: 'complete' });
    const world = await h.world();
    expect(world.status).toBe('ready');
    expect(world.doc.theme.backdrop.status).toBe('ready');
    expect(world.assets['frog']).toEqual({ status: 'failed' });
    expect(world.doc.entities.find((e) => e.id === 'frog')!.locomotion).toBeUndefined();
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'build_deadline_hit', phase: 'art' }),
    );
    // Art that finishes after the world is ready is not published over it.
    const count = h.published.length;
    release(picture('frog'));
    await sleep(50);
    expect(h.published.length).toBe(count);
    expect((await h.world()).assets['frog']).toEqual({ status: 'failed' });
  } finally {
    await h.cleanup();
  }
});
