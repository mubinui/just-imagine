import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from './types';

/** NCTB uses g = 9.8 m/s². */
export const G = 9.8;
/** Seconds the cart run lasts; solve() reports this moment. */
export const CART_HORIZON_S = 5;

/** NCTB Physics Ch 3 (Force): a cart pushed along a rough floor. */
export const CartParamsSchema = z
  .strictObject({
    /** kg */
    mass: z.number().min(0.5).max(10),
    /** Applied horizontal force, N. */
    force: z.number().min(0).max(60),
    /** Coefficient of static friction. */
    muS: z.number().min(0).max(0.8),
    /** Coefficient of kinetic friction. */
    muK: z.number().min(0).max(0.8),
  })
  .refine((p) => p.muK <= p.muS, { message: 'Kinetic friction cannot exceed static friction.' });
export type CartParams = z.infer<typeof CartParamsSchema>;

function dynamics(p: CartParams) {
  const normal = p.mass * G;
  const staticLimit = p.muS * normal;
  if (p.force <= staticLimit)
    return { moving: false, a: 0, friction: p.force, net: 0, staticLimit };
  const friction = p.muK * normal;
  const net = p.force - friction;
  return { moving: true, a: net / p.mass, friction, net, staticLimit };
}

function cartAt(p: CartParams, t: number): Observable {
  const d = dynamics(p);
  const time = Math.min(Math.max(t, 0), CART_HORIZON_S);
  return { t: time, x: 0.5 * d.a * time * time, v: d.a * time, ...d };
}

export const newtonCart: SimModel<CartParams, 'newton-cart'> = {
  id: 'newton-cart',
  params: CartParamsSchema,
  at: cartAt,
  solve: (p) => cartAt(p, CART_HORIZON_S),
  predicates: {
    /** Moving, with the push no more than 2% above the static limit. */
    justMoves: predicate(
      z.strictObject({}),
      (p, o) =>
        o['moving'] === true &&
        typeof o['staticLimit'] === 'number' &&
        p.force <= o['staticLimit'] * 1.02,
    ),
    accelerationEquals: predicate(
      z.strictObject({ a: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['a'], a.a, a.tol),
    ),
  },
};
