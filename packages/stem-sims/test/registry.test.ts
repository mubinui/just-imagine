import { describe, it, expect } from 'vitest';
import {
  checkLockedSimTask,
  checkSimTask,
  describeSim,
  SIM_IDS,
  SIMS,
  SimIdSchema,
  type LockedSimItem,
  type SimTask,
} from '../src/registry';

describe('sim registry', () => {
  const LIBRARY = [
    'motion-graphs',
    'newton-cart',
    'ohms-circuit',
    'linear-graph',
    'unit-circle',
    'projectile',
    'vector-addition',
    'incline',
    'pendulum',
    'spring',
    'collision',
    'orbit',
    'ph-indicator',
    'titration',
    'flame-test',
    'reaction-rate',
    'gas-law',
    'function-grapher',
    'derivative',
    'riemann-area',
    'probability',
    'trig-waves',
  ];

  it('registers the five original sims and the seventeen library presets', () => {
    expect([...SIM_IDS].sort()).toEqual([...LIBRARY].sort());
    expect([...SimIdSchema.options].sort()).toEqual([...LIBRARY].sort());
    expect(SimIdSchema.safeParse('chem-lab').success).toBe(false);
    expect(describeSim('newton-cart').predicates).toEqual(['justMoves', 'accelerationEquals']);
  });

  it('keys every model by its own id', () => {
    for (const id of SIM_IDS) expect(SIMS[id].id).toBe(id);
  });

  it('grades a library preset from params alone', () => {
    expect(
      checkSimTask(
        'projectile',
        { speed: 20, angle: 45, height: 0, gravity: 9.8 },
        { predicate: 'rangeEquals', args: { range: 40.8, tol: 0.1 } },
      ),
    ).toEqual({ ok: true, met: true });
    expect(
      checkSimTask('flame-test', { ion: 'na' }, { predicate: 'ionIs', args: { ion: 'k' } }),
    ).toEqual({ ok: true, met: false });
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

  it('refuses prototype keys as sim ids', () => {
    expect(checkSimTask('__proto__', {}, { predicate: 'x', args: {} })).toEqual({
      ok: false,
      reason: 'unknown-sim',
    });
  });
});

describe('checkLockedSimTask', () => {
  // Static limit is 0.4 * 2 * 9.8 = 7.84 N; only the push is the student's to change.
  const cart: LockedSimItem = {
    simId: 'newton-cart',
    startParams: { mass: 2, force: 5, muS: 0.4, muK: 0.3 },
    editableParams: ['force'],
  };
  const justMoves: SimTask = { predicate: 'justMoves', args: {} };

  it('grades editable keys over the locked start params', () => {
    expect(checkLockedSimTask(cart, { force: 7.9 }, justMoves)).toEqual({ ok: true, met: true });
    expect(checkLockedSimTask(cart, { force: 5 }, justMoves)).toEqual({ ok: true, met: false });
    expect(checkLockedSimTask(cart, {}, justMoves)).toEqual({ ok: true, met: false });
  });

  it('refuses any submitted key the item does not let the student edit', () => {
    expect(checkLockedSimTask(cart, { force: 9.9, muS: 0.001 }, justMoves)).toEqual({
      ok: false,
      reason: 'invalid-params',
    });
    expect(
      checkLockedSimTask(
        cart,
        JSON.parse('{"force": 7.9, "__proto__": {"muS": 0.001}}'),
        justMoves,
      ),
    ).toEqual({ ok: false, reason: 'invalid-params' });
  });

  it('refuses submissions that are not plain objects', () => {
    for (const submitted of [null, undefined, 7.9, 'force', [7.9], new Map([['force', 7.9]])])
      expect(checkLockedSimTask(cart, submitted, justMoves)).toEqual({
        ok: false,
        reason: 'invalid-params',
      });
  });

  it('reports a malformed task as invalid-task', () => {
    expect(checkLockedSimTask(cart, { force: 7.9 }, { predicate: '', args: {} })).toEqual({
      ok: false,
      reason: 'invalid-task',
    });
    expect(
      checkLockedSimTask(cart, { force: 7.9 }, { ...justMoves, extra: 1 } as unknown as SimTask),
    ).toEqual({ ok: false, reason: 'invalid-task' });
    expect(checkLockedSimTask(cart, { force: 7.9 }, null as unknown as SimTask)).toEqual({
      ok: false,
      reason: 'invalid-task',
    });
  });

  it('refuses prototype keys as sim ids', () => {
    expect(checkLockedSimTask({ ...cart, simId: '__proto__' }, { force: 7.9 }, justMoves)).toEqual({
      ok: false,
      reason: 'unknown-sim',
    });
  });
});
