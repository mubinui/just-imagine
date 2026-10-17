import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from './types';

export const MAX_RESISTORS = 3;

/** NCTB Physics Ch 11 (Current electricity): one cell and up to three resistors or bulbs. */
export const CircuitParamsSchema = z.strictObject({
  /** Cell EMF, V; the cell is ideal (no internal resistance). */
  emf: z.number().min(1.5).max(12),
  topology: z.enum(['series', 'parallel']),
  /** Ohms. */
  resistors: z.array(z.number().min(1).max(100)).min(1).max(MAX_RESISTORS),
});
export type CircuitParams = z.infer<typeof CircuitParamsSchema>;

function solveCircuit(p: CircuitParams): Observable {
  const series = p.topology === 'series';
  const req = series
    ? p.resistors.reduce((sum, r) => sum + r, 0)
    : 1 / p.resistors.reduce((sum, r) => sum + 1 / r, 0);
  const current = p.emf / req;
  const out: Record<string, number | null> = { req, current };
  for (let index = 0; index < MAX_RESISTORS; index++) {
    const r = p.resistors[index];
    if (r === undefined) {
      out[`v${index}`] = out[`i${index}`] = out[`p${index}`] = null;
      continue;
    }
    const i = series ? current : p.emf / r;
    out[`v${index}`] = i * r;
    out[`i${index}`] = i;
    out[`p${index}`] = i * i * r;
  }
  return out;
}

export const ohmsCircuit: SimModel<CircuitParams, 'ohms-circuit'> = {
  id: 'ohms-circuit',
  params: CircuitParamsSchema,
  at: (p) => solveCircuit(p),
  solve: solveCircuit,
  predicates: {
    currentEquals: predicate(
      z.strictObject({ i: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['current'], a.i, a.tol),
    ),
    powerAtLeast: predicate(
      z.strictObject({
        index: z
          .number()
          .int()
          .min(0)
          .max(MAX_RESISTORS - 1),
        p: z.number().nonnegative(),
      }),
      (_p, o, a) => {
        const power = o[`p${a.index}`];
        return typeof power === 'number' && power >= a.p;
      },
    ),
  },
};
