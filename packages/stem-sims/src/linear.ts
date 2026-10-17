import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from './types';

/** Graphs of y = mx + c (General Math, linear equations in two variables; Higher Math, coordinate geometry). */
export const LinearParamsSchema = z.strictObject({
  m: z.number().min(-10).max(10),
  c: z.number().min(-10).max(10),
});
export type LinearParams = z.infer<typeof LinearParamsSchema>;

const solveLine = (p: LinearParams): Observable => ({
  slope: p.m,
  intercept: p.c,
  xIntercept: p.m === 0 ? null : -p.c / p.m,
});

const tolerance = z.number().positive();

export const linearGraph: SimModel<LinearParams, 'linear-graph'> = {
  id: 'linear-graph',
  params: LinearParamsSchema,
  at: (p) => solveLine(p),
  solve: solveLine,
  predicates: {
    lineThrough: predicate(
      z.strictObject({
        points: z
          .array(z.strictObject({ x: z.number(), y: z.number() }))
          .min(1)
          .max(4),
        tol: tolerance,
      }),
      (p, _o, a) => a.points.every((pt) => Math.abs(p.m * pt.x + p.c - pt.y) <= a.tol),
    ),
    slopeEquals: predicate(z.strictObject({ m: z.number(), tol: tolerance }), (_p, o, a) =>
      within(o['slope'], a.m, a.tol),
    ),
    interceptEquals: predicate(z.strictObject({ c: z.number(), tol: tolerance }), (_p, o, a) =>
      within(o['intercept'], a.c, a.tol),
    ),
  },
};
