import { it, expect } from 'vitest';
import sharp from 'sharp';
import { processSprite, processMotionAtlas, assetKey } from '../src/assets';

it('registers an articulated six-pose atlas with one scale and rejects clipped cells', async () => {
  const layers = await Promise.all(
    Array.from({ length: 6 }, async (_, i) => ({
      input: await sharp({
        create: { width: 8 + i, height: 15, channels: 4, background: '#245e4e' },
      })
        .png()
        .toBuffer(),
      left: (i % 3) * 32 + 8,
      top: Math.floor(i / 3) * 32 + 8,
    })),
  );
  const source = await sharp({
    create: { width: 96, height: 64, channels: 4, background: '#ff00ff' },
  })
    .composite(layers)
    .png()
    .toBuffer();
  const atlas = await processMotionAtlas(source, 'run', 'magenta', 6);
  expect(atlas.animation).toMatchObject({ columns: 3, rows: 2, frames: 6 });
  expect([atlas.width, atlas.height]).toEqual([768, 512]);
  const widths: number[] = [],
    bottoms: number[] = [];
  for (let i = 0; i < 6; i++) {
    const { data, info } = await sharp(atlas.webp)
      .extract({ left: (i % 3) * 256, top: Math.floor(i / 3) * 256, width: 256, height: 256 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let min = 256,
      max = 0,
      bottom = 0;
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++)
        if (data[(y * 256 + x) * info.channels + 3]! > 127) {
          min = Math.min(min, x);
          max = Math.max(max, x);
          bottom = Math.max(bottom, y);
        }
    widths.push(max - min);
    bottoms.push(bottom);
    expect(data[3]).toBe(0);
  }
  expect(widths[5]).toBeGreaterThan(widths[0]! * 1.4);
  expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThanOrEqual(1);
  const clipped = await sharp({
    create: { width: 96, height: 64, channels: 4, background: '#245e4e' },
  })
    .png()
    .toBuffer();
  await expect(processMotionAtlas(clipped, 'run', 'magenta', 6)).rejects.toThrow('clipped limbs');
});

it('finds drifted transparent gutters and rejects two silhouettes in one frame', async () => {
  const layers = await Promise.all(
    Array.from({ length: 9 }, async (_, i) => ({
      input: await sharp({
        create: { width: i % 3 === 0 ? 35 : 12, height: 15, channels: 4, background: '#245e4e' },
      })
        .png()
        .toBuffer(),
      left: [3, 43, 74][i % 3]!,
      top: Math.floor(i / 3) * 32 + 8,
    })),
  );
  const source = await sharp({
    create: { width: 96, height: 96, channels: 4, background: '#ff00ff' },
  })
    .composite(layers)
    .png()
    .toBuffer();
  const atlas = await processMotionAtlas(source, 'run');
  expect(atlas.animation).toMatchObject({ columns: 3, rows: 3, frames: 9 });
  expect(atlas.height).toBe(768);
  await expect(processMotionAtlas(source, 'run', 'magenta', 6)).rejects.toThrow();
});

it('detects an unremoved colored frame even when it misses the fixed chroma thresholds', async () => {
  const input = await sharp({
    create: { width: 32, height: 32, channels: 4, background: '#b1308c' },
  })
    .png()
    .toBuffer();
  const output = await processSprite(input);
  expect(output.backgroundFraction).toBe(0);
  expect(output.borderOpaqueFraction).toBe(1);
});

it('can use a replacement chroma background without erasing a pink character', async () => {
  const input = await sharp({
    create: { width: 32, height: 32, channels: 4, background: '#00ff00' },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 12, height: 12, channels: 4, background: '#ff00ff' },
        })
          .png()
          .toBuffer(),
        left: 10,
        top: 10,
      },
    ])
    .png()
    .toBuffer();
  const output = await processSprite(input, 'green');
  expect(output.width).toBe(20);
  expect(output.backgroundFraction).toBe(0);
  expect(output.magentaFraction).toBe(1);
  const { data, info } = await sharp(output.webp)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect(data[(10 * info.width + 10) * 4 + 3]).toBe(255);
});
it('keys normalized descriptions by kind and style', () => {
  expect(assetKey('The fluffy  cloud', 'sprite', 'v1')).toBe(
    assetKey('a fluffy cloud', 'sprite', 'v1'),
  );
  expect(assetKey('cloud', 'sprite', 'v1')).not.toBe(assetKey('cloud', 'sprite', 'v2'));
});
it('removes magenta background, pads content, and emits bounded convex collider', async () => {
  const bg = await sharp({ create: { width: 32, height: 32, channels: 4, background: '#ff00ff' } })
    .png()
    .toBuffer();
  const object = await sharp({
    create: { width: 12, height: 12, channels: 4, background: '#00aa00' },
  })
    .png()
    .toBuffer();
  const input = await sharp(bg)
    .composite([{ input: object, left: 10, top: 10 }])
    .png()
    .toBuffer();
  const output = await processSprite(input);
  expect(output.width).toBe(20);
  expect(output.height).toBe(20);
  expect(output.magentaFraction).toBe(0);
  expect(output.collider.parts).toHaveLength(1);
  expect(output.collider.vertices.length).toBeGreaterThanOrEqual(3);
  const { data } = await sharp(output.webp).raw().toBuffer({ resolveWithObject: true });
  expect(data[3]).toBe(0);
});
it('preserves a concave silhouette and removes isolated specks', async () => {
  const data = Buffer.alloc(32 * 32 * 4);
  for (let y = 6; y < 24; y++)
    for (let x = 6; x < 24; x++)
      if (x < 12 || y >= 18) {
        const i = (y * 32 + x) * 4;
        data[i + 1] = 180;
        data[i + 3] = 255;
      }
  data[3] = 255;
  const input = await sharp(data, { raw: { width: 32, height: 32, channels: 4 } })
    .png()
    .toBuffer();
  const out = await processSprite(input);
  expect(out.width).toBe(26);
  expect(out.height).toBe(26);
  expect(out.collider.parts.length).toBeGreaterThan(1);
  expect(out.collider.parts.length).toBeLessThanOrEqual(12);
  expect(out.collider.vertices.length).toBeLessThanOrEqual(40);
  const area = (points: Array<{ x: number; y: number }>) =>
    Math.abs(
      points.reduce((sum, p, i) => {
        const q = points[(i + 1) % points.length]!;
        return sum + p.x * q.y - q.x * p.y;
      }, 0) / 2,
    );
  expect(out.collider.parts.reduce((sum, part) => sum + area(part), 0)).toBeCloseTo(
    area(out.collider.vertices),
  );
  expect(area(out.collider.vertices)).toBeLessThan((18 * 18) / (26 * 26));
});
