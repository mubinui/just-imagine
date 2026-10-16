import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { db } from '@just-imagine/server-core';
import { paths } from '@just-imagine/protocol';
import { storyBook, manuscript } from '../../../packages/protocol/test/fixtures/story';
import { StoryWorker, storyPrompt } from '../src/story-worker';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
const job = {
  kind: 'story',
  jobId: 'story_test_0',
  storyId: 'story_test',
  uid: 'parent',
  childId: 'c_mira',
};
beforeEach(async () => {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!host || host.endsWith(':8080')) throw new Error('Use isolated test emulator');
  await fetch(
    `http://${host}/emulator/v1/projects/demo-just-imagine/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db().doc(paths.user('parent')).set({
    email: 'p@example.test',
    displayName: 'Parent',
    consentAt: 1,
    plan: 'family',
    stripeCustomerId: null,
    createdAt: 1,
  });
  await db().doc(paths.child('parent', 'c_mira')).set({
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
  await db().doc('stories/story_test').set(storyBook());
});
async function setup(image?: () => Promise<Buffer>) {
  const directory = await mkdtemp(join(tmpdir(), 'story-worker-'));
  const picture = await sharp({
    create: { width: 640, height: 360, channels: 3, background: '#abc' },
  })
    .webp()
    .toBuffer();
  const models = {
    story: vi.fn(async (prompt: string) => {
      if (prompt.startsWith('Review')) return { safe: true, accurate: true, goalsIncluded: true };
      const book = manuscript();
      if (prompt.includes('concise story outline'))
        return {
          ...book,
          scenes: book.scenes.map((s) => ({
            id: s.id,
            title: s.title,
            summary: 'The rabbit explores the garden and shares some water with a friend.',
          })),
        };
      const id = /Use exact id ([a-z0-9_]+)/.exec(prompt)?.[1];
      return book.scenes.find((s) => s.id === id);
    }),
    image: vi.fn(image ?? (async () => picture)),
    safeImage: vi.fn(async () => true),
  };
  const worker = new StoryWorker(models, {
    bucket: 'test',
    assetBaseUrl: 'http://assets.test',
    assetDirectory: directory,
  });
  return {
    models,
    worker,
    dispose: () => rm(directory, { recursive: true, force: true }),
    picture,
  };
}
describe('durable story workshop', () => {
  it('publishes validated text and real processed plates, then makes redelivery a no-op', async () => {
    const { models, worker, dispose } = await setup();
    try {
      expect(storyPrompt(storyBook())).toContain('Sharing water');
      await worker.run(job);
      const saved = (await db().doc('stories/story_test').get()).data()!;
      expect(saved['status']).toBe('ready');
      expect(
        Object.values(saved['images']).every((i) =>
          Boolean(i && typeof i === 'object' && 'status' in i && i.status === 'ready'),
        ),
      ).toBe(true);
      expect(models.image).toHaveBeenCalledTimes(3);
      expect(models.safeImage).toHaveBeenCalledTimes(3);
      await worker.run(job);
      expect(models.image).toHaveBeenCalledTimes(3);
    } finally {
      await dispose();
    }
  });
  it('keeps accepted art when retrying a missing image and never reports false readiness', async () => {
    const { models, worker, dispose } = await setup();
    try {
      models.image.mockRejectedValueOnce(new Error('model outage'));
      await worker.run(job);
      expect((await db().doc('stories/story_test').get()).data()?.['status']).toBe('failed');
      const firstCalls = models.image.mock.calls.length;
      await worker.run(job);
      expect(models.image.mock.calls.length - firstCalls).toBe(1);
      expect((await db().doc('stories/story_test').get()).data()?.['status']).toBe('ready');
    } finally {
      await dispose();
    }
  });
  it('does not resurrect a deleted story while an image is generating', async () => {
    let release!: (b: Buffer) => void, started!: () => void;
    const active = new Promise<void>((r) => {
      started = r;
    });
    const { worker, picture, dispose } = await setup(() => {
      started();
      return new Promise((r) => {
        release = r;
      });
    });
    try {
      const running = worker.run(job);
      await active;
      await db().doc('storyDeletionLocks/story_test').set({ uid: 'parent' });
      await db().doc('stories/story_test').delete();
      release(picture);
      await running;
      expect((await db().doc('stories/story_test').get()).exists).toBe(false);
    } finally {
      await dispose();
    }
  });
  it('refuses old generation ids before calling any models', async () => {
    const { models, worker, dispose } = await setup();
    try {
      await db().doc('stories/story_test').update({ generationId: 'newer_job' });
      await worker.run(job);
      expect(models.story).not.toHaveBeenCalled();
    } finally {
      await dispose();
    }
  });
});
