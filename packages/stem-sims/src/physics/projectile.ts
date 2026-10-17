import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from '../types';

const RAD = Math.PI / 180;

/** A ball launched from a height; no air resistance. */
export const ProjectileParamsSchema = z.strictObject({
  /** Launch speed, m/s. */
  speed: z.number().min(1).max(40),
  /** Launch angle above the horizontal, degrees. */
  angle: z.number().min(0).max(90),
  /** Launch height above the ground, m. */
  height: z.number().min(0).max(50),
  /** Gravitational field strength, m/s² (Moon 1.6, Earth 9.8, Jupiter 24.8). */
  gravity: z.number().min(1.6).max(25),
});
export type ProjectileParams = z.infer<typeof ProjectileParamsSchema>;

function flight(p: ProjectileParams) {
  const vx = p.speed * Math.cos(p.angle * RAD);
  const vy = p.speed * Math.sin(p.angle * RAD);
  const time = (vy + Math.sqrt(vy * vy + 2 * p.gravity * p.height)) / p.gravity;
  return { vx, vy, time };
}

function projectileAt(p: ProjectileParams, t: number): Observable {
  const { vx, vy, time } = flight(p);
  const s = Math.min(Math.max(t, 0), time);
  return {
    t: s,
    x: vx * s,
    y: Math.max(0, p.height + vy * s - 0.5 * p.gravity * s * s),
    vx,
    vy: vy - p.gravity * s,
    landed: s >= time,
  };
}

function projectileSolve(p: ProjectileParams): Observable {
  const { vx, vy, time } = flight(p);
  const vyEnd = vy - p.gravity * time;
  return {
    range: vx * time,
    apex: p.height + (vy * vy) / (2 * p.gravity),
    apexX: (vx * vy) / p.gravity,
    flightTime: time,
    impactSpeed: Math.hypot(vx, vyEnd),
    vx,
    vy,
  };
}

export const projectile: SimModel<ProjectileParams, 'projectile'> = {
  id: 'projectile',
  params: ProjectileParamsSchema,
  solve: projectileSolve,
  at: projectileAt,
  predicates: {
    rangeEquals: predicate(
      z.strictObject({ range: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['range'], a.range, a.tol),
    ),
    apexEquals: predicate(
      z.strictObject({ apex: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['apex'], a.apex, a.tol),
    ),
    flightTimeEquals: predicate(
      z.strictObject({ time: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['flightTime'], a.time, a.tol),
    ),
    /** Lands within tol metres of a target at x. */
    hitsTarget: predicate(
      z.strictObject({ x: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['range'], a.x, a.tol),
    ),
  },
};
