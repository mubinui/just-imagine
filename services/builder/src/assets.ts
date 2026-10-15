import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { alphaOutline } from './outline';
export function assetKey(description: string, kind: string, styleVersion: string): string {
  const normalized = description
    .toLowerCase()
    .replace(/\b(a|an|the)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return createHash('sha256')
    .update(JSON.stringify([normalized, kind, styleVersion]))
    .digest('hex');
}
export interface ProcessedSprite {
  webp: Buffer;
  width: number;
  height: number;
  collider: {
    vertices: Array<{ x: number; y: number }>;
    parts: Array<Array<{ x: number; y: number }>>;
  };
  magentaFraction: number;
}
export async function processSprite(input: Buffer): Promise<ProcessedSprite> {
  const { data, info } = await sharp(input, { limitInputPixels: 4096 * 4096 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width,
    minY = info.height,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const r = data[i] ?? 0,
        g = data[i + 1] ?? 0,
        b = data[i + 2] ?? 0;
      const distance = Math.hypot(255 - r, g, 255 - b);
      if (distance < 100)
        data[i + 3] = Math.round((data[i + 3] ?? 255) * Math.max(0, (distance - 45) / 55));
      if ((data[i + 3] ?? 0) > 127) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  const outline = alphaOutline(data, info.width, info.height);
  minX = info.width;
  minY = info.height;
  maxX = -1;
  maxY = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3]! > 127) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
  if (maxX < minX) throw new Error('Generated sprite is fully transparent');
  let magenta = 0,
    opaque = 0;
  const points: Array<{ x: number; y: number }> = [];
  for (let y = minY; y <= maxY; y++) {
    let left = -1,
      right = -1;
    for (let x = minX; x <= maxX; x++) {
      const i = (y * info.width + x) * 4;
      if ((data[i + 3] ?? 0) > 127) {
        opaque++;
        if ((data[i] ?? 0) > 180 && (data[i + 2] ?? 0) > 180 && (data[i + 1] ?? 0) < 100) magenta++;
        if (left < 0) left = x;
        right = x;
      }
    }
    if (left >= 0) {
      points.push({ x: left, y }, { x: right, y });
    }
  }
  const width = maxX - minX + 1,
    height = maxY - minY + 1;
  const normalize = (p: { x: number; y: number }) => ({
    x: (p.x - minX + 4) / (width + 8) - 0.5,
    y: (p.y - minY + 4) / (height + 8) - 0.5,
  });
  const vertices = outline.vertices.map(normalize),
    parts = outline.parts.map((part) => part.map(normalize));
  const webp = await sharp(data, { raw: info })
    .extract({ left: minX, top: minY, width, height })
    .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90 })
    .toBuffer();
  return {
    webp,
    width: width + 8,
    height: height + 8,
    collider: { vertices, parts },
    magentaFraction: magenta / Math.max(1, opaque),
  };
}
