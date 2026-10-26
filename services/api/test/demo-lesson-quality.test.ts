import { describe, expect, it } from 'vitest';
import { SIMS, mix, parseEquation, type SimId } from '@just-imagine/stem-sims';
import { REAGENTS, REACTIONS } from '@just-imagine/stem-content';
import { DEMO_LESSONS } from '../src/school/demo-lessons';
import { describeLessonQuality, itemsOf } from './support/demo-lesson-checks';

const expectedMcq: Record<string, Record<string, [string, string]>> = {
  motion: {
    check1: ['A horizontal line above zero', 'শূন্যের ওপরে অনুভূমিক রেখা'],
    q1: ['Acceleration', 'ত্বরণ'],
    q5: ['Velocity', 'বেগ'],
  },
  cart: { q1: ['Friction', 'ঘর্ষণ'], q5: ['Half', 'অর্ধেক'] },
  circuit: {
    check1: ['Set the source to 12 V', 'উৎস 12 V করো'],
    q1: ['V=IR', 'V=IR'],
    q5: ['Voltage', 'বিভব পার্থক্য'],
  },
  linear: {
    check1: ['The line moves up by 2 units', 'রেখা 2 একক ওপরে সরে'],
    q1: ['m', 'm'],
    q5: ['Zero', 'শূন্য'],
  },
  circle: {
    check1: ['The vertical y-coordinate', 'উল্লম্ব y-স্থানাঙ্ক'],
    q1: ['Vertical y', 'উল্লম্ব y'],
    q5: ['Undefined', 'অসংজ্ঞায়িত'],
  },
  'acid-base': {
    check1: ['NaOH', 'NaOH'],
    q1: ['Below 7', '7-এর নিচে'],
    q4: ['Basic', 'ক্ষারীয়'],
    q5: ['Salt and water', 'লবণ ও পানি'],
  },
  reactions: {
    check1: [
      'Reactants and the supported balanced equation',
      'বিক্রিয়ক ও সমর্থিত সমতাযুক্ত সমীকরণ',
    ],
    q1: ['Atoms are conserved', 'পরমাণু সংরক্ষিত থাকে'],
    q4: ['Silver chloride', 'সিলভার ক্লোরাইড'],
    q5: ['Hydrogen', 'হাইড্রোজেন'],
  },
};
const failures: Record<string, unknown> = {
  motion: { a: 1 },
  cart: { force: 10 },
  circuit: { emf: 3 },
  linear: { m: 2 },
  circle: { angleDeg: 30 },
  'acid-base': {
    reagentIds: ['hcl', 'naoh'],
    heat: false,
    amounts: {
      hcl: { volumeMl: 100, concentrationM: 0.1 },
      naoh: { volumeMl: 50, concentrationM: 0.1 },
    },
  },
  reactions: { reagentIds: ['hcl', 'zn'], heat: false },
};
const ORIGINAL = ['motion', 'cart', 'circuit', 'linear', 'circle', 'acid-base', 'reactions'];
// Expected answers use the defining relations independently of the solver output.
const expectedNumeric: Record<string, Record<string, number>> = {
  motion: { q2: 4 + 2 * 4, q4: 4 * 4 + 0.5 * 2 * 4 ** 2 },
  cart: { check1: 4, q2: 0.3 * 2 * 9.8, q4: (10 - 0.2 * 2 * 9.8) / 2 },
  circuit: { q2: 10 + 20, q4: 6 / (10 + 20) },
  linear: { q2: 2 * 3 + 1, q4: 1 },
  circle: { q2: Math.sin(Math.PI / 6), q4: Math.cos(0) },
  'acid-base': { q2: 7 },
  reactions: { q2: 2 * 2 },
};

describeLessonQuality(
  'original bilingual demo lessons',
  DEMO_LESSONS.filter((entry) => ORIGINAL.includes(entry.slug)),
  { mcq: expectedMcq, failures, numeric: expectedNumeric },
  { strict: false },
);

describe('every example lesson together', () => {
  it('keeps the original seven first and every slug unique', () => {
    expect(DEMO_LESSONS.slice(0, 7).map((entry) => entry.slug)).toEqual(ORIGINAL);
    expect(new Set(DEMO_LESSONS.map((entry) => entry.slug)).size).toBe(DEMO_LESSONS.length);
  });

  it('never repeats a hint anywhere in the library', () => {
    const hints = DEMO_LESSONS.flatMap((entry) =>
      itemsOf(entry).flatMap((item) => entry.keys.items[item.id]!.hints),
    );
    expect(hints).toHaveLength(DEMO_LESSONS.length * 6 * 2);
    expect(new Set(hints.map((hint) => hint.en)).size).toBe(hints.length);
    expect(new Set(hints.map((hint) => hint.bn)).size).toBe(hints.length);
  });

  it('spreads correct answers evenly across option positions', () => {
    const positions = [0, 0, 0];
    for (const entry of DEMO_LESSONS)
      for (const item of itemsOf(entry)) {
        const key = entry.keys.items[item.id]!.key;
        if (key.kind === 'mcq') positions[key.answer]!++;
      }
    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(1);
  });
});

describe('original lesson solver readings', () => {
  it('agree with the defining relations the lessons teach', () => {
    const solve = (id: SimId, params: unknown) => {
      const model = SIMS[id];
      return model.solve(model.params.parse(params) as never);
    };
    const motion = solve('motion-graphs', { u: 4, a: 2, duration: 4 });
    const cart = solve('newton-cart', { mass: 2, force: 10, muS: 0.3, muK: 0.2 });
    const circuit = solve('ohms-circuit', { emf: 6, topology: 'series', resistors: [10, 20] });
    const neutral = mix(
      {
        reagentIds: ['hcl', 'naoh'],
        heat: false,
        amounts: {
          hcl: { volumeMl: 50, concentrationM: 0.1 },
          naoh: { volumeMl: 50, concentrationM: 0.1 },
        },
      },
      REAGENTS,
      REACTIONS,
    );
    const hydrogenAtoms = parseEquation('2H2 + O2 -> 2H2O').reactants[0]!.coefficient * 2;
    expect(Number(motion.finalV)).toBe(4 + 2 * 4);
    expect(Number(motion.finalX)).toBe(4 * 4 + 0.5 * 2 * 4 ** 2);
    expect(Number(cart.staticLimit)).toBeCloseTo(0.3 * 2 * 9.8);
    expect(Number(solve('newton-cart', { mass: 2, force: 4, muS: 0.3, muK: 0.2 }).friction)).toBe(
      4,
    );
    expect(Number(cart.a)).toBeCloseTo((10 - 0.2 * 2 * 9.8) / 2);
    expect(Number(circuit.req)).toBe(10 + 20);
    expect(Number(circuit.current)).toBeCloseTo(6 / (10 + 20));
    expect(neutral.ph).toBe(7);
    expect(hydrogenAtoms).toBe(2 * 2);
  });
});
