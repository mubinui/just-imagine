import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from '../types';

const R = 8.314;
/** Activation energies, J/mol: a catalyst offers a lower-energy pathway. */
const EA = 50000;
const EA_CATALYST = 35000;
/** Seconds for half the reactant to react under the reference conditions. */
export const REFERENCE_HALF_LIFE_S = 20;
const REFERENCE = { temperature: 25, concentration: 1, catalyst: false, surface: 'lumps' as const };

export const RateParamsSchema = z.strictObject({
  /** °C */
  temperature: z.number().min(5).max(80),
  /** mol/dm³ */
  concentration: z.number().min(0.1).max(2),
  catalyst: z.boolean(),
  surface: z.enum(['lumps', 'chips', 'powder']),
});
export type RateParams = z.infer<typeof RateParamsSchema>;

function rate(p: RateParams) {
  const k = Math.exp(-(p.catalyst ? EA_CATALYST : EA) / (R * (p.temperature + 273.15)));
  const surface = p.surface === 'powder' ? 4 : p.surface === 'chips' ? 2 : 1;
  return k * p.concentration * surface;
}

function rateAt(p: RateParams, t: number): Observable {
  const relative = rate(p) / rate(REFERENCE);
  const halfLife = REFERENCE_HALF_LIFE_S / relative;
  return {
    t,
    relativeRate: relative,
    halfLife,
    product: 1 - Math.pow(0.5, Math.max(0, t) / halfLife),
  };
}

export const reactionRate: SimModel<RateParams, 'reaction-rate'> = {
  id: 'reaction-rate',
  params: RateParamsSchema,
  solve: (p) => rateAt(p, 60),
  at: rateAt,
  predicates: {
    fasterThanReference: predicate(
      z.strictObject({ factor: z.number().positive() }),
      (_p, o, a) => (o['relativeRate'] as number) >= a.factor,
    ),
    halfLifeEquals: predicate(
      z.strictObject({ seconds: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['halfLife'], a.seconds, a.tol),
    ),
  },
};
