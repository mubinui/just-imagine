import { it, expect } from 'vitest';
import sharp from 'sharp';
import { processSprite, assetKey } from '../src/assets';
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
