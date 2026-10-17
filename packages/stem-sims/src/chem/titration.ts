import { z } from 'zod';
import { predicate, within, type SimModel } from '../types';
import { INDICATOR_COLOURS, KW, indicatorColour } from './ph';

const KA_ETHANOIC = 1.8e-5;

/** An acid in a flask titrated with 0.0–2× its equivalence volume of NaOH. */
export const TitrationParamsSchema = z.strictObject({
  acid: z.enum(['hcl', 'ethanoic']),
  /** mol/dm³ */
  acidConcentration: z.number().min(0.01).max(1),
  /** cm³ */
  acidVolume: z.number().min(5).max(50),
  /** mol/dm³ NaOH in the burette */
  baseConcentration: z.number().min(0.01).max(1),
  /** cm³ of NaOH added so far */
  baseAdded: z.number().min(0).max(100),
  indicator: z.enum(['phenolphthalein', 'methylOrange', 'bromothymol', 'universal']),
});
export type TitrationParams = z.infer<typeof TitrationParamsSchema>;

export function titrationPh(p: TitrationParams): number {
  const acid = (p.acidConcentration * p.acidVolume) / 1000;
  const base = (p.baseConcentration * p.baseAdded) / 1000;
  const volume = (p.acidVolume + p.baseAdded) / 1000;
  if (p.acid === 'hcl') {
    if (Math.abs(acid - base) < 1e-12) return 7;
    return acid > base
      ? -Math.log10((acid - base) / volume)
      : 14 + Math.log10((base - acid) / volume);
  }
  if (base === 0) {
    const c = acid / volume;
    return -Math.log10((-KA_ETHANOIC + Math.sqrt(KA_ETHANOIC ** 2 + 4 * KA_ETHANOIC * c)) / 2);
  }
  if (base < acid - 1e-12) return -Math.log10(KA_ETHANOIC) + Math.log10(base / (acid - base));
  if (base <= acid + 1e-12) {
    const salt = acid / volume;
    const kb = KW / KA_ETHANOIC;
    return 14 + Math.log10(Math.sqrt(kb * salt));
  }
  return 14 + Math.log10((base - acid) / volume);
}

export const titration: SimModel<TitrationParams, 'titration'> = {
  id: 'titration',
  params: TitrationParamsSchema,
  solve: (p) => {
    const ph = titrationPh(p);
    return {
      ph,
      equivalenceVolume: (p.acidConcentration * p.acidVolume) / p.baseConcentration,
      colour: INDICATOR_COLOURS[indicatorColour(p.indicator, ph)],
    };
  },
  at: (p) => {
    const ph = titrationPh(p);
    return { ph, colour: INDICATOR_COLOURS[indicatorColour(p.indicator, ph)] };
  },
  predicates: {
    equivalenceVolumeEquals: predicate(
      z.strictObject({ volume: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['equivalenceVolume'], a.volume, a.tol),
    ),
    endPointReached: predicate(z.strictObject({ tol: z.number().positive() }), (p, o, a) =>
      within(p.baseAdded, o['equivalenceVolume'] as number, a.tol),
    ),
    phEquals: predicate(
      z.strictObject({ ph: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['ph'], a.ph, a.tol),
    ),
  },
};
