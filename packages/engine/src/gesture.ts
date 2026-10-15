import type { Vec2 } from '@just-imagine/scene-schema';
export interface PointerSample extends Vec2 {
  time: number;
}
/** Keep the last 80ms, retaining the point immediately before its boundary. */
export function recordPointer(samples: PointerSample[], point: PointerSample) {
  samples.push(point);
  while (samples.length > 2 && samples[1]!.time < point.time - 80) samples.shift();
  while (samples.length > 128) samples.shift();
}
export function pointerVelocity(samples: readonly PointerSample[]): Vec2 {
  const first = samples[0],
    last = samples.at(-1);
  if (!first || !last) return { x: 0, y: 0 };
  const dt = (last.time - first.time) / 1000;
  if (dt <= 0) return { x: 0, y: 0 };
  const vx = (last.x - first.x) / dt,
    vy = (last.y - first.y) / dt,
    length = Math.hypot(vx, vy),
    scale = length > 20 ? 20 / length : 1;
  return { x: vx * scale, y: vy * scale };
}
