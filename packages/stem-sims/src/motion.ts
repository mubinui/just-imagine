import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from './types';

/** NCTB Physics Ch 2 (Motion): uniform acceleration along a straight track. */
export const MotionParamsSchema = z.strictObject({
  /** Initial velocity, m/s. */
  u: z.number().min(0).max(20),
  /** Acceleration, m/s²; negative means braking. */
  a: z.number().min(-5).max(5),
  /** Length of the run, s. */
  duration: z.number().min(2).max(20),
});
export type MotionParams = z.infer<typeof MotionParamsSchema>;

/** When a braking body comes to rest within the run, else null. Braking never reverses it. */
export function stopTime(p: MotionParams): number | null {
  if (p.a >= 0) return null;
  const t = p.u / -p.a;
  return t <= p.duration ? t : null;
}

function motionAt(p: MotionParams, t: number) {
  const time = Math.min(Math.max(t, 0), p.duration);
  const stop = stopTime(p);
  const moving = stop === null ? time : Math.min(time, stop);
  return {
    t: time,
    x: p.u * moving + 0.5 * p.a * moving * moving,
    v: p.u + p.a * moving,
  };
}

const tolerance = z.number().positive();

export const motionGraphs: SimModel<MotionParams, 'motion-graphs'> = {
  id: 'motion-graphs',
  params: MotionParamsSchema,
  at: (p, t): Observable => motionAt(p, t),
  solve(p): Observable {
    const end = motionAt(p, p.duration);
    const stop = stopTime(p);
    return {
      duration: p.duration,
      finalX: end.x,
      finalV: end.v,
      stopTime: stop,
      stopDistance: stop === null ? null : end.x,
    };
  },
  predicates: {
    stopsAt: predicate(z.strictObject({ x: z.number(), tol: tolerance }), (_p, o, a) =>
      within(o['stopDistance'], a.x, a.tol),
    ),
    reachesSpeed: predicate(z.strictObject({ v: z.number(), tol: tolerance }), (_p, o, a) =>
      within(o['finalV'], a.v, a.tol),
    ),
    displacementEquals: predicate(z.strictObject({ x: z.number(), tol: tolerance }), (_p, o, a) =>
      within(o['finalX'], a.x, a.tol),
    ),
  },
};
