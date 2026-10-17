import { describe, it, expect } from 'vitest';
import { linearGraph, LinearParamsSchema } from '../src/linear';
import { unitCircle } from '../src/unit-circle';

describe('linear-graph model', () => {
  it('reports slope, intercepts and lines through points', () => {
    const p = { m: 2, c: -4 };
    const o = linearGraph.solve(p);
    expect(o['xIntercept']).toBe(2);
    const through = linearGraph.predicates['lineThrough']!;
    expect(
      through.test(p, o, {
        points: [
          { x: 0, y: -4 },
          { x: 3, y: 2 },
        ],
        tol: 0.01,
      }),
    ).toBe(true);
    expect(through.test(p, o, { points: [{ x: 1, y: 1 }], tol: 0.01 })).toBe(false);
    expect(linearGraph.predicates['slopeEquals']!.test(p, o, { m: 2, tol: 0.01 })).toBe(true);
    expect(linearGraph.predicates['interceptEquals']!.test(p, o, { c: -4, tol: 0.01 })).toBe(true);
  });

  it('has no x-intercept for a horizontal line', () => {
    expect(linearGraph.solve({ m: 0, c: 3 })['xIntercept']).toBeNull();
  });

  it('rejects slopes outside ±10', () => {
    expect(LinearParamsSchema.safeParse({ m: 11, c: 0 }).success).toBe(false);
  });
});

describe('unit-circle model', () => {
  it('gives sin, cos and tan for an angle in degrees', () => {
    const o = unitCircle.solve({ angleDeg: 30 });
    expect(o['sin']).toBeCloseTo(0.5, 9);
    expect(o['cos']).toBeCloseTo(Math.sqrt(3) / 2, 9);
    expect(o['tan']).toBeCloseTo(1 / Math.sqrt(3), 9);
    expect(o['quadrant']).toBe(1);
  });

  it('has no tangent on the vertical axis and marks axes as quadrant 0', () => {
    const o = unitCircle.solve({ angleDeg: 90 });
    expect(o['tan']).toBeNull();
    expect(o['quadrant']).toBe(0);
    expect(unitCircle.solve({ angleDeg: 210 })['quadrant']).toBe(3);
  });

  it('checks angle and ratio predicates', () => {
    const p = { angleDeg: 150 };
    const o = unitCircle.solve(p);
    expect(unitCircle.predicates['sinEquals']!.test(p, o, { v: 0.5, tol: 0.01 })).toBe(true);
    expect(unitCircle.predicates['cosEquals']!.test(p, o, { v: 0.5, tol: 0.01 })).toBe(false);
    expect(unitCircle.predicates['angleWithin']!.test(p, o, { min: 90, max: 180 })).toBe(true);
  });
});
