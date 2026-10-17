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
  await expect(processMotionAtlas(clipped, 'run', 'magenta', 6)).rejects.toThrow(
    'unremoved background',
  );
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

it('keeps a whole tail beyond nominal grid gutters and rejects an extra subject', async () => {
  const data = Buffer.alloc(180 * 180 * 4);
  const rect = (
    left: number,
    top: number,
    width: number,
    height: number,
    color = [30, 80, 120],
  ) => {
    for (let y = top; y < top + height; y++)
      for (let x = left; x < left + width; x++) {
        const at = (y * 180 + x) * 4;
        data[at] = color[0]!;
        data[at + 1] = color[1]!;
        data[at + 2] = color[2]!;
        data[at + 3] = 255;
      }
  };
  for (let row = 0; row < 3; row++) {
    rect(65, 12 + row * 55, 20, 20);
    rect(5, 20 + row * 55, 65, 3); // Complete tail crosses the old divider's search window.
    rect(5, 20 + row * 55, 5, 3, [240, 80, 20]);
    rect(95, 12 + row * 55, 20, 20);
    rect(143, 12 + row * 55, 20, 20);
  }
  const encode = () =>
    sharp(data, { raw: { width: 180, height: 180, channels: 4 } })
      .png()
      .toBuffer();
  const atlas = await processMotionAtlas(await encode(), 'run');
  for (let row = 0; row < 3; row++) {
    const frame = await sharp(atlas.webp)
      .extract({ left: 0, top: row * 256, width: 256, height: 256 })
      .ensureAlpha()
      .raw()
      .toBuffer();
    let tip = 0;
    for (let i = 0; i < frame.length; i += 4)
      if (frame[i]! > 180 && frame[i + 1]! < 130 && frame[i + 2]! < 80 && frame[i + 3]! > 127)
        tip++;
    expect(tip).toBeGreaterThan(20);
  }
  rect(110, 155, 18, 18);
  await expect(processMotionAtlas(await encode(), 'run')).rejects.toMatchObject({
    code: 'POSE_COUNT',
  });
});

it('uses native frame detail when available and never labels a small sheet as high resolution', async () => {
  const layers = await Promise.all(
    Array.from({ length: 9 }, async (_, i) => ({
      input: await sharp({
        create: { width: 470, height: 230, channels: 4, background: '#306080' },
      })
        .png()
        .toBuffer(),
      left: (i % 3) * 680 + 60,
      top: Math.floor(i / 3) * 680 + 120,
    })),
  );
  const source = await sharp({
    create: { width: 2048, height: 2048, channels: 4, background: '#00000000' },
  })
    .composite(layers)
    .png()
    .toBuffer();
  const native = await processMotionAtlas(source, 'swim', 'magenta', 9, 512);
  expect([native.width, native.height]).toEqual([1536, 1536]);
  const smaller = await sharp(source).resize(1024, 1024).png().toBuffer();
  const low = await processMotionAtlas(smaller, 'swim', 'magenta', 9, 512);
  expect([low.width, low.height]).toEqual([768, 768]);
  expect(native.animation.anchor).toEqual({ x: 0.5, y: 0.5 });
});

it('rejects a clipped limb even when only a few edge pixels are opaque', async () => {
  const source = await sharp({
    create: { width: 96, height: 96, channels: 4, background: '#00000000' },
  })
    .composite([
      {
        input: await sharp({ create: { width: 2, height: 2, channels: 4, background: '#306080' } })
          .png()
          .toBuffer(),
        left: 0,
        top: 20,
      },
    ])
    .png()
    .toBuffer();
  await expect(processMotionAtlas(source, 'run')).rejects.toMatchObject({ code: 'CLIPPED' });
});

it('rejects painted floor guides that join otherwise separate running poses', async () => {
  const layers = await Promise.all(
    Array.from({ length: 9 }, async (_, i) => ({
      input: await sharp({ create: { width: 12, height: 15, channels: 4, background: '#306080' } })
        .png()
        .toBuffer(),
      left: (i % 3) * 32 + 8,
      top: Math.floor(i / 3) * 32 + 8,
    })),
  );
  for (let row = 0; row < 3; row++)
    layers.push({
      input: await sharp({ create: { width: 84, height: 2, channels: 4, background: '#303030' } })
        .png()
        .toBuffer(),
      left: 5,
      top: row * 32 + 22,
    });
  const source = await sharp({
    create: { width: 96, height: 96, channels: 4, background: '#00000000' },
  })
    .composite(layers)
    .png()
    .toBuffer();
  await expect(processMotionAtlas(source, 'run')).rejects.toMatchObject({ code: 'POSE_COUNT' });
});

it('preserves a dark purple scarf connecting a complete pose instead of erasing its interior', async () => {
  const layers = [];
  for (let i = 0; i < 9; i++) {
    const top = Math.floor(i / 3) * 40 + 5,
      left = (i % 3) * 40 + 10;
    for (const [dy, height, color] of [
      [0, 8, '#306080'],
      [8, 8, '#4b0082'],
      [16, 12, '#306080'],
    ] as const)
      layers.push({
        input: await sharp({ create: { width: 20, height, channels: 4, background: color } })
          .png()
          .toBuffer(),
        left,
        top: top + dy,
      });
  }
  const source = await sharp({
    create: { width: 120, height: 120, channels: 4, background: '#ff00ff' },
  })
    .composite(layers)
    .png()
    .toBuffer();
  const atlas = await processMotionAtlas(source, 'run');
  expect(atlas.animation.frames).toBe(9);
  const { data } = await sharp(atlas.webp)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let purple = 0;
  for (let i = 0; i < data.length; i += 4)
    if (
      data[i]! > 40 &&
      data[i]! < 110 &&
      data[i + 1]! < 25 &&
      data[i + 2]! > 95 &&
      data[i + 2]! < 160 &&
      data[i + 3]! > 240
    )
      purple++;
  expect(purple).toBeGreaterThan(1000);
});

it('registers complete six/nine/twelve-pose cycles and detects a retained key colour on repair', async () => {
  for (const count of [6, 9, 12]) {
    const source = await sharp({
      create: { width: 120, height: (count / 3) * 40, channels: 4, background: '#ff00ff' },
    })
      .composite(
        await Promise.all(
          Array.from({ length: count }, async (_, i) => ({
            input: await sharp({
              create: { width: 20, height: 24, channels: 4, background: '#306080' },
            })
              .png()
              .toBuffer(),
            left: (i % 3) * 40 + 10,
            top: Math.floor(i / 3) * 40 + 8,
          })),
        ),
      )
      .png()
      .toBuffer();
    const atlas = await processMotionAtlas(source, 'run', 'green', 'auto');
    expect(atlas.animation).toMatchObject({ columns: 3, rows: count / 3, frames: count });
    expect(atlas.height).toBe((count / 3) * 256);
  }
});

it('does not interpret extra subjects, uneven rows or arbitrary backgrounds as another valid cycle', async () => {
  const make = async (count: number, uneven = false, background = '#ff00ff') =>
    sharp({ create: { width: 160, height: 160, channels: 4, background } })
      .composite(
        await Promise.all(
          Array.from({ length: count }, async (_, i) => ({
            input: await sharp({
              create: { width: 12, height: 16, channels: 4, background: '#306080' },
            })
              .png()
              .toBuffer(),
            left: (i % (uneven ? 4 : 3)) * 32 + 8,
            top: Math.floor(i / (uneven ? 4 : 3)) * 40 + 8,
          })),
        ),
      )
      .png()
      .toBuffer();
  await expect(processMotionAtlas(await make(10), 'run', 'magenta', 'auto')).rejects.toMatchObject({
    code: 'POSE_COUNT',
  });
  await expect(
    processMotionAtlas(await make(12, true), 'run', 'magenta', 'auto'),
  ).rejects.toMatchObject({ code: 'LAYOUT' });
  await expect(
    processMotionAtlas(await make(9, false, '#b1308c'), 'run', 'magenta', 'auto'),
  ).rejects.toMatchObject({ code: 'BACKGROUND' });
});

it('clears tinted exterior and closed gaps while preserving a distinct near-key interior detail', async () => {
  const actor = await sharp({
    create: { width: 24, height: 24, channels: 4, background: '#306080' },
  })
    .composite([
      {
        input: await sharp({ create: { width: 4, height: 4, channels: 4, background: '#ff39fe' } })
          .png()
          .toBuffer(),
        left: 3,
        top: 9,
      },
      {
        input: await sharp({ create: { width: 8, height: 8, channels: 4, background: '#ff73ff' } })
          .png()
          .toBuffer(),
        left: 8,
        top: 8,
      },
    ])
    .png()
    .toBuffer();
  const source = await sharp({
    create: { width: 120, height: 120, channels: 4, background: '#ff39fe' },
  })
    .composite(
      Array.from({ length: 9 }, (_, i) => ({
        input: actor,
        left: (i % 3) * 40 + 8,
        top: Math.floor(i / 3) * 40 + 8,
      })),
    )
    .png()
    .toBuffer();
  const atlas = await processMotionAtlas(source, 'run', 'green', 'auto');
  const { data, info } = await sharp(atlas.webp)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let retained = 0,
    residualKey = 0,
    edge = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (
        data[i]! > 210 &&
        data[i + 1]! > 90 &&
        data[i + 1]! < 140 &&
        data[i + 2]! > 210 &&
        data[i + 3]! > 240
      )
        retained++;
      if (data[i]! > 210 && data[i + 1]! < 90 && data[i + 2]! > 210 && data[i + 3]! > 127)
        residualKey++;
      if ((!x || !y || x === info.width - 1 || y === info.height - 1) && data[i + 3]! > 0) edge++;
    }
  expect(retained).toBeGreaterThan(1000);
  expect(residualKey).toBe(0);
  expect(edge).toBe(0);
});
