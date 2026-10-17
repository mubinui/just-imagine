import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from '../types';
import { curveShape, evaluate, slope, VIEW } from './curve';

/** Derivative as slope: the tangent line to a curve at x, and the slope it shows. */
export const DerivativeParamsSchema = z.strictObject({
  ...curveShape,
  x: z.number().min(VIEW.min).max(VIEW.max),
});
export type DerivativeParams = z.infer<typeof DerivativeParamsSchema>;

function solveTangent(p: DerivativeParams): Observable {
  const y = evaluate(p, p.x),
    m = slope(p, p.x);
  return {
    x: p.x,
    y,
    slope: m,
    tangentIntercept: y === null || m === null ? null : y - m * p.x,
  };
}

const tol = z.number().positive();

export const derivative: SimModel<DerivativeParams, 'derivative'> = {
  id: 'derivative',
  params: DerivativeParamsSchema,
  solve: solveTangent,
  at: (p) => solveTangent(p),
  predicates: {
    slopeEquals: predicate(z.strictObject({ slope: z.number(), tol }), (_p, o, a) =>
      within(o['slope'], a.slope, a.tol),
    ),
    slopeSign: predicate(
      z.strictObject({ sign: z.enum(['positive', 'negative', 'zero']), tol }),
      (_p, o, a) => {
        const m = o['slope'];
        if (typeof m !== 'number') return false;
        if (a.sign === 'zero') return Math.abs(m) <= a.tol;
        return a.sign === 'positive' ? m > a.tol : m < -a.tol;
      },
    ),
  },
};
