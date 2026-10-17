import { describe, it, expect } from 'vitest';
import { CircuitParamsSchema, ohmsCircuit } from '../src/circuit';

describe('ohms-circuit model', () => {
  it('solves a series circuit', () => {
    const o = ohmsCircuit.solve({ emf: 6, topology: 'series', resistors: [2, 4] });
    expect(o['req']).toBeCloseTo(6, 9);
    expect(o['current']).toBeCloseTo(1, 9);
    expect(o['v0']).toBeCloseTo(2, 9);
    expect(o['v1']).toBeCloseTo(4, 9);
    expect(o['p1']).toBeCloseTo(4, 9);
    expect(o['v2']).toBeNull();
  });

  it('solves a parallel circuit', () => {
    const o = ohmsCircuit.solve({ emf: 6, topology: 'parallel', resistors: [3, 6] });
    expect(o['req']).toBeCloseTo(2, 9);
    expect(o['current']).toBeCloseTo(3, 9);
    expect(o['i0']).toBeCloseTo(2, 9);
    expect(o['i1']).toBeCloseTo(1, 9);
    expect(o['p0']).toBeCloseTo(12, 9);
  });

  it('checks current and power predicates', () => {
    const p = { emf: 6, topology: 'parallel' as const, resistors: [3, 6] };
    const o = ohmsCircuit.solve(p);
    expect(ohmsCircuit.predicates['currentEquals']!.test(p, o, { i: 3, tol: 0.05 })).toBe(true);
    expect(ohmsCircuit.predicates['powerAtLeast']!.test(p, o, { index: 1, p: 6 })).toBe(true);
    expect(ohmsCircuit.predicates['powerAtLeast']!.test(p, o, { index: 2, p: 1 })).toBe(false);
  });

  it('rejects empty, oversized and out-of-range circuits', () => {
    expect(
      CircuitParamsSchema.safeParse({ emf: 6, topology: 'series', resistors: [] }).success,
    ).toBe(false);
    expect(
      CircuitParamsSchema.safeParse({ emf: 6, topology: 'series', resistors: [1, 2, 3, 4] })
        .success,
    ).toBe(false);
    expect(
      CircuitParamsSchema.safeParse({ emf: 20, topology: 'series', resistors: [1] }).success,
    ).toBe(false);
  });
});
