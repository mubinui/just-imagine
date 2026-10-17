import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from '../types';
import { curveShape, evaluate, roots, VIEW } from './curve';

/** Function grapher: a curve family with adjustable coefficients and a probe point x. */
export const GrapherParamsSchema = z.strictObject({
  ...curveShape,
  x: z.number().min(VIEW.min).max(VIEW.max),
});
export type GrapherParams = z.infer<typeof GrapherParamsSchema>;

function solveGraph(p: GrapherParams): Observable {
  const r = roots(p);
  const vertex = p.family === 'quadratic' && p.a !== 0 ? -p.b / (2 * p.a) : null;
  return {
    x: p.x,
    value: evaluate(p, p.x),
    yIntercept: evaluate(p, 0),
    vertexX: vertex,
    vertexY: vertex === null ? null : evaluate(p, vertex),
    rootCount: r.length,
    root1: r[0] ?? null,
    root2: r[1] ?? null,
    root3: r[2] ?? null,
  };
}

const tol = z.number().positive();

export const functionGrapher: SimModel<GrapherParams, 'function-grapher'> = {
  id: 'function-grapher',
  params: GrapherParamsSchema,
  solve: solveGraph,
  at: (p) => solveGraph(p),
  predicates: {
    valueEquals: predicate(z.strictObject({ y: z.number(), tol }), (_p, o, a) =>
      within(o['value'], a.y, a.tol),
    ),
    interceptEquals: predicate(z.strictObject({ y: z.number(), tol }), (_p, o, a) =>
      within(o['yIntercept'], a.y, a.tol),
    ),
    // Recomputed from params so a root beyond the third shown is still found.
    hasRoot: predicate(z.strictObject({ x: z.number(), tol }), (p, _o, a) =>
      roots(p).some((r) => Math.abs(r - a.x) <= a.tol),
    ),
    vertexAt: predicate(
      z.strictObject({ x: z.number(), y: z.number(), tol }),
      (_p, o, a) => within(o['vertexX'], a.x, a.tol) && within(o['vertexY'], a.y, a.tol),
    ),
  },
};
