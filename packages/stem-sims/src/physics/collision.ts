import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from '../types';

/** Gap between the two carts' centres at the start, m. */
export const COLLISION_GAP_M = 6;
/** Width of each cart, m; they touch when their centres are this far apart. */
export const CART_WIDTH_M = 0.6;

/** Two carts on a straight track; restitution 1 is elastic, 0 sticks together. */
export const CollisionParamsSchema = z
  .strictObject({
    m1: z.number().min(0.1).max(10),
    m2: z.number().min(0.1).max(10),
    /** Initial velocities, m/s (positive to the right). */
    u1: z.number().min(-10).max(10),
    u2: z.number().min(-10).max(10),
    restitution: z.number().min(0).max(1),
  })
  .refine((p) => p.u1 > p.u2, { message: 'The carts must be moving towards each other.' });
export type CollisionParams = z.infer<typeof CollisionParamsSchema>;

function outcome(p: CollisionParams) {
  const total = p.m1 + p.m2;
  const momentum = p.m1 * p.u1 + p.m2 * p.u2;
  const v1 = (momentum + p.m2 * p.restitution * (p.u2 - p.u1)) / total;
  const v2 = (momentum + p.m1 * p.restitution * (p.u1 - p.u2)) / total;
  const keBefore = 0.5 * p.m1 * p.u1 ** 2 + 0.5 * p.m2 * p.u2 ** 2;
  const keAfter = 0.5 * p.m1 * v1 ** 2 + 0.5 * p.m2 * v2 ** 2;
  return {
    v1,
    v2,
    momentumBefore: momentum,
    momentumAfter: p.m1 * v1 + p.m2 * v2,
    keBefore,
    keAfter,
    keLost: keBefore - keAfter,
    contactTime: (COLLISION_GAP_M - CART_WIDTH_M) / (p.u1 - p.u2),
  };
}

function collisionAt(p: CollisionParams, t: number): Observable {
  const o = outcome(p);
  const s = Math.max(0, t);
  const before = s < o.contactTime;
  const tc = Math.min(s, o.contactTime);
  const x1c = -COLLISION_GAP_M / 2 + p.u1 * tc,
    x2c = COLLISION_GAP_M / 2 + p.u2 * tc;
  const after = Math.max(0, s - o.contactTime);
  return {
    t: s,
    collided: !before,
    x1: x1c + (before ? 0 : o.v1 * after),
    x2: x2c + (before ? 0 : o.v2 * after),
    v1: before ? p.u1 : o.v1,
    v2: before ? p.u2 : o.v2,
  };
}

export const collision: SimModel<CollisionParams, 'collision'> = {
  id: 'collision',
  params: CollisionParamsSchema,
  solve: outcome,
  at: collisionAt,
  predicates: {
    finalVelocityEquals: predicate(
      z.strictObject({ cart: z.enum(['1', '2']), v: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o[a.cart === '1' ? 'v1' : 'v2'], a.v, a.tol),
    ),
    keLostEquals: predicate(
      z.strictObject({ joules: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['keLost'], a.joules, a.tol),
    ),
  },
};
