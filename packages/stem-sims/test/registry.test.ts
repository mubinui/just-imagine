import { describe, it, expect } from 'vitest';
import { checkSimTask, describeSim, SIM_IDS, SimIdSchema } from '../src/registry';

describe('sim registry', () => {
  it('registers exactly the five demo sims', () => {
    expect([...SIM_IDS].sort()).toEqual(
      ['linear-graph', 'motion-graphs', 'newton-cart', 'ohms-circuit', 'unit-circle'].sort(),
    );
    expect(SimIdSchema.safeParse('chem-lab').success).toBe(false);
    expect(describeSim('newton-cart').predicates).toEqual(['justMoves', 'accelerationEquals']);
  });

  it('grades from params alone', () => {
    const met = checkSimTask(
      'motion-graphs',
      { u: 10, a: -2, duration: 10 },
      { predicate: 'stopsAt', args: { x: 25, tol: 0.5 } },
    );
    expect(met).toEqual({ ok: true, met: true });
    const missed = checkSimTask(
      'motion-graphs',
      { u: 10, a: -1, duration: 10 },
      { predicate: 'stopsAt', args: { x: 25, tol: 0.5 } },
    );
    expect(missed).toEqual({ ok: true, met: false });
  });

  it('ignores forged state by refusing extra keys and out-of-range params', () => {
    const forged = checkSimTask(
      'motion-graphs',
      { u: 10, a: -1, duration: 10, stopDistance: 25 },
      { predicate: 'stopsAt', args: { x: 25, tol: 0.5 } },
    );
    expect(forged).toEqual({ ok: false, reason: 'invalid-params' });
    expect(
      checkSimTask(
        'newton-cart',
        { mass: 99, force: 1, muS: 0.1, muK: 0.1 },
        {
          predicate: 'justMoves',
          args: {},
        },
      ),
    ).toEqual({ ok: false, reason: 'invalid-params' });
  });

  it('reports unknown sims, predicates and bad args', () => {
    expect(checkSimTask('nope', {}, { predicate: 'x', args: {} })).toEqual({
      ok: false,
      reason: 'unknown-sim',
    });
    expect(
      checkSimTask('unit-circle', { angleDeg: 30 }, { predicate: 'toString', args: {} }),
    ).toEqual({ ok: false, reason: 'unknown-predicate' });
    expect(
      checkSimTask('unit-circle', { angleDeg: 30 }, { predicate: 'sinEquals', args: { v: 5 } }),
    ).toEqual({ ok: false, reason: 'invalid-args' });
  });
});
