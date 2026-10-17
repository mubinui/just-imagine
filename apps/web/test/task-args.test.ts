import { describe, expect, it } from 'vitest';
import { SIMS, SIM_IDS, checkSimTask } from '@just-imagine/stem-sims';
import { defaultTaskArgs } from '../lib/stem/task-args';
import { SIM_DEFAULTS } from '../lib/stem/sim-params';

describe('default task arguments for the lesson editor', () => {
  it('gives every task of every simulation arguments its own schema accepts', () => {
    for (const simId of SIM_IDS)
      for (const [predicate, check] of Object.entries(SIMS[simId].predicates)) {
        const args = defaultTaskArgs(simId, predicate);
        expect(check.args.safeParse(args).success, `${simId} ${predicate}`).toBe(true);
      }
  });
  it('keeps tasks that share a name apart', () => {
    expect(defaultTaskArgs('linear-graph', 'slopeEquals')).toHaveProperty('m');
    expect(defaultTaskArgs('derivative', 'slopeEquals')).toHaveProperty('slope');
    expect(defaultTaskArgs('function-grapher', 'interceptEquals')).toHaveProperty('y');
    expect(defaultTaskArgs('trig-waves', 'periodEquals')).toHaveProperty('periodDeg');
  });
  it('starts a target at the reading the default setup produces', () => {
    const solved = SIMS.projectile.solve(SIMS.projectile.params.parse(SIM_DEFAULTS.projectile));
    const args = defaultTaskArgs('projectile', 'rangeEquals');
    expect(args['range']).toBeCloseTo(solved['range'] as number, 1);
    expect(
      checkSimTask('projectile', SIM_DEFAULTS.projectile, { predicate: 'rangeEquals', args }),
    ).toEqual({ ok: true, met: true });
  });
  it('chooses the choice that matches the starting picture', () => {
    const args = defaultTaskArgs('ph-indicator', 'indicatorShows');
    expect(
      checkSimTask('ph-indicator', SIM_DEFAULTS['ph-indicator'], {
        predicate: 'indicatorShows',
        args,
      }),
    ).toEqual({ ok: true, met: true });
  });
  it('keeps the hand-picked defaults of the original simulations', () => {
    expect(defaultTaskArgs('motion-graphs', 'stopsAt')).toEqual({ x: 10, tol: 0.1 });
    expect(defaultTaskArgs('unit-circle', 'angleWithin')).toEqual({ min: 30, max: 60 });
  });
});
