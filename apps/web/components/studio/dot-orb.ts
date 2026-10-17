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

/** Smoothed orb motion: rotation and wobble accumulate, so a mode change never jumps. */
export interface OrbMotion {
  time: number;
  angle: number;
  phase: number;
  spin: number;
  frequency: number;
  energy: number;
  breathe: number;
}

const MOTION: Record<
  OrbMode,
  { spin: number; frequency: number; energy: number; breathe: number }
> = {
  idle: { spin: 0.16, frequency: 3, energy: 0.018, breathe: 0 },
  listening: { spin: 0.32, frequency: 3, energy: 0.045, breathe: 0.03 },
  speaking: { spin: 0.55, frequency: 7, energy: 0.09, breathe: 0 },
};
/** Seconds for the orb to settle most of the way into a new mode. */
const ORB_EASE_SECONDS = 0.6;

export const restingOrb = (mode: OrbMode = 'listening'): OrbMotion => ({
  time: 0,
  angle: 0,
  phase: 0,
  ...MOTION[mode],
});

/** Eases toward the mode's motion and integrates rotation and wobble over the elapsed time. */
export function advanceOrb(motion: OrbMotion, mode: OrbMode, milliseconds: number): OrbMotion {
  const dt = Math.max(0, Math.min(100, milliseconds)) / 1000;
  const ease = 1 - Math.exp(-dt / ORB_EASE_SECONDS);
  const target = MOTION[mode];
  const toward = (from: number, to: number) => from + (to - from) * ease;
  const spin = toward(motion.spin, target.spin);
  const frequency = toward(motion.frequency, target.frequency);
  return {
    time: motion.time + dt,
    angle: motion.angle + spin * dt,
    phase: motion.phase + frequency * dt,
    spin,
    frequency,
    energy: toward(motion.energy, target.energy),
    breathe: toward(motion.breathe, target.breathe),
  };
}

/** Projects a point for the given motion state; returns screen offsets, size, alpha and depth. */
export function projectMotion(
  p: OrbPoint,
  motion: OrbMotion,
  radius: number,
): { sx: number; sy: number; size: number; alpha: number; depth: number } {
  const ay = motion.angle;
  const ax = 0.42 + Math.sin(motion.time * 0.21) * 0.12;
  const x1 = p.x * Math.cos(ay) + p.z * Math.sin(ay);
  const z1 = -p.x * Math.sin(ay) + p.z * Math.cos(ay);
  const y2 = p.y * Math.cos(ax) - z1 * Math.sin(ax);
  const z2 = p.y * Math.sin(ax) + z1 * Math.cos(ax);
  const wobble = 1 + motion.energy * Math.sin(motion.phase + p.y * 6 + p.x * 4);
  const breathe = 1 + motion.breathe * Math.sin(motion.time * 2.2);
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

/**
 * Projects a point at time `t` for a steady mode (no transition): rotation, wobble and breathing
 * at that mode's full motion. Used where the orb is not animated between modes.
 */
export function projectPoint(
  p: OrbPoint,
  t: number,
  radius: number,
  mode: OrbMode,
): { sx: number; sy: number; size: number; alpha: number; depth: number } {
  const m = MOTION[mode];
  return projectMotion(p, { time: t, angle: t * m.spin, phase: t * m.frequency, ...m }, radius);
}
