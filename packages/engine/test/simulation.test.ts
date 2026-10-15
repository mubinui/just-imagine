import { describe, it, expect } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures';
import { createSimulation } from '../src/index.js';
describe('real Rapier simulation', () => {
  it('is deterministic and does not mutate documents', async () => {
    const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
    const before = JSON.stringify(doc);
    const a = await createSimulation(doc),
      b = await createSimulation(doc);
    for (let i = 0; i < 120; i++) {
      a.step();
      b.step();
    }
    expect(a.snapshot()).toEqual(b.snapshot());
    expect(JSON.stringify(doc)).toBe(before);
    a.dispose();
    b.dispose();
  });
  it('preserves live poses for progressive asset updates and resets cleanly', async () => {
    const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
    const s = await createSimulation(doc);
    s.step(20);
    const before = s.snapshot().entities;
    doc.title = 'Updated';
    s.update(doc);
    expect(s.snapshot().entities).toEqual(before);
    s.reset();
    expect(s.snapshot().time).toBe(0);
    s.dispose();
    s.dispose();
    expect(() => s.step()).toThrow();
  });
  it('snaps and clamps variables, bounds history, restores spells', async () => {
    const s = await createSimulation(FIXTURE_WORLDS.projectileLab);
    const key = Object.keys(FIXTURE_WORLDS.projectileLab.variables!)[0]!;
    s.setVariable(key, 1e6);
    expect(s.snapshot().variables[key]).toBe(FIXTURE_WORLDS.projectileLab.variables![key]!.max);
    s.castSpell('slowMotion');
    expect(s.snapshot().timeScale).toBe(0.25);
    s.castSpell('restore');
    expect(s.snapshot().timeScale).toBe(1);
    s.step(1200);
    expect(s.snapshot().history.length).toBeLessThanOrEqual(600);
    s.dispose();
  });
});

it('fires tap once with rule metadata and caps spawned bodies', async () => {
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
  const hero = doc.entities.find((e) => e.id === doc.learning.heroEntityId)!;
  doc.rules = [
    {
      id: 'once_tap',
      when: { event: 'tap', target: hero.id },
      once: true,
      concept: 'gravity',
      then: [
        { action: 'say', text: 'Hello gravity' },
        { action: 'spawn', template: hero.id, at: 'pointer', count: 10 },
      ],
    },
  ];
  const s = await createSimulation(doc);
  const events: unknown[] = [];
  s.subscribe((e) => events.push(e));
  s.tap(hero.id);
  s.tap(hero.id);
  expect(events.filter((e) => (e as { type: string }).type === 'say')).toEqual([
    { type: 'say', say: 'Hello gravity', ruleId: 'once_tap', concept: 'gravity', time: 0 },
  ]);
  expect(s.snapshot().entities.length).toBe(doc.entities.length + 10);
  s.dispose();
});
it('uses real collision events to complete challenges once', async () => {
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
  const hero = doc.entities.find((e) => e.id === doc.learning.heroEntityId)!;
  hero.body.material = Object.keys(doc.materials)[0]!;
  hero.transform = { x: 8, y: 6, rotation: 0 };
  hero.body.size = { width: 1, height: 1 };
  hero.body.shape = 'box';
  hero.body.isStatic = false;
  hero.behaviors = [];
  hero.tags = ['hero'];
  const floor = structuredClone(hero);
  floor.id = 'test_floor';
  floor.tags = ['floor'];
  floor.body.isStatic = true;
  floor.body.size = { width: 16, height: 0.5 };
  floor.transform.y = 8;
  doc.entities = [hero, floor];
  doc.joints = [];
  doc.environment.gravity = { x: 0, y: 9.81 };
  doc.environment.medium = 'air';
  doc.challenges = [
    {
      id: 'land',
      goal: 'Land',
      hint: 'Drop',
      concept: 'gravity',
      check: { event: 'collision', a: 'hero', b: 'floor' },
      reward: [{ action: 'say', text: 'Landed' }],
    },
  ];
  doc.rules = [];
  const s = await createSimulation(doc);
  s.step(180);
  expect(s.snapshot().challenges).toEqual(['land']);
  s.dispose();
});
it('simulates a spring lattice and preserves unaffected bodies on physical edits', async () => {
  const doc = structuredClone(FIXTURE_WORLDS.jellyDragon);
  const s = await createSimulation(doc);
  const soft = doc.entities.find(
    (e) => !e.body.isStatic && doc.materials[e.body.material]!.softness > 0.2,
  )!;
  expect(s.snapshot().entities.find((e) => e.id === soft.id)?.nodes).toHaveLength(9);
  s.step(60);
  for (const e of s.snapshot().entities) expect(Number.isFinite(e.y)).toBe(true);
  const unchanged = s.snapshot().entities.find((e) => e.id === soft.id)!;
  const other = doc.entities.find((e) => e.id !== soft.id)!;
  other.body.size.width *= 0.9;
  s.update(doc);
  expect(s.snapshot().entities.find((e) => e.id === soft.id)).toEqual(unchanged);
  s.dispose();
});
it('supports protocol spells and restores the runtime settings', async () => {
  const s = await createSimulation(FIXTURE_WORLDS.moonBounce);
  s.setDial('gravity', 'moon');
  s.castSpell('slowTime');
  s.castSpell('floatAll');
  s.castSpell('grow', FIXTURE_WORLDS.moonBounce.learning.heroEntityId);
  s.castSpell('restore');
  expect(s.snapshot().timeScale).toBe(1);
  s.dispose();
});
