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
  backgroundFraction: number;
  borderOpaqueFraction: number;
}
export async function processSprite(
  input: Buffer,
  chroma: 'magenta' | 'green' = 'magenta',
  despill = false,
  boundsCollider = false,
): Promise<ProcessedSprite> {
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
      const distance =
        chroma === 'green' ? Math.hypot(r, 255 - g, b) : Math.hypot(255 - r, g, 255 - b);
      // Animation strips amplify a keyed fringe at every frame. Their matte also
      // removes darker shades of the key hue; a colliding character hue retries green.
      if (
        despill &&
        (chroma === 'green'
          ? g > r + 50 && g > b + 50
          : r > g + 35 && b > g + 35 && Math.abs(r - b) < 70)
      )
        data[i + 3] = 0;
      if (distance < 100)
        data[i + 3] = Math.round((data[i + 3] ?? 255) * Math.max(0, (distance - 45) / 55));
      if ((data[i + 3] ?? 0) > 127) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  // A sprite needs clear margins. A non-keyed opaque frame is background,
  // even when the model paints a different shade that misses the chroma test.
  let borderPixels = 0,
    opaqueBorder = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) {
        borderPixels++;
        if (data[(y * info.width + x) * 4 + 3]! > 127) opaqueBorder++;
      }
  const borderOpaqueFraction = opaqueBorder / Math.max(1, borderPixels);
  if (maxX < minX) throw new Error('Generated sprite is fully transparent');
  const bounds = [
    { x: minX, y: minY },
    { x: maxX + 1, y: minY },
    { x: maxX + 1, y: maxY + 1 },
    { x: minX, y: maxY + 1 },
  ];
  // Locomotion uses one stable body proxy; triangulating every furry pose is
  // both unnecessary and brittle. Ordinary silhouette colliders are unchanged.
  const outline = boundsCollider
    ? { vertices: bounds, parts: [bounds] }
    : alphaOutline(data, info.width, info.height);
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
    background = 0,
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
        if (
          chroma === 'green'
            ? (data[i + 1] ?? 0) > 180 && (data[i] ?? 0) < 100 && (data[i + 2] ?? 0) < 100
            : (data[i] ?? 0) > 180 && (data[i + 2] ?? 0) > 180 && (data[i + 1] ?? 0) < 100
        )
          background++;
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
    backgroundFraction: background / Math.max(1, opaque),
    borderOpaqueFraction,
  };
}

/** Normalize generated poses with one shared scale; keep fixed cell registration. */
export async function processMotionAtlas(
  input: Buffer,
  kind: string,
  chroma: 'magenta' | 'green' = 'magenta',
  frames: 6 | 9 = 9,
) {
  const { data, info } = await sharp(input, { limitInputPixels: 4096 * 4096 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Generated gutters drift: choose the nearby transparent valley instead of
  // slicing limbs at nominal thirds/halves. Unremoved backgrounds still fail below.
  const cut = (axis: 'x' | 'y', nominal: number, radius: number, from: number, to: number) => {
    let best = Math.round(nominal),
      lowest = Infinity;
    for (let n = Math.ceil(nominal - radius); n <= Math.floor(nominal + radius); n++) {
      let occupied = 0;
      for (let p = from; p < to; p++) {
        for (let offset = -2; offset <= 2; offset++) {
          const line = Math.max(
            0,
            Math.min((axis === 'x' ? info.width : info.height) - 1, n + offset),
          );
          const at = ((axis === 'x' ? p : line) * info.width + (axis === 'x' ? line : p)) * 4;
          const r = data[at]!,
            g = data[at + 1]!,
            b = data[at + 2]!;
          const keyed =
            chroma === 'green'
              ? Math.hypot(r, 255 - g, b) < 100
              : Math.hypot(255 - r, g, 255 - b) < 100;
          if (!keyed && data[at + 3]! > 127) occupied++;
        }
      }
      if (
        occupied < lowest ||
        (occupied === lowest && Math.abs(n - nominal) < Math.abs(best - nominal))
      ) {
        lowest = occupied;
        best = n;
      }
    }
    return best;
  };
  const rows = frames / 3;
  const rowEdges = [
    0,
    ...Array.from({ length: rows - 1 }, (_, i) =>
      cut('y', (info.height * (i + 1)) / rows, info.height / (rows * 4), 0, info.width),
    ),
    info.height,
  ];
  const cells: ProcessedSprite[] = [];
  for (let i = 0; i < frames; i++) {
    const top = rowEdges[Math.floor(i / 3)]!,
      bottom = rowEdges[Math.floor(i / 3) + 1]!;
    const edges = [
      0,
      cut('x', info.width / 3, info.width / 10, top, bottom),
      cut('x', (info.width * 2) / 3, info.width / 10, top, bottom),
      info.width,
    ];
    const left = edges[i % 3]!;
    const raw = await sharp(input)
      .extract({
        left,
        top,
        width: edges[(i % 3) + 1]! - left,
        height: bottom - top,
      })
      .png()
      .toBuffer();
    const cell = await processSprite(raw, chroma, true, true);
    if (cell.backgroundFraction > 0.02 || cell.borderOpaqueFraction > 0.05)
      throw new Error('Animation cell has unremoved background or clipped limbs');
    const decoded = await sharp(cell.webp)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const seen = new Uint8Array(decoded.info.width * decoded.info.height),
      areas: number[] = [];
    for (let start = 0; start < seen.length; start++) {
      if (seen[start] || decoded.data[start * 4 + 3]! < 128) continue;
      const pending = [start];
      seen[start] = 1;
      let area = 0;
      while (pending.length) {
        const at = pending.pop()!,
          x = at % decoded.info.width,
          y = Math.floor(at / decoded.info.width);
        area++;
        for (const n of [
          x ? at - 1 : -1,
          x + 1 < decoded.info.width ? at + 1 : -1,
          y ? at - decoded.info.width : -1,
          y + 1 < decoded.info.height ? at + decoded.info.width : -1,
        ])
          if (n >= 0 && !seen[n] && decoded.data[n * 4 + 3]! >= 128) {
            seen[n] = 1;
            pending.push(n);
          }
      }
      areas.push(area);
    }
    areas.sort((a, b) => b - a);
    if (areas.length > 1 && areas[1]! > areas[0]! * 0.2)
      throw new Error('Animation grid contains multiple subjects in one frame');
    cells.push(cell);
  }
  const scale = Math.min(
    224 / Math.max(...cells.map((c) => c.width)),
    224 / Math.max(...cells.map((c) => c.height)),
  );
  const layers = await Promise.all(
    cells.map(async (cell, i) => {
      const width = Math.round(cell.width * scale),
        height = Math.round(cell.height * scale);
      return {
        input: await sharp(cell.webp).resize(width, height).png().toBuffer(),
        left: (i % 3) * 256 + Math.floor((256 - width) / 2),
        top:
          Math.floor(i / 3) * 256 +
          (kind === 'swim' || kind === 'fly' ? Math.floor((256 - height) / 2) : 240 - height),
      };
    }),
  );
  const webp = await sharp({
    create: { width: 768, height: rows * 256, channels: 4, background: '#00000000' },
  })
    .composite(layers)
    .webp({ quality: 90 })
    .toBuffer();
  return {
    webp,
    width: 768,
    height: rows * 256,
    animation: {
      columns: 3,
      rows,
      frames,
      anchor: { x: 0.5, y: kind === 'swim' || kind === 'fly' ? 0.5 : 240 / 256 },
      content: {
        width: (Math.max(...cells.map((c) => c.width)) * scale) / 256,
        height: (Math.max(...cells.map((c) => c.height)) * scale) / 256,
      },
    },
    collider: {
      vertices: [
        { x: -0.5, y: -0.5 },
        { x: 0.5, y: -0.5 },
        { x: 0.5, y: 0.5 },
        { x: -0.5, y: 0.5 },
      ],
      parts: [
        [
          { x: -0.5, y: -0.5 },
          { x: 0.5, y: -0.5 },
          { x: 0.5, y: 0.5 },
          { x: -0.5, y: 0.5 },
        ],
      ],
    },
    backgroundFraction: 0,
    borderOpaqueFraction: 0,
  };
}
