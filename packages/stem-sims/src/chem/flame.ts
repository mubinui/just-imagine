import { z } from 'zod';
import { predicate, type SimModel } from '../types';

/** Textbook flame colours and their strongest visible emission lines, nm. */
export const FLAMES = {
  li: { colour: 0xd01c3a, name: { en: 'crimson', bn: 'গাঢ় লাল' }, lines: [670.8, 610.4] },
  na: { colour: 0xffb000, name: { en: 'yellow-orange', bn: 'হলুদ-কমলা' }, lines: [589.0, 589.6] },
  k: { colour: 0xc8a2e8, name: { en: 'lilac', bn: 'হালকা বেগুনি' }, lines: [766.5, 769.9, 404.4] },
  ca: {
    colour: 0xff5a1f,
    name: { en: 'orange-red', bn: 'কমলা-লাল' },
    lines: [622.0, 553.3, 422.7],
  },
  cu: {
    colour: 0x19c6a0,
    name: { en: 'blue-green', bn: 'নীলচে সবুজ' },
    lines: [521.8, 515.3, 510.6],
  },
  sr: { colour: 0xff1f3d, name: { en: 'red', bn: 'লাল' }, lines: [640.8, 606.0, 460.7] },
  ba: {
    colour: 0xa6e04a,
    name: { en: 'apple green', bn: 'আপেল সবুজ' },
    lines: [553.6, 524.2, 455.4],
  },
} as const;
export const FLAME_IONS = Object.keys(FLAMES) as (keyof typeof FLAMES)[];

export const FlameParamsSchema = z.strictObject({
  ion: z.enum(FLAME_IONS as [keyof typeof FLAMES, ...(keyof typeof FLAMES)[]]),
});
export type FlameParams = z.infer<typeof FlameParamsSchema>;

function reading(p: FlameParams) {
  const f = FLAMES[p.ion];
  return {
    colour: f.colour,
    line1: f.lines[0],
    line2: f.lines[1] ?? null,
    line3: f.lines[2] ?? null,
  };
}

export const flameTest: SimModel<FlameParams, 'flame-test'> = {
  id: 'flame-test',
  params: FlameParamsSchema,
  solve: reading,
  at: reading,
  predicates: {
    ionIs: predicate(
      z.strictObject({ ion: FlameParamsSchema.shape.ion }),
      (p, _o, a) => p.ion === a.ion,
    ),
  },
};
