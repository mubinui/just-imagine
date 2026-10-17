import { describe, it, expect } from 'vitest';
import { motionGraphs, MotionParamsSchema, stopTime } from '../src/motion';

const braking = { u: 10, a: -2, duration: 10 };
const speeding = { u: 0, a: 2, duration: 4 };

describe('motion-graphs model', () => {
  it('stops a braking body at u²/2|a| and never reverses', () => {
    expect(stopTime(braking)).toBe(5);
    const end = motionGraphs.solve(braking);
    expect(end['stopTime']).toBe(5);
    expect(end['stopDistance']).toBeCloseTo(25, 9);
    expect(end['finalX']).toBeCloseTo(25, 9);
    expect(Math.abs(end['finalV'] as number)).toBeLessThan(1e-9);
    const later = motionGraphs.at(braking, 8);
    expect(later['x']).toBeCloseTo(25, 9);
  });

  it('follows x = ut + ½at² and v = u + at before stopping', () => {
    const mid = motionGraphs.at(braking, 2);
    expect(mid['x']).toBeCloseTo(16, 9);
    expect(mid['v']).toBeCloseTo(6, 9);
  });

  it('reports no stop for a speeding body and clamps time to the run', () => {
    expect(stopTime(speeding)).toBeNull();
    const end = motionGraphs.solve(speeding);
    expect(end['finalX']).toBeCloseTo(16, 9);
    expect(end['finalV']).toBeCloseTo(8, 9);
    expect(end['stopDistance']).toBeNull();
    expect(motionGraphs.at(speeding, 99)['t']).toBe(4);
    expect(motionGraphs.at(speeding, -1)['t']).toBe(0);
  });

  it('checks predicates with tolerances', () => {
    const end = motionGraphs.solve(braking);
    expect(motionGraphs.predicates['stopsAt']!.test(braking, end, { x: 25, tol: 0.5 })).toBe(true);
    expect(motionGraphs.predicates['stopsAt']!.test(braking, end, { x: 24, tol: 0.5 })).toBe(false);
    expect(motionGraphs.predicates['reachesSpeed']!.test(braking, end, { v: 0, tol: 0.01 })).toBe(
      true,
    );
    const fast = motionGraphs.solve(speeding);
    expect(
      motionGraphs.predicates['displacementEquals']!.test(speeding, fast, { x: 16, tol: 0.1 }),
    ).toBe(true);
    expect(motionGraphs.predicates['stopsAt']!.test(speeding, fast, { x: 16, tol: 1 })).toBe(false);
  });

  it('rejects out-of-range and extra params', () => {
    expect(MotionParamsSchema.safeParse({ u: 25, a: 0, duration: 5 }).success).toBe(false);
    expect(MotionParamsSchema.safeParse({ ...braking, x: 1 }).success).toBe(false);
  });
});
