import { z } from 'zod';
import { predicate, within, type SimModel } from '../types';

export const KW = 1e-14;
const KA_ETHANOIC = 1.8e-5;
const KB_AMMONIA = 1.8e-5;

/** Named indicator colours as 0xRRGGBB numbers (readings are numeric). */
export const INDICATOR_COLOURS = {
  red: 0xd7263d,
  orange: 0xf28c28,
  yellow: 0xf6d743,
  green: 0x3fa34d,
  blue: 0x2f6fd1,
  purple: 0x7b4fb6,
  pink: 0xf06292,
  magenta: 0xc2185b,
  colourless: 0xf4f7f6,
  violet: 0x5b2c8e,
} as const;
export type IndicatorColour = keyof typeof INDICATOR_COLOURS;
export const SUBSTANCES = ['hcl', 'naoh', 'ethanoic', 'ammonia', 'water'] as const;
export const INDICATORS = [
  'universal',
  'litmus',
  'phenolphthalein',
  'methylOrange',
  'bromothymol',
] as const;

export const PhParamsSchema = z.strictObject({
  substance: z.enum(SUBSTANCES),
  /** mol/dm³ */
  concentration: z.number().min(0.0001).max(1),
  indicator: z.enum(INDICATORS),
});
export type PhParams = z.infer<typeof PhParamsSchema>;

/** pH of the solution at 25 °C (strong acids/bases fully dissociated; weak ones by K). */
export function phOf(substance: PhParams['substance'], c: number): number {
  switch (substance) {
    case 'hcl':
      return -Math.log10(c);
    case 'naoh':
      return 14 + Math.log10(c);
    case 'ethanoic': {
      const h = (-KA_ETHANOIC + Math.sqrt(KA_ETHANOIC ** 2 + 4 * KA_ETHANOIC * c)) / 2;
      return -Math.log10(h);
    }
    case 'ammonia': {
      const oh = (-KB_AMMONIA + Math.sqrt(KB_AMMONIA ** 2 + 4 * KB_AMMONIA * c)) / 2;
      return 14 + Math.log10(oh);
    }
    case 'water':
      return 7;
  }
}

/** The indicator's colour at a pH, from its real transition ranges. */
export function indicatorColour(indicator: PhParams['indicator'], ph: number): IndicatorColour {
  switch (indicator) {
    case 'litmus':
      return ph < 4.5 ? 'red' : ph > 8.3 ? 'blue' : 'purple';
    case 'phenolphthalein':
      // Colourless in acid and neutral, pink from 8.2, fading again only in very strong alkali.
      return ph < 8.2 ? 'colourless' : ph <= 10 ? 'pink' : ph <= 12.5 ? 'magenta' : 'colourless';
    case 'methylOrange':
      return ph < 3.1 ? 'red' : ph <= 4.4 ? 'orange' : 'yellow';
    case 'bromothymol':
      return ph < 6 ? 'yellow' : ph <= 7.6 ? 'green' : 'blue';
    case 'universal':
      return ph < 3
        ? 'red'
        : ph < 5
          ? 'orange'
          : ph < 6.5
            ? 'yellow'
            : ph <= 7.5
              ? 'green'
              : ph < 10
                ? 'blue'
                : ph < 12
                  ? 'purple'
                  : 'violet';
  }
}

export const phIndicator: SimModel<PhParams, 'ph-indicator'> & {
  colourCode(name: IndicatorColour): number;
} = {
  id: 'ph-indicator',
  params: PhParamsSchema,
  colourCode: (name) => INDICATOR_COLOURS[name],
  solve: (p) => {
    const ph = phOf(p.substance, p.concentration);
    return {
      ph,
      colour: INDICATOR_COLOURS[indicatorColour(p.indicator, ph)],
      acidic: ph < 7,
      alkaline: ph > 7,
    };
  },
  at: (p) => {
    const ph = phOf(p.substance, p.concentration);
    return {
      ph,
      colour: INDICATOR_COLOURS[indicatorColour(p.indicator, ph)],
      acidic: ph < 7,
      alkaline: ph > 7,
    };
  },
  predicates: {
    phEquals: predicate(
      z.strictObject({ ph: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['ph'], a.ph, a.tol),
    ),
    indicatorShows: predicate(
      z.strictObject({
        colour: z.enum(Object.keys(INDICATOR_COLOURS) as [IndicatorColour, ...IndicatorColour[]]),
      }),
      (_p, o, a) => o['colour'] === INDICATOR_COLOURS[a.colour],
    ),
  },
};
