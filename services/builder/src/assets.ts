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
  exteriorMatte = false,
): Promise<ProcessedSprite> {
  const { data, info } = await sharp(input, { limitInputPixels: 4096 * 4096 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width,
    minY = info.height,
    maxX = -1,
    maxY = -1;
  if (exteriorMatte) {
    const samples: number[][] = [[], [], []];
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        if (x && y && x !== info.width - 1 && y !== info.height - 1) continue;
        const i = (y * info.width + x) * 4;
        if (data[i + 3]! < 128) continue;
        const distance =
          chroma === 'green'
            ? Math.hypot(data[i]!, 255 - data[i + 1]!, data[i + 2]!)
            : Math.hypot(255 - data[i]!, data[i + 1]!, 255 - data[i + 2]!);
        if (distance < 100) for (let c = 0; c < 3; c++) samples[c]!.push(data[i + c]!);
      }
    // Match the measured flat key inside closed leg/wing gaps too. This is a
    // narrow RGB match, not the broad hue despill that erased indigo scarves.
    if (samples[0]!.length > (info.width + info.height) * 1.8) {
      const key = samples.map(
        (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)]!,
      );
      for (let i = 0; i < data.length; i += 4)
        if (Math.hypot(data[i]! - key[0]!, data[i + 1]! - key[1]!, data[i + 2]! - key[2]!) < 45)
          data[i + 3] = 0;
    }
    // Native sheets often paint a slightly tinted key. Remove only key-coloured
    // paint connected to the outside, never similarly coloured interior clothing.
    const visited = new Uint8Array(info.width * info.height),
      pending: number[] = [];
    const visit = (at: number) => {
      if (visited[at]) return;
      visited[at] = 1;
      const i = at * 4,
        r = data[i]!,
        g = data[i + 1]!,
        b = data[i + 2]!;
      if (
        data[i + 3]! < 8 ||
        (chroma === 'green' ? g > 210 && r < 120 && b < 120 : r > 210 && b > 210 && g < 120)
      )
        pending.push(at);
    };
    for (let x = 0; x < info.width; x++) {
      visit(x);
      visit((info.height - 1) * info.width + x);
    }
    for (let y = 0; y < info.height; y++) {
      visit(y * info.width);
      visit(y * info.width + info.width - 1);
    }
    while (pending.length) {
      const at = pending.pop()!,
        x = at % info.width,
        y = Math.floor(at / info.width);
      data[at * 4 + 3] = 0;
      if (x) visit(at - 1);
      if (x + 1 < info.width) visit(at + 1);
      if (y) visit(at - info.width);
      if (y + 1 < info.height) visit(at + info.width);
    }
  }
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      const r = data[i] ?? 0,
        g = data[i + 1] ?? 0,
        b = data[i + 2] ?? 0;
      const distance =
        chroma === 'green' ? Math.hypot(r, 255 - g, b) : Math.hypot(255 - r, g, 255 - b);
      if (distance < 100)
        data[i + 3] = Math.round((data[i + 3] ?? 255) * Math.max(0, (distance - 45) / 55));
    }
  if (despill) {
    // Freeze the original matte: cleanup must never eat its way through purple/green clothing.
    const clear = Uint8Array.from({ length: info.width * info.height }, (_, i) =>
      data[i * 4 + 3]! < 8 ? 1 : 0,
    );
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 4;
        if (data[i + 3]! < 8) continue;
        const r = data[i]!,
          g = data[i + 1]!,
          b = data[i + 2]!;
        const keyHue =
          chroma === 'green'
            ? g > r + 50 && g > b + 50
            : r > g + 35 && b > g + 35 && Math.abs(r - b) < 70;
        if (!keyHue) continue;
        let fringe = false;
        for (let dy = -2; dy <= 2 && !fringe; dy++)
          for (let dx = -2; dx <= 2 && !fringe; dx++) {
            const px = x + dx,
              py = y + dy;
            if (
              px >= 0 &&
              py >= 0 &&
              px < info.width &&
              py < info.height &&
              clear[py * info.width + px]
            )
              fringe = true;
          }
        if (fringe) data[i + 3] = 0;
      }
  }
  // A sprite needs clear margins. A non-keyed opaque frame is background,
  // even when the model paints a different shade that misses the chroma test.
  let borderPixels = 0,
    opaqueBorder = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++) {
      const opaque = data[(y * info.width + x) * 4 + 3]! > 127;
      if (opaque) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      if (x === 0 || y === 0 || x === info.width - 1 || y === info.height - 1) {
        borderPixels++;
        if (opaque) opaqueBorder++;
      }
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

export type MotionRegistrationCode = 'BACKGROUND' | 'CLIPPED' | 'POSE_COUNT' | 'LAYOUT';
export class MotionRegistrationError extends Error {
  constructor(
    public readonly code: MotionRegistrationCode,
    message: string,
  ) {
    super(`Animation ${message}`);
    this.name = 'MotionRegistrationError';
  }
}

interface PoseComponent {
  id: number;
  area: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Extract complete keyed silhouettes before packing; nominal grid lines never cut a limb. */
export async function processMotionAtlas(
  input: Buffer,
  kind: string,
  chroma: 'magenta' | 'green' = 'magenta',
  requestedFrames: 6 | 9 | 12 | 'auto' = 9,
  maximumCell: 256 | 512 = 256,
) {
  if (requestedFrames === 'auto') {
    // Some native responses retain the previous key colour during a repair.
    // Only recognise either known key when it dominates the entire outside edge.
    const { data, info } = await sharp(input, { limitInputPixels: 4096 * 4096 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let edge = 0,
      magenta = 0,
      green = 0;
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++) {
        if (x && y && x !== info.width - 1 && y !== info.height - 1) continue;
        const i = (y * info.width + x) * 4;
        edge++;
        if (data[i + 3]! < 128) continue;
        if (Math.hypot(255 - data[i]!, data[i + 1]!, 255 - data[i + 2]!) < 100) magenta++;
        if (Math.hypot(data[i]!, 255 - data[i + 1]!, data[i + 2]!) < 100) green++;
      }
    if (magenta / edge > 0.95) chroma = 'magenta';
    else if (green / edge > 0.95) chroma = 'green';
  }
  let sheet: ProcessedSprite;
  try {
    sheet = await processSprite(input, chroma, true, true, true);
  } catch (error) {
    if (error instanceof Error && /fully transparent/.test(error.message))
      throw new MotionRegistrationError('POSE_COUNT', 'sheet contains no complete poses');
    throw error;
  }
  if (sheet.backgroundFraction > 0.02 || sheet.borderOpaqueFraction > 0.05)
    throw new MotionRegistrationError('BACKGROUND', 'sheet has unremoved background');
  if (sheet.borderOpaqueFraction > 0)
    throw new MotionRegistrationError('CLIPPED', 'sheet has unremoved background or clipped limbs');
  const { data, info } = await sharp(sheet.webp)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const labels = new Int32Array(info.width * info.height),
    components: PoseComponent[] = [];
  let nextLabel = 0;
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] || data[start * 4 + 3]! < 64) continue;
    const id = ++nextLabel,
      pending = [start];
    labels[start] = id;
    const component: PoseComponent = {
      id,
      area: 0,
      left: info.width,
      right: -1,
      top: info.height,
      bottom: -1,
    };
    while (pending.length) {
      const at = pending.pop()!,
        x = at % info.width,
        y = Math.floor(at / info.width);
      component.area++;
      component.left = Math.min(component.left, x);
      component.right = Math.max(component.right, x);
      component.top = Math.min(component.top, y);
      component.bottom = Math.max(component.bottom, y);
      for (const n of [
        x ? at - 1 : -1,
        x + 1 < info.width ? at + 1 : -1,
        y ? at - info.width : -1,
        y + 1 < info.height ? at + info.width : -1,
      ]) {
        if (n >= 0 && !labels[n] && data[n * 4 + 3]! >= 64) {
          labels[n] = id;
          pending.push(n);
        }
      }
    }
    components.push(component);
  }
  components.sort((a, b) => b.area - a.area);
  const majorCount = components.filter((c) => c.area >= (components[0]?.area ?? 0) * 0.18).length;
  const frames = requestedFrames === 'auto' ? majorCount : requestedFrames;
  if (![6, 9, 12].includes(frames))
    throw new MotionRegistrationError(
      'POSE_COUNT',
      'sheet needs six, nine or twelve complete poses',
    );
  const poses = components.slice(0, frames);
  if (poses.length !== frames || poses.at(-1)!.area < poses[0]!.area * 0.18)
    throw new MotionRegistrationError(
      'POSE_COUNT',
      `sheet needs exactly ${frames} complete distinct poses`,
    );
  if ((components[frames]?.area ?? 0) > poses.at(-1)!.area * 0.2)
    throw new MotionRegistrationError(
      'POSE_COUNT',
      'sheet contains multiple subjects in one frame or extra poses',
    );
  const members = new Map(poses.map((p) => [p.id, new Set([p.id])]));
  const originalBounds = new Map(poses.map((p) => [p.id, { ...p }]));
  // Keep nearby disconnected details, but do not silently discard another character or decoration.
  for (const fragment of components.slice(frames)) {
    const nearby = poses.filter((pose) => {
      const p = originalBounds.get(pose.id)!;
      const gap = Math.max(p.right - p.left, p.bottom - p.top) * 0.1 + 2;
      return (
        fragment.left >= p.left - gap &&
        fragment.right <= p.right + gap &&
        fragment.top >= p.top - gap &&
        fragment.bottom <= p.bottom + gap
      );
    });
    if (nearby.length !== 1) {
      if (fragment.area > 4)
        throw new MotionRegistrationError(
          'LAYOUT',
          'sheet has ambiguous detached parts or extra objects',
        );
      continue;
    }
    const pose = nearby[0]!;
    members.get(pose.id)!.add(fragment.id);
    pose.left = Math.min(pose.left, fragment.left);
    pose.right = Math.max(pose.right, fragment.right);
    pose.top = Math.min(pose.top, fragment.top);
    pose.bottom = Math.max(pose.bottom, fragment.bottom);
  }
  poses.sort((a, b) => a.top + a.bottom - b.top - b.bottom);
  const ordered: PoseComponent[] = [],
    rows = frames / 3;
  for (let row = 0; row < rows; row++) {
    const current = poses.slice(row * 3, row * 3 + 3);
    const previous = poses.slice((row - 1) * 3, row * 3);
    if (
      row &&
      Math.min(...current.map((p) => (p.top + p.bottom) / 2)) -
        Math.max(...previous.map((p) => (p.top + p.bottom) / 2)) <
        Math.max(...poses.map((p) => p.bottom - p.top)) * 0.2
    )
      throw new MotionRegistrationError('LAYOUT', 'sheet rows overlap ambiguously');
    ordered.push(...current.sort((a, b) => a.left + a.right - b.left - b.right));
  }
  if (requestedFrames === 'auto') {
    const centres = ordered.map((p) => (p.left + p.right) / 2);
    const spacing = (centres[2]! - centres[0]!) / 2;
    if (
      spacing <= 0 ||
      ordered.some(
        (p, i) =>
          Math.abs(centres[i]! - centres[i % 3]!) > spacing * 0.35 ||
          (i % 3 < 2 && p.right >= ordered[i + 1]!.left),
      )
    )
      throw new MotionRegistrationError(
        'LAYOUT',
        'sheet needs three clearly aligned separate poses per row',
      );
  }
  const cells = await Promise.all(
    ordered.map(async (pose) => {
      const left = Math.max(0, pose.left - 2),
        top = Math.max(0, pose.top - 2);
      const width = Math.min(info.width, pose.right + 3) - left,
        height = Math.min(info.height, pose.bottom + 3) - top;
      const raw = Buffer.alloc(width * height * 4),
        keep = members.get(pose.id)!;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++) {
          const source = (top + y) * info.width + left + x;
          let belongs = keep.has(labels[source]!);
          if (!belongs && data[source * 4 + 3]! >= 8 && !labels[source]) {
            for (let dy = -2; dy <= 2 && !belongs; dy++)
              for (let dx = -2; dx <= 2 && !belongs; dx++) {
                const px = left + x + dx,
                  py = top + y + dy;
                if (
                  px >= 0 &&
                  py >= 0 &&
                  px < info.width &&
                  py < info.height &&
                  keep.has(labels[py * info.width + px]!)
                )
                  belongs = true;
              }
          }
          if (belongs) data.copy(raw, (y * width + x) * 4, source * 4, source * 4 + 4);
        }
      return {
        width,
        height,
        png: await sharp(raw, { raw: { width, height, channels: 4 } })
          .png()
          .toBuffer(),
      };
    }),
  );
  const native = await sharp(input).metadata();
  // A 1K source cannot become a native 512px-per-pose sheet through upscaling.
  const cellSize =
    maximumCell === 512 &&
    native.width! >= 1536 &&
    native.height! >= rows * 512 &&
    Math.max(...cells.flatMap((c) => [c.width, c.height])) >= 448
      ? 512
      : 256;
  const scale = Math.min(
    (cellSize * 0.875) / Math.max(...cells.map((c) => c.width)),
    (cellSize * 0.875) / Math.max(...cells.map((c) => c.height)),
  );
  const layers = await Promise.all(
    cells.map(async (cell, i) => {
      const width = Math.max(1, Math.round(cell.width * scale)),
        height = Math.max(1, Math.round(cell.height * scale));
      return {
        input: await sharp(cell.png).resize(width, height).png().toBuffer(),
        left: (i % 3) * cellSize + Math.floor((cellSize - width) / 2),
        top:
          Math.floor(i / 3) * cellSize +
          (kind === 'swim' || kind === 'fly'
            ? Math.floor((cellSize - height) / 2)
            : Math.round(cellSize * 0.9375) - height),
      };
    }),
  );
  const webp = await sharp({
    create: { width: cellSize * 3, height: rows * cellSize, channels: 4, background: '#00000000' },
  })
    .composite(layers)
    .webp({ quality: 90 })
    .toBuffer();
  const vertices = [
    { x: -0.5, y: -0.5 },
    { x: 0.5, y: -0.5 },
    { x: 0.5, y: 0.5 },
    { x: -0.5, y: 0.5 },
  ];
  return {
    webp,
    width: cellSize * 3,
    height: rows * cellSize,
    animation: {
      columns: 3,
      rows,
      frames,
      anchor: { x: 0.5, y: kind === 'swim' || kind === 'fly' ? 0.5 : 0.9375 },
      content: {
        width: (Math.max(...cells.map((c) => c.width)) * scale) / cellSize,
        height: (Math.max(...cells.map((c) => c.height)) * scale) / cellSize,
      },
    },
    collider: { vertices, parts: [vertices] },
    backgroundFraction: 0,
    borderOpaqueFraction: 0,
  };
}
