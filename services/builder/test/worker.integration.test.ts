import { it, expect, vi, beforeEach } from 'vitest';
import type * as ServerCore from '@just-imagine/server-core';
import type * as Budget from '../src/budget';
import type * as Hero from '../src/hero';

const events = vi.hoisted(() => [] as { event: string; [field: string]: unknown }[]);
const budgetOverride = vi.hoisted(() => ({ hardMs: 0 }));
/** An unexpected error the next ensureHero call throws, once: it escapes imagineGame unwrapped. */
const heroFault = vi.hoisted(() => ({ error: undefined as Error | undefined }));
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
vi.mock('../src/hero', async (importOriginal) => {
  const actual = await importOriginal<typeof Hero>();
  return {
    ...actual,
    ensureHero: (...args: Parameters<typeof actual.ensureHero>) => {
      const error = heroFault.error;
      heroFault.error = undefined;
      if (error) throw error;
      return actual.ensureHero(...args);
    },
  };
});
beforeEach(() => {
  events.length = 0;
  budgetOverride.hardMs = 0;
  heroFault.error = undefined;
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
import { nearestConceptFixture } from '../src/fallback';
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const flies = GAME_WORLDS.catchTheFlies;

/** A parent and child with no leftovers from an earlier run; returns the cleanup. */
async function family(uid: string, childId: string, jobIds: string[], worldId: string) {
  const cleanup = async () => {
    await db().recursiveDelete(db().doc(paths.user(uid)));
    await db().recursiveDelete(db().doc(paths.world(worldId)));
    for (const jobId of jobIds) await db().doc(`builderJobs/${jobId}`).delete();
    await db().doc(`worldLocks/${worldId}`).delete();
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
  return cleanup;
}
const forbiddenScript = async () => ({ kind: 'game' as const, source: 'fetch("private-source");' });

it('ends in status fallback with reason template and a ready world when every script fails', async () => {
  const job: BuildWorldJob = {
    kind: 'build',
    jobId: 'j_template_fallback',
    worldId: 'w_template_fallback',
    uid: 'template_parent',
    childId: 'c_template',
    sessionId: 's_template',
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
  const cleanup = await family(job.uid, job.childId, [job.jobId], job.worldId);
  try {
    const models = {
      generate: vi.fn(async () => toGenerated(FIXTURE_WORLDS.jellyDragon)),
      image: vi.fn(async () => {
        throw new Error('Image unavailable');
      }),
    } as unknown as VertexModels;
    const generateScript = vi.fn(forbiddenScript);
    const worker = new BuilderWorker(
      models,
      { bucket: 'unused', assetBaseUrl: 'https://assets.invalid' },
      { generateScript },
    );
    expect(await worker.run(job)).toEqual({ status: 'complete' });
    // Two candidates per round over two rounds, then the template.
    expect(generateScript).toHaveBeenCalledTimes(4);
    const record = (await db().doc(`builderJobs/${job.jobId}`).get()).data()!;
    expect(record).toMatchObject({ status: 'fallback', fallbackReason: 'template' });
    expect(record['finishedAt']).toEqual(expect.any(Number));
    // The build did not fail: no failure is recorded; the cause is in the game_fallback event.
    expect(record['failure']).toBeUndefined();
    const world = WorldDocSchema.parse((await db().doc(paths.world(job.worldId)).get()).data());
    expect(world).toMatchObject({
      status: 'ready',
      creation: expect.objectContaining({ fallback: 'template', originalWish: 'private wish' }),
    });
    // The rejected behaviour is never published; the gated template is.
    expect(world.doc.game?.script.source).toBeDefined();
    expect(world.doc.game?.script.source).not.toContain('private-source');
    const fallbacks = events.filter((e) => e.event === 'game_fallback');
    expect(fallbacks).toHaveLength(1);
    expect(fallbacks[0]).toMatchObject({ reason: 'template', outcome: 'SCRIPT_STATIC' });
    expect(JSON.stringify(fallbacks[0])).not.toMatch(/private|fetch|source|wish|child/i);
    expect((await db().doc(`worldLocks/${job.worldId}`).get()).exists).toBe(false);
  } finally {
    await cleanup();
  }
});

it('publishes the nearest sample world with a template game when the scene never validates', async () => {
  const job: BuildWorldJob = {
    kind: 'build',
    jobId: 'j_sample_fallback',
    worldId: 'w_sample_fallback',
    uid: 'sample_parent',
    childId: 'c_sample',
    sessionId: 's_sample',
    plan: 'free',
    description: 'a wobbly jelly that bounces',
    experience: 'game',
    concepts: ['bounce'],
    ageBand: '8-10',
    tier: 'playground',
    styleVersion: 'v1',
    promptVersion: 'v1',
    conversationSummary: '',
  };
  const cleanup = await family(job.uid, job.childId, [job.jobId], job.worldId);
  try {
    const models = {
      generate: vi.fn(async () => ({ not: 'a scene' })),
      image: vi.fn(async () => {
        throw new Error('Image unavailable');
      }),
    } as unknown as VertexModels;
    const generateScript = vi.fn(forbiddenScript);
    const worker = new BuilderWorker(
      models,
      { bucket: 'unused', assetBaseUrl: 'https://assets.invalid' },
      { generateScript },
    );
    const asset = vi.spyOn(
      worker as unknown as { asset: (job: BuildWorldJob, request: ArtRequest) => Promise<unknown> },
      'asset',
    );
    expect(await worker.run(job)).toEqual({ status: 'complete' });
    // Three repair rounds, then no script call: the sample gets a template directly.
    expect(models.generate).toHaveBeenCalledTimes(3);
    expect(generateScript).not.toHaveBeenCalled();
    expect((await db().doc(`builderJobs/${job.jobId}`).get()).data()).toMatchObject({
      status: 'fallback',
      fallbackReason: 'sample',
      finishedAt: expect.any(Number),
    });
    const sample = nearestConceptFixture(job).doc;
    const world = WorldDocSchema.parse((await db().doc(paths.world(job.worldId)).get()).data());
    expect(world).toMatchObject({
      status: 'ready',
      title: sample.title,
      creation: expect.objectContaining({ fallback: 'sample' }),
    });
    expect(world.doc.worldId).toBe(job.worldId);
    expect(world.doc.game?.script.source).toEqual(expect.any(String));
    // Art was requested for the sample's own pictures.
    expect(asset).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'backdrop' }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'game_fallback',
        jobId: job.jobId,
        worldId: job.worldId,
        reason: 'sample',
        outcome: 'SCENE_INVALID',
      }),
    );
  } finally {
    await cleanup();
  }
});

it('publishes the nearest sample world when an unexpected error escapes the game build', async () => {
  const job: BuildWorldJob = {
    kind: 'build',
    jobId: 'j_unexpected',
    worldId: 'w_unexpected',
    uid: 'unexpected_parent',
    childId: 'c_unexpected',
    sessionId: 's_unexpected',
    plan: 'free',
    description: 'a wobbly jelly that bounces',
    experience: 'game',
    concepts: ['bounce'],
    ageBand: '8-10',
    tier: 'playground',
    styleVersion: 'v1',
    promptVersion: 'v1',
    conversationSummary: '',
  };
  const cleanup = await family(job.uid, job.childId, [job.jobId], job.worldId);
  try {
    const scene: SceneDoc = structuredClone(flies);
    delete scene.game;
    const models = {
      generate: vi.fn(async () => toGenerated(scene)),
      image: vi.fn(async () => {
        throw new Error('Image unavailable');
      }),
    } as unknown as VertexModels;
    const generateScript = vi.fn(forbiddenScript);
    // A plain programming error, neither SceneValidationError nor GameGenerationError.
    heroFault.error = new TypeError("Cannot read properties of undefined (reading 'private')");
    const worker = new BuilderWorker(
      models,
      { bucket: 'unused', assetBaseUrl: 'https://assets.invalid' },
      { generateScript },
    );
    expect(await worker.run(job)).toEqual({ status: 'complete' });
    expect(heroFault.error).toBeUndefined();
    expect(generateScript).not.toHaveBeenCalled();
    const record = (await db().doc(`builderJobs/${job.jobId}`).get()).data();
    expect(record).toMatchObject({
      status: 'fallback',
      fallbackReason: 'sample',
      finishedAt: expect.any(Number),
    });
    expect(record?.['failure']).toBeUndefined();
    const sample = nearestConceptFixture(job).doc;
    const world = WorldDocSchema.parse((await db().doc(paths.world(job.worldId)).get()).data());
    expect(world).toMatchObject({
      status: 'ready',
      title: sample.title,
      creation: expect.objectContaining({ fallback: 'sample' }),
    });
    const fallbacks = events.filter((e) => e.event === 'game_fallback');
    expect(fallbacks).toHaveLength(1);
    // The error's name is the code; its message never reaches the log.
    expect(fallbacks[0]).toMatchObject({ reason: 'sample', outcome: 'TypeError' });
    expect(JSON.stringify(fallbacks[0])).not.toMatch(/private|Cannot read/);
  } finally {
    await cleanup();
  }
});

it('publishes the nearest sample world when every template fails its gate on the generated scene', async () => {
  const job: BuildWorldJob = {
    kind: 'build',
    jobId: 'j_no_template',
    worldId: 'w_no_template',
    uid: 'no_template_parent',
    childId: 'c_no_template',
    sessionId: 's_no_template',
    plan: 'free',
    description: 'a frog that must catch ten flies',
    experience: 'game',
    concepts: ['bounce'],
    ageBand: '8-10',
    tier: 'playground',
    styleVersion: 'v1',
    promptVersion: 'v1',
    conversationSummary: '',
  };
  const cleanup = await family(job.uid, job.childId, [job.jobId], job.worldId);
  try {
    const scene: SceneDoc = structuredClone(flies);
    delete scene.game;
    const models = {
      generate: vi.fn(async () => toGenerated(scene)),
      image: vi.fn(async () => {
        throw new Error('Image unavailable');
      }),
    } as unknown as VertexModels;
    // Every child-facing string is rejected, so all three template tries fail their gate.
    const moderate = vi.fn(async () => false);
    const worker = new BuilderWorker(
      models,
      { bucket: 'unused', assetBaseUrl: 'https://assets.invalid' },
      { generateScript: forbiddenScript, moderate },
    );
    const asset = vi.spyOn(
      worker as unknown as { asset: (job: BuildWorldJob, request: ArtRequest) => Promise<unknown> },
      'asset',
    );
    expect(await worker.run(job)).toEqual({ status: 'complete' });
    expect(moderate).toHaveBeenCalled();
    expect((await db().doc(`builderJobs/${job.jobId}`).get()).data()).toMatchObject({
      status: 'fallback',
      fallbackReason: 'sample',
      finishedAt: expect.any(Number),
    });
    const sample = nearestConceptFixture(job).doc;
    expect(sample.title).not.toBe(scene.title);
    const world = WorldDocSchema.parse((await db().doc(paths.world(job.worldId)).get()).data());
    expect(world).toMatchObject({
      status: 'ready',
      title: sample.title,
      creation: expect.objectContaining({ fallback: 'sample' }),
    });
    // Art for the abandoned scene never reaches the published world.
    expect(asset).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'frog' }));
    expect(world.assets['frog']).toBeUndefined();
    expect(world.doc.entities.some((e) => e.id === 'frog')).toBe(false);
    expect(events).toContainEqual(
      expect.objectContaining({
        event: 'game_fallback',
        reason: 'sample',
        outcome: 'SCRIPT_STATIC',
      }),
    );
    expect(events.filter((e) => e.event === 'game_fallback')).toHaveLength(1);
    // The scriptless sample is never silent: a code-only event says its templates failed.
    expect(events.filter((e) => e.event === 'game_template_failed')).toEqual([
      { event: 'game_template_failed', jobId: job.jobId, worldId: job.worldId, reason: 'sample' },
    ]);
  } finally {
    await cleanup();
  }
});

it('still fails a voice edit whose behaviour never validates and keeps the previous world', async () => {
  const uid = 'edit_fail_parent',
    childId = 'c_edit_fail',
    worldId = 'w_edit_fail';
  const job = {
    kind: 'patch',
    jobId: 'j_edit_fail',
    worldId,
    uid,
    childId,
    sessionId: 's_edit_fail',
    plan: 'free',
    instruction: 'Make the frog fly',
    promptVersion: 'v1',
  };
  const cleanup = await family(uid, childId, [job.jobId], worldId);
  try {
    const before: SceneDoc = { ...structuredClone(flies), worldId };
    const previous = WorldDocSchema.parse({
      ownerUid: uid,
      childId,
      title: before.title,
      status: 'ready',
      doc: before,
      schemaVersion: 1,
      promptVersion: 'v1',
      styleVersion: 'v1',
      assets: {},
      concepts: before.learning.concepts,
      thumbnailUrl: null,
      jobId: 'j_edit_fail_initial',
      createdAt: 1,
      updatedAt: 1,
    });
    await db().doc(paths.world(worldId)).set(previous);
    const models = {
      generate: vi.fn(async () => toGenerated(flies)),
      image: vi.fn(),
    } as unknown as VertexModels;
    const worker = new BuilderWorker(
      models,
      { bucket: 'unused', assetBaseUrl: 'https://assets.invalid' },
      { generateScript: forbiddenScript },
    );
    await expect(worker.run(job)).rejects.toThrow('could not be validated');
    expect((await db().doc(`builderJobs/${job.jobId}`).get()).data()).toMatchObject({
      status: 'failed',
    });
    expect((await db().doc(paths.world(worldId)).get()).data()).toEqual(previous);
    expect(events.some((e) => e.event === 'game_fallback')).toBe(false);
  } finally {
    await cleanup();
  }
});

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
    // The hero's art never arrives, so a painted stand-in takes its place and it still stands still.
    expect(frog.asset).toMatchObject({ status: 'ready' });
    expect(frog.asset?.url).toMatch(/^\/standins\//);
    expect(world.assets['frog']).toMatchObject({ status: 'ready' });
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
    expect(events).toContainEqual({
      event: 'art_standin_used',
      jobId: h.job.jobId,
      worldId: h.job.worldId,
      count: 1,
    });
  } finally {
    await h.cleanup();
  }
});

it("gives the child's friend its own frame and never asks for a picture of it", async () => {
  const asked: string[] = [];
  const h = await artWorld(
    'friend',
    async (request) => {
      asked.push(request.id);
      return picture(request.id);
    },
    async () => ({ kind: 'game', source: flies.game!.script.source }),
  );
  h.job.companionId = 'bhombol';
  try {
    expect(await h.worker.run(h.job)).toEqual({ status: 'complete' });
    const world = await h.world();
    expect(world.status).toBe('ready');
    const friend = world.doc.entities.find((e) => e.id === 'bhombol')!;
    expect(friend.tags).toContain('friend');
    expect(friend.asset).toEqual({
      status: 'ready',
      url: '/standins/friend-bhombol.webp',
      width: 193,
      height: 219,
    });
    expect(world.assets['bhombol']).toEqual({
      status: 'ready',
      url: '/standins/friend-bhombol.webp',
    });
    expect(asked).toContain('frog');
    expect(asked).not.toContain('bhombol');
    // Every publish, the first included, already shows the friend's frame.
    for (const published of h.published)
      expect(published.doc.entities.find((e) => e.id === 'bhombol')?.asset?.url).toBe(
        '/standins/friend-bhombol.webp',
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
    expect(world.assets['frog']?.url).toMatch(/^\/standins\//);
    expect(world.doc.entities.find((e) => e.id === 'frog')!.locomotion).toBeUndefined();
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'build_deadline_hit', phase: 'art' }),
    );
    // Art that finishes after the world is ready is not published over it.
    const count = h.published.length;
    release(picture('frog'));
    await sleep(50);
    expect(h.published.length).toBe(count);
    expect((await h.world()).assets['frog']?.url).toMatch(/^\/standins\//);
  } finally {
    await h.cleanup();
  }
});

it('commits a voice edit with the sprite kept still when its only animation sheet fails', async () => {
  const h = await artWorld(
    'edit',
    async (request) => {
      if (request.locomotion) throw new Error('The run cycle could not be registered');
      return picture(request.id);
    },
    async () => ({
      kind: 'game',
      source: "game.on('tap', e => { if(e.target) game.move(e.target.id, {x:8,y:3}); });",
    }),
  );
  try {
    // The current world: every picture is ready and nothing moves on its own.
    const before: SceneDoc = structuredClone(flies);
    before.worldId = h.job.worldId;
    before.theme.backdrop = {
      url: picture('backdrop').url,
      width: 64,
      height: 64,
      status: 'ready',
    };
    for (const entity of before.entities)
      if (entity.kind === 'sprite')
        entity.asset = { url: picture(entity.id).url, width: 64, height: 64, status: 'ready' };
    await db()
      .doc(paths.world(h.job.worldId))
      .set(
        WorldDocSchema.parse({
          ownerUid: h.job.uid,
          childId: h.job.childId,
          title: before.title,
          status: 'ready',
          doc: before,
          schemaVersion: 1,
          promptVersion: 'v1',
          styleVersion: 'v1',
          assets: {},
          concepts: before.learning.concepts,
          thumbnailUrl: null,
          jobId: 'j_initial_edit',
          createdAt: 1,
          updatedAt: 1,
        }),
      );
    // The scene model already returns the frog with a run cycle (see artWorld).
    const job = {
      kind: 'patch',
      jobId: 'j_art_edit_patch',
      worldId: h.job.worldId,
      uid: h.job.uid,
      childId: h.job.childId,
      sessionId: 's_art',
      plan: 'free',
      instruction: 'Make the frog run',
      promptVersion: 'v1',
    };
    await db()
      .doc('builderJobs/' + job.jobId)
      .delete();
    expect(await h.worker.run(job)).toEqual({ status: 'complete' });
    const world = await h.world();
    expect(world.status).toBe('ready');
    expect(world.revisionId).toBe(job.jobId);
    const frog = world.doc.entities.find((e) => e.id === 'frog')!;
    expect(frog.locomotion).toBeUndefined();
    expect(frog.asset).toEqual({
      url: picture('frog').url,
      width: 64,
      height: 64,
      status: 'ready',
    });
    expect(
      (
        await db()
          .doc(`${paths.worldVersions(job.worldId)}/${job.jobId}`)
          .get()
      ).exists,
    ).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({ event: 'art_locomotion_dropped', ids: ['frog'] }),
    );
    await db()
      .doc('builderJobs/' + job.jobId)
      .delete();
  } finally {
    await h.cleanup();
  }
});
