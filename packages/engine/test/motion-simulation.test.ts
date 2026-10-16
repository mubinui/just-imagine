import { expect, it } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures';
import { createSimulation } from '../src/simulation';

it('keeps a running actor upright through real ground contacts and horizontal acceleration', async () => {
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
  for (const m of Object.values(doc.materials)) {
    m.softness = 0;
    m.restitution = 0;
  }
  const hero = doc.entities.find((e) => e.id === doc.learning.heroEntityId)!;
  hero.body.shape = 'box';
  hero.body.size = { width: 0.8, height: 1.4 };
  hero.transform = { x: 4, y: 3, rotation: 0 };
  hero.behaviors = [];
  hero.locomotion = { kind: 'run', stride: 1, facing: 'right' };
  doc.environment.gravity = { x: 0, y: 9.81 };
  const sim = await createSimulation(doc);
  try {
    sim.step(180);
    const before = sim.frame().entities.find((e) => e.id === hero.id)!;
    expect(before.grounded).toBe(true);
    sim.impulse(hero.id, { x: 3, y: 0 });
    sim.step(60);
    const after = sim.frame().entities.find((e) => e.id === hero.id)!;
    expect(after.x).toBeGreaterThan(before.x + 0.1);
    expect(after.rotation).toBeCloseTo(0, 5);
  } finally {
    sim.dispose();
  }
});
