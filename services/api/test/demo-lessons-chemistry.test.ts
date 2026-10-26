import { describe, expect, it } from 'vitest';
import { FLAMES, INDICATOR_COLOURS, SIMS, type SimId } from '@just-imagine/stem-sims';
import { CHEMISTRY_LESSONS } from '../src/school/demo-lessons-chemistry';
import { describeLessonQuality } from './support/demo-lesson-checks';

describeLessonQuality('chemistry example lessons', CHEMISTRY_LESSONS, {
  mcq: {
    'gas-law': {
      check1: ['It doubles', 'দ্বিগুণ হয়'],
      q1: ['Kelvin', 'কেলভিন'],
      q5: ['It increases', 'বাড়ে'],
    },
    'flame-test': {
      check1: [
        'Excited electrons fall back to lower energy levels and give out light',
        'উত্তেজিত ইলেকট্রন নিচের শক্তিস্তরে ফেরার সময় আলো বিকিরণ করে',
      ],
      q1: ['Yellow-orange', 'হলুদ-কমলা'],
      q5: ['Lithium (Li⁺)', 'লিথিয়াম (Li⁺)'],
    },
    titration: {
      check1: [
        'Moles of NaOH added equal moles of HCl in the flask',
        'যোগ করা NaOH-এর মোল ফ্লাস্কের HCl-এর মোলের সমান',
      ],
      q1: ['Red', 'লাল'],
      q5: ['The same volume', 'একই আয়তন'],
    },
    'reaction-rate': {
      check1: [
        'More exposed surface gives more collisions each second',
        'বেশি উন্মুক্ত পৃষ্ঠতলে প্রতি সেকেন্ডে বেশি সংঘর্ষ হয়',
      ],
      q1: [
        'It offers a pathway with lower activation energy',
        'এটি কম সক্রিয়ণ শক্তির বিকল্প পথ দেয়',
      ],
      q5: ['About twice as fast', 'প্রায় দ্বিগুণ দ্রুত'],
    },
    'ph-indicator': {
      check1: ['Litmus', 'লিটমাস'],
      q1: [
        'Ethanoic acid, because it ionises only partly',
        'ইথানয়িক এসিড, কারণ এটি আংশিক আয়নিত হয়',
      ],
      q5: ['Purple', 'বেগুনি'],
    },
  },
  failures: {
    // Doubles the Celsius temperature (27 °C → 54 °C ≈ 327 K) instead of the kelvin temperature.
    'gas-law': { temperature: 327 },
    // Barium's apple green is mistaken for copper's blue-green.
    'flame-test': { ion: 'ba' },
    // Adds a volume equal to the acid's, ignoring the weaker NaOH concentration.
    titration: { baseAdded: 20 },
    // Doubles the concentration but leaves the marble as lumps: the half-life only halves.
    'reaction-rate': { concentration: 2, surface: 'lumps' },
    // Doubles the concentration, expecting one pH unit per doubling.
    'ph-indicator': { concentration: 0.002 },
  },
  numeric: {
    'gas-law': { q2: (1 * 8.314 * 300) / 10, q4: (1 * 8.314 * 300) / 100 },
    'flame-test': { q2: 670.8 - 589.0, q4: 769.9 - 404.4 },
    titration: { q2: ((0.1 * 20) / 1000) * 1000, q4: (0.5 * 18) / 25 },
    'reaction-rate': { q2: 20 / 2, q4: 1 - 0.5 ** (40 / 20) },
    'ph-indicator': { q2: -Math.log10(0.001), q4: 0.01 / 0.0001 },
  },
});

describe('chemistry lessons agree with their simulations', () => {
  const solve = (id: SimId, params: unknown) => {
    const model = SIMS[id];
    return model.solve(model.params.parse(params) as never);
  };
  const lessonOf = (slug: string) => {
    const entry = CHEMISTRY_LESSONS.find((candidate) => candidate.slug === slug);
    if (!entry) throw new Error(`Missing lesson ${slug}`);
    return entry.lesson;
  };
  const exploreParams = (slug: string) => {
    const step = lessonOf(slug).steps.find((candidate) => candidate.kind === 'explore');
    if (step?.kind !== 'explore') throw new Error(`${slug}: missing explore step`);
    return step.params;
  };
  const taskStart = (slug: string) => {
    for (const step of lessonOf(slug).steps)
      if (step.kind === 'quiz')
        for (const item of step.items) if (item.kind === 'simTask') return item.startParams;
    throw new Error(`${slug}: missing simulation task`);
  };

  it('exports the five lessons in order with their simulations and chapters', () => {
    expect(
      CHEMISTRY_LESSONS.map((entry) => [
        entry.slug,
        entry.lesson.chapterId,
        entry.lesson.subject,
        entry.lesson.grade,
      ]),
    ).toEqual([
      ['gas-law', 'chemistry-2', 'chemistry', 9],
      ['flame-test', 'chemistry-3', 'chemistry', 9],
      ['titration', 'chemistry-6', 'chemistry', 9],
      ['reaction-rate', 'chemistry-7', 'chemistry', 9],
      ['ph-indicator', 'chemistry-9', 'chemistry', 9],
    ]);
    for (const entry of CHEMISTRY_LESSONS) {
      const step = entry.lesson.steps.find((candidate) => candidate.kind === 'explore');
      expect(step?.kind === 'explore' && step.simId).toBe(entry.slug);
    }
  });

  it('gas-law: pressure follows PV = nRT in kPa and dm³', () => {
    const start = exploreParams('gas-law');
    expect(start).toEqual({ amount: 1, temperature: 300, volume: 10 });
    expect(Number(solve('gas-law', start).pressure)).toBeCloseTo((1 * 8.314 * 300) / 10, 9);
    expect(Number(solve('gas-law', { ...start, volume: 5 }).pressure)).toBeCloseTo(
      2 * Number(solve('gas-law', start).pressure),
      9,
    );
    expect(
      Number(solve('gas-law', { ...taskStart('gas-law'), temperature: 600 }).pressure),
    ).toBeCloseTo(498.84, 9);
    expect(Number(solve('gas-law', { ...start, volume: 24.942 }).pressure)).toBeCloseTo(100, 9);
    expect(Number(solve('gas-law', { ...start, temperature: 600 }).relativeSpeed)).toBeGreaterThan(
      Number(solve('gas-law', start).relativeSpeed),
    );
  });

  it('flame-test: colours and emission lines match the lesson text', () => {
    expect(exploreParams('flame-test')).toEqual({ ion: 'na' });
    expect(FLAMES.na.name).toEqual({ en: 'yellow-orange', bn: 'হলুদ-কমলা' });
    expect(FLAMES.li.name).toEqual({ en: 'crimson', bn: 'গাঢ় লাল' });
    expect(FLAMES.cu.name).toEqual({ en: 'blue-green', bn: 'নীলচে সবুজ' });
    expect(FLAMES.ba.name).toEqual({ en: 'apple green', bn: 'আপেল সবুজ' });
    expect(FLAMES.sr.name).toEqual({ en: 'red', bn: 'লাল' });
    expect(FLAMES.k.name).toEqual({ en: 'lilac', bn: 'হালকা বেগুনি' });
    expect(solve('flame-test', { ion: 'cu' }).colour).toBe(FLAMES.cu.colour);
    const na = solve('flame-test', { ion: 'na' });
    expect([na.line1, na.line2]).toEqual([589.0, 589.6]);
    expect(solve('flame-test', { ion: 'li' }).line1).toBe(670.8);
    const k = solve('flame-test', { ion: 'k' });
    expect([k.line1, k.line2, k.line3]).toEqual([766.5, 769.9, 404.4]);
  });

  it('titration: equivalence volumes, colours and pH match the lesson', () => {
    const flask = taskStart('titration');
    expect(flask).toEqual({
      acid: 'hcl',
      acidConcentration: 0.1,
      acidVolume: 20,
      baseConcentration: 0.08,
      baseAdded: 0,
      indicator: 'methylOrange',
    });
    const start = solve('titration', flask);
    expect(Number(start.ph)).toBeCloseTo(1, 9);
    expect(start.colour).toBe(INDICATOR_COLOURS.red);
    expect(Number(start.equivalenceVolume)).toBeCloseTo((0.1 * 20) / 0.08, 9);
    expect(solve('titration', { ...flask, baseAdded: 25 }).ph).toBe(7);
    expect(solve('titration', { ...flask, baseAdded: 25 }).colour).toBe(INDICATOR_COLOURS.yellow);
    expect(
      solve('titration', {
        ...flask,
        acidConcentration: 0.36,
        acidVolume: 25,
        baseConcentration: 0.5,
        baseAdded: 18,
      }).ph,
    ).toBe(7);
    const explore = solve('titration', exploreParams('titration'));
    expect(Number(explore.equivalenceVolume)).toBeCloseTo(25, 9);
    const weak = solve('titration', { ...exploreParams('titration'), acid: 'ethanoic' });
    expect(weak.equivalenceVolume).toBe(explore.equivalenceVolume);
    const weakEnd = solve('titration', {
      ...exploreParams('titration'),
      acid: 'ethanoic',
      baseAdded: 25,
    });
    expect(Number(weakEnd.ph)).toBeCloseTo(8.7, 1);
    expect(weakEnd.colour).toBe(INDICATOR_COLOURS.pink);
  });

  it('reaction-rate: half-lives and rate factors match the lesson', () => {
    const reference = exploreParams('reaction-rate');
    expect(reference).toEqual({
      temperature: 25,
      concentration: 1,
      catalyst: false,
      surface: 'lumps',
    });
    expect(Number(solve('reaction-rate', reference).halfLife)).toBeCloseTo(20, 9);
    expect(Number(solve('reaction-rate', { ...reference, concentration: 2 }).halfLife)).toBeCloseTo(
      10,
      9,
    );
    expect(
      Number(solve('reaction-rate', { ...reference, concentration: 2, surface: 'chips' }).halfLife),
    ).toBeCloseTo(5, 9);
    expect(
      Number(solve('reaction-rate', { ...reference, surface: 'powder' }).relativeRate),
    ).toBeCloseTo(4, 9);
    const model = SIMS['reaction-rate'];
    expect(Number(model.at(model.params.parse(reference), 40).product)).toBeCloseTo(0.75, 9);
    expect(
      Number(solve('reaction-rate', { ...reference, temperature: 35 }).relativeRate),
    ).toBeCloseTo(1.92, 2);
    expect(
      Number(solve('reaction-rate', { ...reference, catalyst: true }).relativeRate),
    ).toBeGreaterThan(100);
  });

  it('ph-indicator: pH values and indicator colours match the lesson', () => {
    expect(exploreParams('ph-indicator')).toEqual({
      substance: 'hcl',
      concentration: 0.01,
      indicator: 'litmus',
    });
    expect(taskStart('ph-indicator')).toEqual({
      substance: 'naoh',
      concentration: 0.001,
      indicator: 'bromothymol',
    });
    const at = (substance: string, concentration: number, indicator: string) =>
      solve('ph-indicator', { substance, concentration, indicator });
    expect(Number(at('hcl', 0.001, 'universal').ph)).toBeCloseTo(3, 9);
    expect(Number(at('hcl', 0.01, 'universal').ph)).toBeCloseTo(2, 9);
    expect(Number(at('naoh', 0.001, 'universal').ph)).toBeCloseTo(11, 9);
    expect(Number(at('naoh', 0.01, 'universal').ph)).toBeCloseTo(12, 9);
    expect(at('hcl', 0.01, 'litmus').colour).toBe(INDICATOR_COLOURS.red);
    expect(at('water', 0.01, 'litmus').colour).toBe(INDICATOR_COLOURS.purple);
    expect(at('hcl', 0.01, 'phenolphthalein').colour).toBe(
      at('water', 0.01, 'phenolphthalein').colour,
    );
    expect(Number(at('ethanoic', 0.1, 'universal').ph)).toBeGreaterThan(
      Number(at('hcl', 0.1, 'universal').ph),
    );
    expect(at('naoh', 0.001, 'universal').colour).toBe(INDICATOR_COLOURS.purple);
  });
});
