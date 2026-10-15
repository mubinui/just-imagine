import { it, expect, vi } from 'vitest';
import type RAPIER from '@dimforge/rapier2d-compat';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures';
import { createSimulation } from '../src/index';
function falling() {
  const d = structuredClone(FIXTURE_WORLDS.jellyDragon);
  d.entities = d.entities.filter((e) => e.id !== 'cloud1');
  d.entities.find((e) => e.id === 'dragon')!.transform = { x: 8, y: 2, rotation: 0 };
  return d;
}
it('conserves document mass over nine soft nodes, including density changes', async () => {
  const d = falling();
  d.variables = {
    rho: {
      label: 'Density',
      min: 0.5,
      max: 3,
      step: 0.1,
      value: 1.1,
      unit: '',
      binds: { kind: 'material', entity: 'dragon', prop: 'density' },
    },
  };
  const s = await createSimulation(d);
  const nodes = (s as unknown as { lattices: Map<string, RAPIER.RigidBody[]> }).lattices.get(
    'dragon',
  )!;
  expect(nodes.reduce((m, n) => m + n.mass(), 0)).toBeCloseTo(1.4 * 1.2 * 1.1, 4);
  s.setVariable('rho', 2);
  s.step();
  expect(nodes.reduce((m, n) => m + n.mass(), 0)).toBeCloseTo(1.4 * 1.2 * 2, 4);
  s.dispose();
});
it('distributes flick and tap impulse over all nodes without a center spike', async () => {
  const d = falling();
  d.environment.gravity = { x: 0, y: 0 };
  const s = await createSimulation(d);
  s.flick('dragon', { x: 6, y: 0 });
  s.step(30);
  expect(s.frame().entities.find((e) => e.id === 'dragon')!.x).toBeCloseTo(11, 1);
  const nodes = (s as unknown as { lattices: Map<string, RAPIER.RigidBody[]> }).lattices.get(
    'dragon',
  )!;
  s.tap('dragon');
  const velocities = nodes.map((n) => n.linvel().y);
  expect(Math.max(...velocities) - Math.min(...velocities)).toBeLessThan(0.01);
  s.dispose();
});
it('fires the real jelly landing bounce discovery rule from aggregate contact impulse', async () => {
  const s = await createSimulation(falling());
  const events: unknown[] = [];
  s.subscribe((e) => events.push(e));
  s.step(360);
  expect(events).toContainEqual(
    expect.objectContaining({ type: 'rule', ruleId: 'r_bounce', concept: 'bounce' }),
  );
  s.dispose();
});
it('always reports release and tap while coalescing only drag in real input time', async () => {
  vi.useFakeTimers();
  try {
    const s = await createSimulation(falling());
    const events: string[] = [];
    s.subscribe((e) => events.push(e.type));
    s.tap('dragon');
    s.drag('dragon', { x: 8, y: 2 });
    s.flick('dragon', { x: 6, y: -4 });
    expect(events).toContain('flick');
    s.castSpell('slowTime');
    s.drag('dragon', { x: 8, y: 2 });
    vi.advanceTimersByTime(510);
    s.drag('dragon', { x: 8, y: 2 });
    expect(events.filter((e) => e === 'drag')).toHaveLength(2);
    s.dispose();
  } finally {
    vi.useRealTimers();
  }
});

it('detects outer-node collisions between two soft bodies', async () => {
  const d = falling();
  d.environment.gravity = { x: 0, y: 0 };
  const hero = d.entities.find((e) => e.id === 'dragon')!,
    other = structuredClone(hero);
  hero.transform.x = 6;
  other.id = 'other';
  other.tags = ['other'];
  other.transform.x = 9;
  d.entities.push(other);
  d.rules = [
    {
      id: 'soft_hit',
      once: true,
      when: { event: 'collision', a: 'hero', b: 'other', minImpulse: 0.1 },
      then: [{ action: 'say', text: 'Soft collision' }],
    },
  ];
  const s = await createSimulation(d),
    events: string[] = [];
  s.subscribe((e) => {
    if (e.ruleId) events.push(e.ruleId);
  });
  s.flick('dragon', { x: 4, y: 0 });
  s.flick('other', { x: -4, y: 0 });
  s.step(40);
  expect(events).toContain('soft_hit');
  s.dispose();
});
