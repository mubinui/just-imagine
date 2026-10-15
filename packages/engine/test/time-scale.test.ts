import { it, expect } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures';
import { createSimulation, type Simulation, type EngineEvent } from '../src/index';
function doc() {
  const d = structuredClone(FIXTURE_WORLDS.projectileLab);
  d.variables = {
    clock: {
      label: 'Time scale',
      min: 0.1,
      max: 2,
      step: 0.05,
      value: 1,
      unit: '',
      binds: { kind: 'timeScale' },
    },
  };
  for (const e of d.entities) e.behaviors = [];
  d.rules = [
    {
      id: 'pulse',
      once: false,
      when: { event: 'timer', everySeconds: 1 },
      then: [
        { action: 'applyImpulse', target: d.learning.heroEntityId, impulse: { x: 0.3, y: -1 } },
        { action: 'say', text: 'tick' },
      ],
    },
  ];
  return d;
}
it('produces the same fixed-step trajectory and timer firings at slow, normal and fast speed', async () => {
  const ordinary = await createSimulation(doc()),
    slow = await createSimulation(doc()),
    fast = await createSimulation(doc());
  const runs: [Simulation, number, number][] = [
    [ordinary, 1, 120],
    [slow, 0.25, 480],
    [fast, 2, 60],
  ];
  const events: EngineEvent[][] = [];
  for (const [s, scale, frames] of runs) {
    const collected: EngineEvent[] = [];
    s.subscribe((e) => {
      if (e.type === 'rule' || e.type === 'say') collected.push(e);
    });
    s.setVariable('clock', scale);
    s.step(frames);
    events.push(collected);
  }
  for (const s of [slow, fast]) {
    expect(s.frame().time).toBe(2);
    expect(s.frame().entities).toEqual(ordinary.frame().entities);
    expect(s.snapshot().history).toEqual(ordinary.snapshot().history);
  }
  expect(events[0]!.filter((e) => e.type === 'rule').map((e) => e.time)).toEqual([1, 2]);
  expect(events[1]).toEqual(events[0]);
  expect(events[2]).toEqual(events[0]);
  for (const [s] of runs) s.dispose();
});
it('holds fractional scaled time and exposes adjacent physical states for smooth rendering', async () => {
  const s = await createSimulation(doc());
  s.setVariable('clock', 0.25);
  s.step(3);
  expect(s.frame().time).toBe(0);
  expect(s.frame().interpolation).toBeCloseTo(0.75);
  s.step();
  expect(s.frame().time).toBe(1 / 60);
  expect(s.frame().interpolation).toBeCloseTo(0);
  const before = s.frame().entities;
  s.advance(1 / 120);
  expect(s.frame().entities).toEqual(before);
  expect(s.frame().interpolation).toBeCloseTo(0.125);
  expect(s.frame().previousEntities).toHaveLength(before.length);
  s.dispose();
});
