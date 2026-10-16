import { it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { db, writeDoc } from '@just-imagine/server-core';
import {
  ChildDocSchema,
  UserDocSchema,
  WorldDocSchema,
  paths,
  type PatchWorldJob,
} from '@just-imagine/protocol';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import { BuilderWorker } from '../src/worker';
import { toGenerated } from '../src/prompts/v1';
import type { VertexModels } from '../src/vertex';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';

async function setup(suffix: string) {
  const uid = `author_${suffix}`,
    childId = 'c_author',
    worldId = `w_author_${suffix}`;
  await writeDoc(paths.user(uid), UserDocSchema, {
    email: 'parent@example.test',
    displayName: 'Parent',
    consentAt: 1,
    plan: 'family',
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
    language: 'bn',
    sessionTargetMinutes: 8,
    loopsCompleted: 0,
    createdAt: 1,
  });
  const doc = structuredClone(FIXTURE_WORLDS.jellyDragon);
  doc.worldId = worldId;
  doc.theme.backdrop = {
    status: 'ready',
    url: 'https://owned.test/backdrop',
    width: 1920,
    height: 1080,
  };
  for (const e of doc.entities)
    if (e.kind === 'sprite')
      e.asset = { status: 'ready', url: `https://owned.test/${e.id}`, width: 1024, height: 1024 };
  const original = WorldDocSchema.parse({
    ownerUid: uid,
    childId,
    title: doc.title,
    status: 'ready',
    doc,
    schemaVersion: 1,
    promptVersion: 'v1',
    styleVersion: 'v1',
    assets: {},
    concepts: doc.learning.concepts,
    thumbnailUrl: doc.theme.backdrop.url,
    jobId: 'j_initial',
    createdAt: 1,
    updatedAt: 1,
    creation: {
      originalWish: 'Clouds and a dragon who invent stories together',
      changes: [],
      mode: 'freeplay',
    },
  });
  await db().doc(paths.world(worldId)).set(original);
  const job: PatchWorldJob = {
    kind: 'patch',
    uid,
    childId,
    worldId,
    jobId: `j_${suffix}_one`,
    sessionId: 's_author',
    plan: 'family',
    instruction: 'Make my dragon blue',
    promptVersion: 'v1',
  };
  return {
    original,
    job,
    read: async () => WorldDocSchema.parse((await db().doc(paths.world(worldId)).get()).data()),
  };
}

it('updates actual appearance, keeps unrelated art, and undoes two edits with the full prior behavior', async () => {
  const { original, job, read } = await setup('undo');
  const next = structuredClone(original.doc);
  next.entities.find((e) => e.id === next.learning.heroEntityId)!.description =
    'A friendly blue cloth dragon with a scarf';
  const generate = vi.fn(async () => toGenerated(next));
  const png = await sharp({
    create: { width: 128, height: 128, channels: 4, background: '#ff00ff' },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 64, height: 64, channels: 4, background: '#55aaff' },
        })
          .png()
          .toBuffer(),
        left: 32,
        top: 32,
      },
    ])
    .png()
    .toBuffer();
  const image = vi.fn(async () => png),
    safeImage = vi.fn(async () => true);
  const source = "game.on('tap', e=>{if(e.target) game.move(e.target.id,{x:6,y:3});});";
  const worker = new BuilderWorker(
    { generate, image, safeImage } as unknown as VertexModels,
    {
      bucket: 'unused',
      assetDirectory: '/tmp/ji-author-test-assets',
      assetBaseUrl: 'https://owned.test',
    },
    { generateScript: async () => ({ kind: 'game', source }) },
  );
  await worker.run(job);
  const first = await read();
  const hero = first.doc.entities.find((e) => e.id === first.doc.learning.heroEntityId)!;
  expect(hero.asset?.url).not.toEqual(
    original.doc.entities.find((e) => e.id === hero.id)?.asset?.url,
  );
  expect(first.doc.theme.backdrop).toEqual(original.doc.theme.backdrop);
  expect(image).toHaveBeenCalledTimes(1);
  expect(first.doc.game?.script.source).toBe(source);
  expect(first.creation?.originalWish).toBe(original.creation?.originalWish);
  expect(first.revisionId).toBe(job.jobId);

  next.title = 'Our cloud story theatre';
  await worker.run({ ...job, jobId: 'j_undo_two', instruction: 'Name it Our cloud story theatre' });
  expect((await read()).title).toBe(next.title);
  expect(image).toHaveBeenCalledTimes(1);
  const undo = { ...job, kind: 'undo', jobId: 'j_undo_last' };
  await worker.run(undo);
  const backOne = await read();
  expect(backOne.doc).toEqual(first.doc);
  expect(backOne.creation).toEqual(first.creation);
  expect(backOne.revisionId).toBe(job.jobId);
  await worker.run({ ...undo, jobId: 'j_undo_original' });
  const backOriginal = await read();
  expect(backOriginal.doc).toEqual(original.doc);
  expect(backOriginal.creation).toEqual(original.creation);
  expect(backOriginal.revisionId).toBeUndefined();
  await expect(worker.run({ ...undo, jobId: 'j_undo_empty' })).rejects.toThrow('no previous edit');
});

it('keeps the complete last valid creation when new behavior fails rather than mixing old rules into a new scene', async () => {
  const { original, job, read } = await setup('failed');
  const next = structuredClone(original.doc);
  next.title = 'A different world';
  const worker = new BuilderWorker(
    { generate: async () => toGenerated(next) } as unknown as VertexModels,
    { bucket: 'unused', assetBaseUrl: 'https://owned.test' },
    { generateScript: async () => ({ kind: 'game', source: 'fetch("https://outside.test");' }) },
  );
  await expect(worker.run(job)).rejects.toThrow('could not be validated');
  expect(await read()).toEqual(original);
  expect(
    (
      await db()
        .doc(`${paths.worldVersions(job.worldId)}/${job.jobId}`)
        .get()
    ).exists,
  ).toBe(false);
  expect((await db().doc(`builderJobs/${job.jobId}`).get()).data()?.['status']).toBe('failed');
});

it('refuses to commit over a concurrently changed world', async () => {
  const { original, job, read } = await setup('conflict');
  const generate = vi.fn(async () => {
    await db().doc(paths.world(job.worldId)).update({ updatedAt: 999, title: 'A newer choice' });
    return toGenerated(original.doc);
  });
  const worker = new BuilderWorker(
    { generate } as unknown as VertexModels,
    { bucket: 'unused', assetBaseUrl: 'https://owned.test' },
    {
      generateScript: async () => ({
        kind: 'game',
        source: "game.on('tap',()=>game.sound('ding'));",
      }),
    },
  );
  await expect(worker.run(job)).rejects.toThrow('no longer writable');
  expect((await read()).title).toBe('A newer choice');
  expect((await read()).doc.game).toBeUndefined();
});
