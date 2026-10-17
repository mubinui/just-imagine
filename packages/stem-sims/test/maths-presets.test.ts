import { describe, it, expect } from 'vitest';
import { evaluate, slope, type CurveParams } from '../src/maths/curve';
import { functionGrapher } from '../src/maths/grapher';
import { derivative } from '../src/maths/derivative';
import { riemannArea } from '../src/maths/riemann';
import { probability } from '../src/maths/probability';
import { trigWaves } from '../src/maths/waves';

const quad: CurveParams = { family: 'quadratic', a: 1, b: -2, c: -3, d: 0 };

describe('curve families', () => {
  it('evaluates each family and its exact slope', () => {
    expect(evaluate(quad, 3)).toBe(0);
    expect(slope(quad, 3)).toBe(4);
    const sine: CurveParams = { family: 'sine', a: 2, b: 1, c: 0, d: 1 };
    expect(evaluate(sine, Math.PI / 2)).toBeCloseTo(3, 9);
    expect(slope(sine, 0)).toBeCloseTo(2, 9);
    const exp: CurveParams = { family: 'exponential', a: 1, b: 1, c: 0, d: 0 };
    expect(evaluate(exp, 1)).toBeCloseTo(Math.E, 9);
    expect(slope(exp, 1)).toBeCloseTo(Math.E, 9);
  });
  it('has no value where a logarithm is undefined', () => {
    const log: CurveParams = { family: 'logarithm', a: 1, b: 1, c: 0, d: 0 };
    expect(evaluate(log, 0)).toBeNull();
    expect(evaluate(log, -1)).toBeNull();
    expect(evaluate(log, Math.E)).toBeCloseTo(1, 9);
    expect(slope(log, 2)).toBeCloseTo(0.5, 9);
  });
});

describe('function grapher', () => {
  it('finds the intercept, vertex and roots of x² − 2x − 3', () => {
    const o = functionGrapher.solve({ ...quad, x: 0 });
    expect(o['yIntercept']).toBe(-3);
    expect(o['vertexX']).toBe(1);
    expect(o['vertexY']).toBe(-4);
    expect(o['rootCount']).toBe(2);
    expect(o['root1']).toBeCloseTo(-1, 6);
    expect(o['root2']).toBeCloseTo(3, 6);
  });
  it('finds the three roots of a cubic numerically', () => {
    const cubic = { family: 'cubic', a: 1, b: 0, c: -4, d: 0, x: 1 } as const;
    const o = functionGrapher.solve(cubic);
    expect(o['rootCount']).toBe(3);
    expect([o['root1'], o['root2'], o['root3']].map((r) => Math.round(Number(r)))).toEqual([
      -2, 0, 2,
    ]);
    expect(o['value']).toBe(-3);
  });
  it('grades a root and the vertex', () => {
    const p = { ...quad, x: 0 };
    const o = functionGrapher.solve(p);
    expect(functionGrapher.predicates['hasRoot']!.test(p, o, { x: 3, tol: 0.01 })).toBe(true);
    expect(functionGrapher.predicates['hasRoot']!.test(p, o, { x: 2, tol: 0.01 })).toBe(false);
    expect(functionGrapher.predicates['vertexAt']!.test(p, o, { x: 1, y: -4, tol: 0.01 })).toBe(
      true,
    );
  });
  it('refuses coefficients outside the classroom range', () => {
    expect(functionGrapher.params.safeParse({ ...quad, a: 50, x: 0 }).success).toBe(false);
  });
});

describe('derivative as slope', () => {
  it('gives the tangent at a point', () => {
    const o = derivative.solve({ ...quad, x: 3 });
    expect(o['y']).toBe(0);
    expect(o['slope']).toBe(4);
    expect(o['tangentIntercept']).toBe(-12);
  });
  it('grades the slope and its sign', () => {
    const p = { ...quad, x: 1 };
    const o = derivative.solve(p);
    expect(derivative.predicates['slopeEquals']!.test(p, o, { slope: 0, tol: 0.01 })).toBe(true);
    expect(derivative.predicates['slopeSign']!.test(p, o, { sign: 'zero', tol: 0.01 })).toBe(true);
    expect(
      derivative.predicates['slopeSign']!.test(
        { ...quad, x: 2 },
        derivative.solve({ ...quad, x: 2 }),
        {
          sign: 'positive',
          tol: 0.01,
        },
      ),
    ).toBe(true);
  });
});

describe('area under a curve', () => {
  const x2: CurveParams = { family: 'quadratic', a: 1, b: 0, c: 0, d: 0 };
  it('computes left, right, midpoint and trapezoid sums for x² on [0, 1]', () => {
    const base = { ...x2, from: 0, to: 1, n: 4 };
    expect(riemannArea.solve({ ...base, rule: 'left' })['estimate']).toBeCloseTo(0.21875, 9);
    expect(riemannArea.solve({ ...base, rule: 'right' })['estimate']).toBeCloseTo(0.46875, 9);
    expect(riemannArea.solve({ ...base, rule: 'midpoint' })['estimate']).toBeCloseTo(0.328125, 9);
    expect(riemannArea.solve({ ...base, rule: 'trapezoid' })['estimate']).toBeCloseTo(0.34375, 9);
    expect(riemannArea.solve({ ...base, rule: 'left' })['exact']).toBeCloseTo(1 / 3, 6);
  });
  it('converges as the rectangles get thinner', () => {
    const coarse = riemannArea.solve({ ...x2, from: 0, to: 1, n: 4, rule: 'left' });
    const fine = riemannArea.solve({ ...x2, from: 0, to: 1, n: 200, rule: 'left' });
    expect(Number(fine['error'])).toBeLessThan(Number(coarse['error']));
    expect(
      riemannArea.predicates['errorBelow']!.test(
        { ...x2, from: 0, to: 1, n: 200, rule: 'left' },
        fine,
        { tol: 0.01 },
      ),
    ).toBe(true);
  });
  it('has no exact area across a gap in the domain', () => {
    const log = { family: 'logarithm', a: 1, b: 1, c: 0, d: 0 } as const;
    const o = riemannArea.solve({ ...log, from: -1, to: 2, n: 10, rule: 'midpoint' });
    expect(o['exact']).toBeNull();
  });
  it('refuses an interval that runs backwards', () => {
    expect(
      riemannArea.params.safeParse({ ...x2, from: 2, to: 1, n: 4, rule: 'left' }).success,
    ).toBe(false);
  });
});

describe('probability experiments', () => {
  it('is reproducible from the seed, so the server can grade it', () => {
    const p = { experiment: 'die', trials: 600, bias: 0.5, sectors: 4, seed: 7 } as const;
    expect(probability.solve(p)).toEqual(probability.solve(p));
  });
  it('converges on the theoretical distribution', () => {
    const o = probability.solve({
      experiment: 'coin',
      trials: 10000,
      bias: 0.3,
      sectors: 4,
      seed: 3,
    });
    expect(o['theoretical0']).toBe(0.3);
    expect(Math.abs(Number(o['relative0']) - 0.3)).toBeLessThan(0.02);
    expect(Number(o['count0']) + Number(o['count1'])).toBe(10000);
    expect(o['count2']).toBeNull();
  });
  it('splits a spinner evenly and animates trial by trial', () => {
    const p = { experiment: 'spinner', trials: 800, bias: 0.5, sectors: 4, seed: 11 } as const;
    const o = probability.solve(p);
    expect(o['outcomes']).toBe(4);
    expect(o['theoretical3']).toBe(0.25);
    expect(probability.at(p, 0)['done']).toBe(0);
    expect(probability.at(p, 1000)['done']).toBe(800);
  });
  it('grades a relative frequency', () => {
    const p = { experiment: 'coin', trials: 10000, bias: 0.5, sectors: 4, seed: 1 } as const;
    const o = probability.solve(p);
    expect(
      probability.predicates['relativeFrequency']!.test(p, o, {
        outcome: 0,
        value: 0.5,
        tol: 0.03,
      }),
    ).toBe(true);
  });
});

describe('trigonometry waves', () => {
  it('gives the value, period and range of y = A sin(bθ + φ)', () => {
    const p = { wave: 'sine', amplitude: 2, frequency: 2, phaseDeg: 0, angleDeg: 45 } as const;
    const o = trigWaves.solve(p);
    expect(o['value']).toBeCloseTo(2, 9);
    expect(o['periodDeg']).toBe(180);
    expect(o['max']).toBe(2);
    expect(o['min']).toBe(-2);
  });
  it('shifts a cosine by its phase', () => {
    const o = trigWaves.solve({
      wave: 'cosine',
      amplitude: 1,
      frequency: 1,
      phaseDeg: 90,
      angleDeg: 0,
    });
    expect(o['value']).toBeCloseTo(0, 9);
  });
  it('grades the period', () => {
    const p = { wave: 'sine', amplitude: 1, frequency: 3, phaseDeg: 0, angleDeg: 0 } as const;
    expect(
      trigWaves.predicates['periodEquals']!.test(p, trigWaves.solve(p), { periodDeg: 120, tol: 1 }),
    ).toBe(true);
  });
});
