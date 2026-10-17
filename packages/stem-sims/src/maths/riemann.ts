import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from '../types';
import { curveShape, evaluate, VIEW, type CurveParams } from './curve';

export const RIEMANN_RULES = ['left', 'right', 'midpoint', 'trapezoid'] as const;

/** Area under a curve: n strips under f on [from, to], converging on the integral. */
export const RiemannParamsSchema = z
  .strictObject({
    ...curveShape,
    from: z.number().min(VIEW.min).max(VIEW.max),
    to: z.number().min(VIEW.min).max(VIEW.max),
    n: z.number().int().min(1).max(200),
    rule: z.enum(RIEMANN_RULES),
  })
  .refine((p) => p.to > p.from, { message: 'The interval must run left to right.' });
export type RiemannParams = z.infer<typeof RiemannParamsSchema>;

function riemannSum(p: RiemannParams): number | null {
  const h = (p.to - p.from) / p.n;
  let sum = 0;
  for (let i = 0; i < p.n; i++) {
    const left = p.from + i * h;
    let height: number | null;
    if (p.rule === 'trapezoid') {
      const a = evaluate(p, left),
        b = evaluate(p, left + h);
      height = a === null || b === null ? null : (a + b) / 2;
    } else {
      const at = p.rule === 'left' ? left : p.rule === 'right' ? left + h : left + h / 2;
      height = evaluate(p, at);
    }
    if (height === null) return null;
    sum += height * h;
  }
  return sum;
}

const SIMPSON = 2000;

/** The integral by composite Simpson's rule, or null when f is undefined somewhere on the interval. */
export function integral(p: CurveParams, from: number, to: number): number | null {
  const h = (to - from) / SIMPSON;
  let sum = 0;
  for (let i = 0; i <= SIMPSON; i++) {
    const y = evaluate(p, from + i * h);
    if (y === null) return null;
    sum += y * (i === 0 || i === SIMPSON ? 1 : i % 2 === 1 ? 4 : 2);
  }
  return (sum * h) / 3;
}

function solveArea(p: RiemannParams): Observable {
  const estimate = riemannSum(p),
    exact = integral(p, p.from, p.to);
  return {
    n: p.n,
    width: (p.to - p.from) / p.n,
    estimate,
    exact,
    error: estimate === null || exact === null ? null : Math.abs(estimate - exact),
  };
}

const tol = z.number().positive();

export const riemannArea: SimModel<RiemannParams, 'riemann-area'> = {
  id: 'riemann-area',
  params: RiemannParamsSchema,
  solve: solveArea,
  at: (p) => solveArea(p),
  predicates: {
    estimateEquals: predicate(z.strictObject({ area: z.number(), tol }), (_p, o, a) =>
      within(o['estimate'], a.area, a.tol),
    ),
    errorBelow: predicate(z.strictObject({ tol }), (_p, o, a) => {
      const e = o['error'];
      return typeof e === 'number' && e <= a.tol;
    }),
  },
};
