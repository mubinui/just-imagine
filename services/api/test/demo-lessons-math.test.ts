import { describe, expect, it } from 'vitest';
import { SIMS, type SimId } from '@just-imagine/stem-sims';
import { MATH_LESSONS } from '../src/school/demo-lessons-math';
import { describeLessonQuality } from './support/demo-lesson-checks';

// Written independently of the lesson source, so a typo in a lesson cannot pass itself.
const mcq: Record<string, Record<string, [string, string]>> = {
  functions: {
    check1: [
      'Each element of A has exactly one image in B',
      'A-এর প্রতিটি উপাদানের B-তে ঠিক একটি ছবি থাকে',
    ],
    q1: ['At (0, −3)', '(0, −3) বিন্দুতে'],
    q5: ['Yes: each x still has exactly one image', 'হ্যাঁ: x-এর প্রতিটি মানের এখনও ঠিক একটি ছবি'],
  },
  waves: {
    check1: [
      'The wave gets taller; its period stays 360°',
      'তরঙ্গ উঁচু হয়; পর্যায়কাল 360°-ই থাকে',
    ],
    q1: ['120°', '120°'],
    q5: ['From −2 to 2', '−2 থেকে 2 পর্যন্ত'],
  },
  area: {
    check1: ['Less than the exact area', 'প্রকৃত ক্ষেত্রফলের চেয়ে কম'],
    q1: ['The right end of its strip', 'ফালির ডান প্রান্তে'],
    q5: ['The midpoint sum', 'মধ্যবিন্দু যোগফল'],
  },
  derivative: {
    check1: ['The slope of the tangent at x = a', 'x = a বিন্দুতে স্পর্শকের ঢাল'],
    q1: ['Decreasing: it falls as x increases', 'হ্রাসমান: x বাড়লে লেখচিত্র নামে'],
    q5: ['Its lowest point', 'এর সর্বনিম্ন বিন্দু'],
  },
  probability: {
    check1: ['It tends to get closer to 1/6', 'এটি ক্রমে 1/6-এর কাছাকাছি যেতে থাকে'],
    q1: ['{HH, HT, TH, TT}', '{HH, HT, TH, TT}'],
    q5: ['1/6, whatever this run shows', '1/6, এই পরীক্ষায় যা-ই আসুক'],
  },
};

// Plausible mistakes that must not meet each task.
const failures: Record<string, unknown> = {
  // Reads the constant term −3 as a zero of the function.
  functions: { x: -3 },
  // Halves b to halve the period, which doubles it to 720°.
  waves: { frequency: 0.5 },
  // Uses the most strips but keeps the left rule; its error is still about 0.02.
  area: { n: 200, rule: 'left' },
  // Sign slip in x = −b/(2a) for f(x) = x² − 4x + 1.
  derivative: { x: -2 },
  // Expects exactly one six in six rolls.
  probability: { trials: 6 },
};

const f = (x: number) => x ** 2 - 2 * x - 3;
const square = (x: number) => x ** 2;
const g = (x: number) => x ** 2 - 4 * x + 1;
const gSlope = (x: number) => 2 * x - 4;
const numeric: Record<string, Record<string, number>> = {
  functions: { q2: f(4), q4: f(-2) },
  waves: {
    q2: 2 * Math.sin((2 * 15 * Math.PI) / 180),
    q4: 3 * Math.cos((120 * Math.PI) / 180),
  },
  area: {
    // Right-endpoint sum, n = 4 on [0, 2]: heights at 0.5, 1, 1.5, 2 times width 0.5.
    q2: 0.5 * (square(0.5) + square(1) + square(1.5) + square(2)),
    // Midpoint sum, n = 2 on [0, 2]: heights at 0.5 and 1.5 times width 1.
    q4: 1 * (square(0.5) + square(1.5)),
  },
  derivative: { q2: gSlope(5), q4: g(4) - gSlope(4) * 4 },
  probability: {
    // Primes on a die: 2, 3, 5.
    q2: 3 / 6,
    // At least one head in two tosses: 1 − P(TT).
    q4: 1 - (1 / 2) * (1 / 2),
  },
};

describeLessonQuality('math example lessons', MATH_LESSONS, { mcq, failures, numeric });

describe('mathematics example lesson set', () => {
  it('has the five lessons in order, in their chapters and grades', () => {
    expect(MATH_LESSONS.map(({ slug, lesson }) => [slug, lesson.chapterId, lesson.grade])).toEqual([
      ['functions', 'math-gm-2', 9],
      ['waves', 'math-hm-8', 10],
      ['area', 'math-hm-11', 10],
      ['derivative', 'math-hm-11', 10],
      ['probability', 'math-hm-14', 10],
    ]);
  });
});

describe('mathematics lessons agree with their simulations', () => {
  const solve = (id: SimId, params: unknown) => {
    const model = SIMS[id];
    return model.solve(model.params.parse(params) as never);
  };
  const reading = (id: SimId, params: unknown, key: string) => {
    const value = solve(id, params)[key];
    if (typeof value !== 'number') throw new Error(`${id}.${key} is not a number`);
    return value;
  };

  it('functions: the grapher reads f(x) = x² − 2x − 3 as the lesson states', () => {
    const fn = { family: 'quadratic', a: 1, b: -2, c: -3, d: 0 };
    expect(reading('function-grapher', { ...fn, x: 4 }, 'value')).toBeCloseTo(f(4));
    expect(reading('function-grapher', { ...fn, x: -2 }, 'value')).toBeCloseTo(f(-2));
    expect(reading('function-grapher', { ...fn, x: 1 }, 'value')).toBeCloseTo(f(1));
    expect(reading('function-grapher', { ...fn, x: 1 }, 'yIntercept')).toBeCloseTo(f(0));
    expect(reading('function-grapher', { ...fn, x: 1 }, 'root1')).toBeCloseTo(-1);
    expect(reading('function-grapher', { ...fn, x: 1 }, 'root2')).toBeCloseTo(3);
  });

  it('waves: values and periods use degrees and b cycles per 360°', () => {
    const wave = { wave: 'sine', amplitude: 2, frequency: 1, phaseDeg: 0, angleDeg: 30 };
    expect(reading('trig-waves', wave, 'value')).toBeCloseTo(2 * 0.5);
    expect(reading('trig-waves', { ...wave, frequency: 2, angleDeg: 15 }, 'value')).toBeCloseTo(
      numeric.waves!.q2!,
    );
    expect(
      reading('trig-waves', { ...wave, wave: 'cosine', amplitude: 3, angleDeg: 120 }, 'value'),
    ).toBeCloseTo(numeric.waves!.q4!);
    expect(reading('trig-waves', { ...wave, frequency: 3 }, 'periodDeg')).toBeCloseTo(360 / 3);
    expect(reading('trig-waves', { ...wave, frequency: 2 }, 'periodDeg')).toBeCloseTo(360 / 2);
    expect(reading('trig-waves', wave, 'min')).toBeCloseTo(-2);
  });

  it('area: the Riemann sums for y = x² on [0, 2] match the hand sums', () => {
    const area = { family: 'quadratic', a: 1, b: 0, c: 0, d: 0, from: 0, to: 2 };
    const sum = (n: number, rule: string) =>
      reading('riemann-area', { ...area, n, rule }, 'estimate');
    expect(sum(4, 'left')).toBeCloseTo(0.5 * (square(0) + square(0.5) + square(1) + square(1.5)));
    expect(sum(4, 'right')).toBeCloseTo(numeric.area!.q2!);
    expect(sum(4, 'midpoint')).toBeCloseTo(
      0.5 * (square(0.25) + square(0.75) + square(1.25) + square(1.75)),
    );
    expect(sum(2, 'midpoint')).toBeCloseTo(numeric.area!.q4!);
    expect(reading('riemann-area', { ...area, n: 4, rule: 'left' }, 'exact')).toBeCloseTo(8 / 3);
  });

  it('derivative: slopes and the tangent intercept for f(x) = x² − 4x + 1', () => {
    const curve = { family: 'quadratic', a: 1, b: -4, c: 1, d: 0 };
    expect(reading('derivative', { ...curve, x: 3 }, 'y')).toBeCloseTo(g(3));
    expect(reading('derivative', { ...curve, x: 3 }, 'slope')).toBeCloseTo(gSlope(3));
    expect(reading('derivative', { ...curve, x: 5 }, 'slope')).toBeCloseTo(numeric.derivative!.q2!);
    expect(reading('derivative', { ...curve, x: 4 }, 'tangentIntercept')).toBeCloseTo(
      numeric.derivative!.q4!,
    );
    expect(reading('derivative', { ...curve, x: 2 }, 'slope')).toBeCloseTo(0);
  });

  it('probability: theoretical chances and the seeded run the task relies on', () => {
    const die = { experiment: 'die', trials: 30, bias: 0.5, sectors: 4, seed: 17 };
    const coin = { ...die, experiment: 'coin' };
    const chance = (params: unknown, outcome: number) =>
      reading('probability', params, 'theoretical' + outcome);
    expect(chance(die, 1) + chance(die, 2) + chance(die, 4)).toBeCloseTo(numeric.probability!.q2!);
    expect(1 - chance(coin, 1) * chance(coin, 1)).toBeCloseTo(numeric.probability!.q4!);
    expect(chance(die, 5)).toBeCloseTo(1 / 6);
    // Few rolls stay far from 1/6 with this seed; many rolls settle near it.
    expect(reading('probability', { ...die, trials: 6 }, 'relative5')).toBe(0);
    expect(Math.abs(reading('probability', die, 'relative5') - 1 / 6)).toBeGreaterThan(0.1);
    expect(
      Math.abs(reading('probability', { ...die, trials: 10000 }, 'relative5') - 1 / 6),
    ).toBeLessThan(0.002);
  });
});
