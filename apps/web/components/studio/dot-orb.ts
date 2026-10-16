// Pure geometry for the dotted orb, kept separate from the canvas component so it is testable.
export interface OrbPoint {
  x: number;
  y: number;
  z: number;
}

/** Evenly spread points on a unit sphere (Fibonacci lattice). */
export function fibonacciSphere(count: number): OrbPoint[] {
  const points: OrbPoint[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / Math.max(1, count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    points.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return points;
}

export type OrbMode = 'idle' | 'listening' | 'speaking';

/**
 * Projects a point after rotating it around the Y and X axes, with a radial wobble that grows with
 * the mode's energy. Returns screen coordinates relative to the centre, a size and an alpha.
 */
export function projectPoint(
  p: OrbPoint,
  t: number,
  radius: number,
  mode: OrbMode,
): { sx: number; sy: number; size: number; alpha: number; depth: number } {
  const spin = mode === 'speaking' ? 0.55 : mode === 'listening' ? 0.32 : 0.16;
  const ay = t * spin;
  const ax = 0.42 + Math.sin(t * 0.21) * 0.12;
  const x1 = p.x * Math.cos(ay) + p.z * Math.sin(ay);
  const z1 = -p.x * Math.sin(ay) + p.z * Math.cos(ay);
  const y2 = p.y * Math.cos(ax) - z1 * Math.sin(ax);
  const z2 = p.y * Math.sin(ax) + z1 * Math.cos(ax);
  const energy = mode === 'speaking' ? 0.09 : mode === 'listening' ? 0.045 : 0.018;
  const wobble = 1 + energy * Math.sin(t * (mode === 'speaking' ? 7 : 3) + p.y * 6 + p.x * 4);
  const breathe = 1 + (mode === 'listening' ? 0.03 * Math.sin(t * 2.2) : 0);
  const r = radius * wobble * breathe;
  const perspective = 2.6;
  const scale = perspective / (perspective - z2);
  const depth = (z2 + 1) / 2;
  return {
    sx: x1 * r * scale,
    sy: y2 * r * scale,
    size: (0.9 + depth * 2.1) * (radius / 120),
    alpha: 0.18 + depth * 0.82,
    depth,
  };
}
