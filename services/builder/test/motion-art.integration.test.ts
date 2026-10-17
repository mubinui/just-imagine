import { it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { db, writeDoc } from '@just-imagine/server-core';
import { UserDocSchema, paths, type BuildWorldJob } from '@just-imagine/protocol';
import type { Locomotion } from '@just-imagine/scene-schema';
import { BuilderWorker } from '../src/worker';
import type { VertexModels } from '../src/vertex';
import { assetKey } from '../src/assets';
import { motionArt } from '../src/motion';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';

async function sheet(frames = 9) {
  const layers = await Promise.all(
    Array.from({ length: frames }, async (_, i) => ({
      input: await sharp({ create: { width: 14, height: 18, channels: 4, background: '#306080' } })
        .png()
        .toBuffer(),
      left: (i % 3) * 32 + 8,
      top: Math.floor(i / 3) * 32 + 7,
    })),
  );
  return sharp({
    create: { width: 96, height: (frames / 3) * 32, channels: 4, background: '#00000000' },
  })
    .composite(layers)
    .png()
    .toBuffer();
}
async function setup(
  suffix: string,
  image: ReturnType<typeof vi.fn>,
  safeImage: ReturnType<typeof vi.fn>,
) {
  const uid = 'motion_art_' + suffix;
  await writeDoc(paths.user(uid), UserDocSchema, {
    email: 'qa@example.test',
    displayName: 'QA',
    consentAt: 1,
    plan: 'free',
    stripeCustomerId: null,
    createdAt: 1,
  });
  const directory = await mkdtemp(join(tmpdir(), 'ji-motion-art-'));
  const worker = new BuilderWorker({ image, safeImage } as unknown as VertexModels, {
    bucket: 'unused',
    assetDirectory: directory,
    assetBaseUrl: 'https://owned.test',
  });
  const job: BuildWorldJob = {
    kind: 'build',
    uid,
    childId: 'c_motion',
    jobId: 'j_' + suffix,
    worldId: 'w_' + suffix,
    sessionId: 's_' + suffix,
    plan: 'free',
    ageBand: '8-10',
    tier: 'playground',
    description: 'A child idea',
    concepts: [],
    styleVersion: 'v1',
    promptVersion: 'v1',
    conversationSummary: '',
  };
  const request = {
    id: 'actor',
    kind: 'sprite',
    hero: false,
    description: 'A friendly blue creature ' + suffix,
    locomotion: { kind: 'run', stride: 1, facing: 'right' } as Locomotion,
  };
  const cache = db().doc(
    paths.assetCache(
      assetKey(
        request.description,
        'sprite',
        `v1:motion-v5:${JSON.stringify(motionArt(request.locomotion))}`,
      ),
    ),
  );
  const asset = () =>
    (
      worker as unknown as {
        asset: (
          j: BuildWorldJob,
          r: typeof request,
        ) => Promise<{ animation: { frames: number }; url: string }>;
      }
    ).asset(job, request);
  return {
    asset,
    cache,
    directory,
    cleanup: () => rm(directory, { recursive: true, force: true }),
  };
}

it('repairs layout against its original image, reviews the result and only then publishes/cache-reuses it', async () => {
  const clipped = await sharp({
    create: { width: 96, height: 96, channels: 4, background: '#306080' },
  })
    .png()
    .toBuffer();
  const valid = await sheet(12),
    image = vi.fn().mockResolvedValueOnce(clipped).mockResolvedValue(valid),
    safeImage = vi.fn<VertexModels['safeImage']>(async () => true);
  const h = await setup('repair', image, safeImage);
  try {
    const result = await h.asset();
    expect(result.animation.frames).toBe(12);
    expect(safeImage.mock.calls[0]?.[1]).toContain('12-frame');
    expect(image).toHaveBeenCalledTimes(2);
    expect(image.mock.calls[0]!.slice(1, 4)).toEqual([true, false, true]);
    expect(image.mock.calls[0]![4]).toEqual({ imageSize: '2K' });
    expect(image.mock.calls[1]![0]).toContain('perfectly flat replacement background');
    expect(image.mock.calls[1]![0]).toContain('green #00FF00');
    expect(image.mock.calls[1]![4].reference).toBeInstanceOf(Buffer);
    expect(safeImage).toHaveBeenCalledOnce();
    expect((await h.cache.get()).data()?.['safetyChecked']).toBe(true);
    expect(await h.asset()).toMatchObject({ url: result.url });
    expect(image).toHaveBeenCalledTimes(2);
  } finally {
    await h.cleanup();
  }
});

it('does not supply a rejected sheet as a reference or cache/write it as approved artwork', async () => {
  const image = vi.fn<VertexModels['image']>(async () => sheet()),
    safeImage = vi.fn(async () => false),
    h = await setup('rejected', image, safeImage);
  try {
    await expect(h.asset()).rejects.toThrow('safety or background checks');
    expect(image).toHaveBeenCalledTimes(2);
    expect(safeImage).toHaveBeenCalledTimes(2);
    expect(image.mock.calls[1]![4]).toEqual({ imageSize: '2K' });
    expect((await h.cache.get()).exists).toBe(false);
    expect(await readdir(h.directory)).toEqual([]);
  } finally {
    await h.cleanup();
  }
});

it('keeps failed registration bounded and never publishes an incomplete sheet', async () => {
  const image = vi.fn<VertexModels['image']>(async () =>
      sharp({ create: { width: 32, height: 32, channels: 4, background: '#306080' } })
        .png()
        .toBuffer(),
    ),
    safeImage = vi.fn<VertexModels['safeImage']>(async () => true),
    h = await setup('invalid', image, safeImage);
  try {
    await expect(h.asset()).rejects.toMatchObject({ code: 'BACKGROUND' });
    expect(image).toHaveBeenCalledTimes(2);
    expect(safeImage).not.toHaveBeenCalled();
    expect((await h.cache.get()).exists).toBe(false);
    expect(await readdir(h.directory)).toEqual([]);
  } finally {
    await h.cleanup();
  }
});
