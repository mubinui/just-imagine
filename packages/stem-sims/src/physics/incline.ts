import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from '../types';

const RAD = Math.PI / 180;
/** Seconds the slide lasts on screen; solve() reports this moment. */
export const INCLINE_HORIZON_S = 4;

/** A block on a rough slope: weight, normal reaction and friction. */
export const InclineParamsSchema = z
  .strictObject({
    mass: z.number().min(0.5).max(20),
    angle: z.number().min(0).max(60),
    muS: z.number().min(0).max(1),
    muK: z.number().min(0).max(1),
    gravity: z.number().min(1.6).max(25),
  })
  .refine((p) => p.muK <= p.muS, { message: 'Kinetic friction cannot exceed static friction.' });
export type InclineParams = z.infer<typeof InclineParamsSchema>;

function forces(p: InclineParams) {
  const r = p.angle * RAD;
  const weight = p.mass * p.gravity;
  const normal = weight * Math.cos(r);
  const along = weight * Math.sin(r);
  const staticLimit = p.muS * normal;
  if (along <= staticLimit)
    return { weight, normal, along, friction: along, net: 0, a: 0, slides: false, staticLimit };
  const friction = p.muK * normal;
  const net = along - friction;
  return { weight, normal, along, friction, net, a: net / p.mass, slides: true, staticLimit };
}

function inclineAt(p: InclineParams, t: number): Observable {
  const f = forces(p);
  const s = Math.min(Math.max(t, 0), INCLINE_HORIZON_S);
  return { ...f, t: s, distance: 0.5 * f.a * s * s, v: f.a * s };
}

export const incline: SimModel<InclineParams, 'incline'> = {
  id: 'incline',
  params: InclineParamsSchema,
  solve: (p) => inclineAt(p, INCLINE_HORIZON_S),
  at: inclineAt,
  predicates: {
    slides: predicate(
      z.strictObject({ slides: z.boolean() }),
      (_p, o, a) => o['slides'] === a.slides,
    ),
    accelerationEquals: predicate(
      z.strictObject({ a: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['a'], a.a, a.tol),
    ),
    netForceEquals: predicate(
      z.strictObject({ net: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['net'], a.net, a.tol),
    ),
  },
};
