import { z } from 'zod';
import { predicate, within, type SimModel } from '../types';

const R = 8.314;

/** An ideal gas in a piston: PV = nRT with P in kPa and V in dm³. */
export const GasParamsSchema = z.strictObject({
  /** mol */
  amount: z.number().min(0.1).max(5),
  /** K */
  temperature: z.number().min(100).max(800),
  /** dm³ */
  volume: z.number().min(1).max(50),
});
export type GasParams = z.infer<typeof GasParamsSchema>;

function reading(p: GasParams) {
  return {
    pressure: (p.amount * R * p.temperature) / p.volume,
    /** Root-mean-square speed relative to 300 K, for the particle animation. */
    relativeSpeed: Math.sqrt(p.temperature / 300),
  };
}

export const gasLaw: SimModel<GasParams, 'gas-law'> = {
  id: 'gas-law',
  params: GasParamsSchema,
  solve: reading,
  at: reading,
  predicates: {
    pressureEquals: predicate(
      z.strictObject({ kPa: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['pressure'], a.kPa, a.tol),
    ),
  },
};
