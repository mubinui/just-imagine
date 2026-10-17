import { describe, it, expect } from 'vitest';
import {
  checkLabTask,
  gradeLabSubmission,
  indicatorColour,
  mix,
  mixKey,
  MixError,
  ReactionSchema,
  type Reaction,
  type Reagent,
} from '../src/chem/lab';

const name = (en: string, bn: string) => ({ en, bn });
const reagents: Reagent[] = [
  {
    id: 'hcl',
    formula: 'HCl',
    name: name('Hydrochloric acid', 'হাইড্রোক্লোরিক এসিড'),
    kind: 'acid',
    state: 'aq',
    ph: 1,
    colour: '#eaf3f5',
  },
  {
    id: 'naoh',
    formula: 'NaOH',
    name: name('Sodium hydroxide', 'সোডিয়াম হাইড্রক্সাইড'),
    kind: 'base',
    state: 'aq',
    ph: 13,
    colour: '#eaf3f5',
  },
  {
    id: 'cuco3',
    formula: 'CuCO3',
    name: name('Copper carbonate', 'কপার কার্বনেট'),
    kind: 'carbonate',
    state: 's',
    colour: '#3f8f6b',
  },
  {
    id: 'phenolphthalein',
    formula: 'C20H14O4',
    name: name('Phenolphthalein', 'ফেনলফথালিন'),
    kind: 'indicator',
    state: 'aq',
    colour: '#f2f2f2',
  },
  {
    id: 'litmus',
    formula: null,
    name: name('Litmus', 'লিটমাস'),
    kind: 'indicator',
    state: 'aq',
    colour: '#8e6bb0',
  },
];
const reactions: Reaction[] = [
  ReactionSchema.parse({
    id: 'neutral-hcl-naoh',
    reagents: ['hcl', 'naoh'],
    requires: { heat: false },
    equation: 'HCl + NaOH -> NaCl + H2O',
    products: [
      { formula: 'NaCl', state: 'aq', name: name('Sodium chloride', 'সোডিয়াম ক্লোরাইড') },
      { formula: 'H2O', state: 'l', name: name('Water', 'পানি') },
    ],
    observations: { tempChange: 'up' },
    phAfter: 7,
    explanation: name(
      'An acid and a base neutralise each other.',
      'এসিড ও ক্ষার একে অপরকে প্রশমিত করে।',
    ),
  }),
  ReactionSchema.parse({
    id: 'heat-cuco3',
    reagents: ['cuco3'],
    requires: { heat: true },
    equation: 'CuCO3 -> CuO + CO2',
    products: [
      { formula: 'CuO', state: 's', name: name('Copper oxide', 'কপার অক্সাইড') },
      { formula: 'CO2', state: 'g', name: name('Carbon dioxide', 'কার্বন ডাইঅক্সাইড') },
    ],
    observations: { colourTo: '#1f1f1f', gas: 'CO2', tempChange: 'none' },
    explanation: name('Heat breaks copper carbonate down.', 'তাপে কপার কার্বনেট ভেঙে যায়।'),
  }),
];

describe('indicators', () => {
  it('colours by pH band', () => {
    expect(indicatorColour('litmus', 1)).toBe('#d1495b');
    expect(indicatorColour('litmus', 13)).toBe('#3d6fb6');
    expect(indicatorColour('phenolphthalein', 7)).toBeNull();
    expect(indicatorColour('phenolphthalein', 9)).toBe('#e85d9b');
    expect(indicatorColour('methyl-orange', 2)).toBe('#d1495b');
    expect(indicatorColour('methyl-orange', 6)).toBe('#f2c14e');
  });
});

describe('mix', () => {
  it('finds a reaction regardless of order and applies its pH to the indicator', () => {
    const result = mix(
      { reagentIds: ['naoh', 'phenolphthalein', 'hcl'], heat: false },
      reagents,
      reactions,
    );
    expect(result.reaction?.id).toBe('neutral-hcl-naoh');
    expect(result.ph).toBe(7);
    expect(result.indicator).toEqual({ id: 'phenolphthalein', colour: null });
    expect(result.key).toBe('hcl+naoh');
  });

  it('shows a lone solution pH through the indicator with no reaction', () => {
    const result = mix(
      { reagentIds: ['naoh', 'phenolphthalein'], heat: false },
      reagents,
      reactions,
    );
    expect(result.reaction).toBeNull();
    expect(result.ph).toBe(13);
    expect(result.indicator?.colour).toBe('#e85d9b');
  });

  it('needs heat for a heat-only reaction', () => {
    expect(mix({ reagentIds: ['cuco3'], heat: false }, reagents, reactions).reaction).toBeNull();
    expect(mix({ reagentIds: ['cuco3'], heat: true }, reagents, reactions).reaction?.id).toBe(
      'heat-cuco3',
    );
  });

  it('collapses duplicates and refuses unknown reagents', () => {
    expect(
      mix({ reagentIds: ['hcl', 'hcl', 'naoh'], heat: false }, reagents, reactions).reaction?.id,
    ).toBe('neutral-hcl-naoh');
    expect(() => mix({ reagentIds: ['hcl', 'tnt'], heat: false }, reagents, reactions)).toThrow(
      MixError,
    );
  });

  it('builds stable cache keys', () => {
    expect(mixKey(['naoh', 'hcl', 'hcl'], false)).toBe('hcl+naoh');
    expect(mixKey(['cuco3'], true)).toBe('cuco3|heat');
  });
});

describe('checkLabTask', () => {
  it('checks colour, pH, gas and precipitate goals', () => {
    const neutral = mix(
      { reagentIds: ['hcl', 'naoh', 'litmus'], heat: false },
      reagents,
      reactions,
    );
    expect(checkLabTask(neutral, { predicate: 'pHBetween', min: 6.5, max: 7.5 })).toBe(true);
    expect(checkLabTask(neutral, { predicate: 'solutionColour', colour: '#8e6bb0' })).toBe(true);
    const heated = mix({ reagentIds: ['cuco3'], heat: true }, reagents, reactions);
    expect(checkLabTask(heated, { predicate: 'producedGas', gas: 'CO2' })).toBe(true);
    expect(checkLabTask(heated, { predicate: 'solutionColour', colour: '#1f1f1f' })).toBe(true);
    expect(checkLabTask(heated, { predicate: 'formedPrecipitate', formula: 'CuO' })).toBe(false);
  });
});

describe('gradeLabSubmission', () => {
  const item = { reagentIds: ['hcl', 'naoh', 'litmus'] };
  const neutral = { predicate: 'pHBetween', min: 6.5, max: 7.5 } as const;

  it('refuses a reagent the item does not offer', () => {
    expect(
      gradeLabSubmission(
        item,
        { reagentIds: ['hcl', 'cuco3'], heat: true },
        neutral,
        reagents,
        reactions,
      ),
    ).toEqual({ ok: false, reason: 'reagent-not-offered' });
  });

  it('grades offered reagents on the recomputed mix', () => {
    const met = gradeLabSubmission(
      item,
      { reagentIds: ['naoh', 'hcl', 'litmus'], heat: false },
      neutral,
      reagents,
      reactions,
    );
    expect(met.ok && met.met).toBe(true);
    expect(met.ok && met.result.reaction?.id).toBe('neutral-hcl-naoh');
    const missed = gradeLabSubmission(
      item,
      { reagentIds: ['hcl', 'litmus'], heat: false },
      neutral,
      reagents,
      reactions,
    );
    expect(missed).toMatchObject({ ok: true, met: false });
  });

  it('reports an offered id the bench does not know as unknown-reagent', () => {
    expect(
      gradeLabSubmission(
        { reagentIds: ['hcl', 'tnt'] },
        { reagentIds: ['hcl', 'tnt'], heat: false },
        neutral,
        reagents,
        reactions,
      ),
    ).toEqual({ ok: false, reason: 'unknown-reagent' });
  });
});

describe('supported quantitative pH', () => {
  const amount = (concentrationM: number, volumeMl = 50) => ({ concentrationM, volumeMl });
  const more: Reagent[] = [
    ...reagents,
    {
      id: 'h2so4',
      formula: 'H2SO4',
      name: name('Sulfuric acid', 'সালফিউরিক এসিড'),
      kind: 'acid',
      state: 'aq',
      ph: 1,
      colour: '#eaf3f5',
    },
    {
      id: 'koh',
      formula: 'KOH',
      name: name('Potassium hydroxide', 'পটাশিয়াম হাইড্রক্সাইড'),
      kind: 'base',
      state: 'aq',
      ph: 13,
      colour: '#eaf3f5',
    },
    {
      id: 'limewater',
      formula: 'Ca(OH)2',
      name: name('Limewater', 'চুনের পানি'),
      kind: 'base',
      state: 'aq',
      ph: 12.4,
      colour: '#eaf3f5',
    },
    {
      id: 'fe',
      formula: 'Fe',
      name: name('Iron', 'লোহা'),
      kind: 'metal',
      state: 's',
      colour: '#eaf3f5',
    },
  ];
  it('computes neutral, excess-acid and excess-base pH from monoprotic equivalents', () => {
    const run = (acidMl: number, baseMl: number) =>
      mix(
        {
          reagentIds: ['hcl', 'naoh'],
          heat: false,
          amounts: { hcl: amount(0.1, acidMl), naoh: amount(0.1, baseMl) },
        },
        more,
        reactions,
      );
    expect(run(50, 50).ph).toBeCloseTo(7, 10);
    expect(run(100, 50).ph).toBeCloseTo(-Math.log10(0.005 / 0.15), 10);
    expect(run(50, 100).ph).toBeCloseTo(14 + Math.log10(0.005 / 0.15), 10);
    expect(run(50, 100).quantities?.productsMoles.NaCl).toBeCloseTo(0.005, 10);
  });
  it('supports both concentration bounds and potassium hydroxide without a reaction table entry', () => {
    expect(
      mix({ reagentIds: ['hcl'], heat: false, amounts: { hcl: amount(0.001) } }, more, reactions)
        .ph,
    ).toBeCloseTo(3, 6);
    const result = mix(
      { reagentIds: ['koh', 'phenolphthalein'], heat: false, amounts: { koh: amount(0.1) } },
      more,
      reactions,
    );
    expect(result.ph).toBeCloseTo(13, 6);
    expect(result.indicator?.colour).toBe('#e85d9b');
  });
  it('does not invent pH or indicator colour for sulfuric acid, limewater or reacting solids', () => {
    for (const ids of [['h2so4'], ['limewater'], ['hcl', 'fe']]) {
      const amounts = Object.fromEntries(
        ids.filter((id) => id !== 'fe').map((id) => [id, amount(0.1)]),
      );
      const result = mix({ reagentIds: [...ids, 'litmus'], heat: false, amounts }, more, reactions);
      expect(result.ph).toBeNull();
      expect(result.indicator?.colour).toBeNull();
      expect(checkLabTask(result, { predicate: 'pHBetween', min: 0, max: 14 })).toBe(false);
    }
  });
  it('keeps stoichiometry but does not reuse reference pH outside the dilute domain', () => {
    const result = mix(
      { reagentIds: ['hcl', 'naoh'], heat: false, amounts: { hcl: amount(1), naoh: amount(1) } },
      more,
      reactions,
    );
    expect(result.reaction?.id).toBe('neutral-hcl-naoh');
    expect(result.ph).toBeNull();
    expect(result.quantities?.productsMoles.NaCl).toBeCloseTo(0.05, 10);
    expect(mix({ reagentIds: ['hcl', 'naoh'], heat: false }, more, reactions).ph).toBe(7);
  });
  it('retains sulfuric-acid stoichiometry without claiming its reference pH for supplied amounts', () => {
    const sulfate = ReactionSchema.parse({
      ...reactions[0]!,
      id: 'neutral-h2so4-naoh',
      reagents: ['h2so4', 'naoh'],
      equation: 'H2SO4 + 2NaOH -> Na2SO4 + 2H2O',
      products: [
        { formula: 'Na2SO4', state: 'aq', name: name('Sodium sulfate', 'সোডিয়াম সালফেট') },
        { formula: 'H2O', state: 'l', name: name('Water', 'পানি') },
      ],
    });
    const result = mix(
      {
        reagentIds: ['h2so4', 'naoh', 'litmus'],
        heat: false,
        amounts: {
          h2so4: amount(0.1),
          naoh: amount(0.1, 100),
        },
      },
      more,
      [sulfate],
    );
    expect(result.reaction?.id).toBe(sulfate.id);
    expect(result.quantities?.productsMoles.Na2SO4).toBeCloseTo(0.005, 10);
    expect(result.ph).toBeNull();
    expect(result.indicator?.colour).toBeNull();
  });
});
