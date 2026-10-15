import { it, expect } from 'vitest';
import { SceneDocSchema } from '@just-imagine/scene-schema';
import { createSimulation } from '@just-imagine/engine';
import { PREVIEW_WORLDS } from '../lib/preview-worlds';
import { playablePreview, tappableEntities } from '../lib/playable-preview';
import cupCollider from '../public/worlds/catching-cup.collider.json';

it('keeps all six playable scenes valid without changing the shared evaluation fixtures', () => {
  const original = JSON.stringify(PREVIEW_WORLDS);
  for (const key of Object.keys(PREVIEW_WORLDS) as (keyof typeof PREVIEW_WORLDS)[]) {
    const doc = playablePreview(PREVIEW_WORLDS[key], key, 'http://localhost:3200');
    expect(SceneDocSchema.safeParse(doc).success, key).toBe(true);
    for (const e of doc.entities)
      if (e.asset?.status === 'ready') expect(e.asset.url).toContain('/worlds/');
  }
  expect(JSON.stringify(PREVIEW_WORLDS)).toBe(original);
});
it('exposes static tap-rule objects as well as draggable objects', () => {
  expect(tappableEntities(PREVIEW_WORLDS.projectileLab).map((e) => e.id)).toContain('cannon');
  expect(tappableEntities(PREVIEW_WORLDS.galtonBoard).map((e) => e.id)).toContain('release');
  expect(tappableEntities(PREVIEW_WORLDS.fractionsLab).map((e) => e.id)).toContain('join');
  expect(tappableEntities(PREVIEW_WORLDS.projectileLab).map((e) => e.id)).not.toContain('ground');
});
it('the enlarged launcher fires a free ball and the cup collider has a real hollow center', async () => {
  const doc = playablePreview(
    PREVIEW_WORLDS.projectileLab,
    'projectileLab',
    'http://localhost:3200',
  );
  const sim = await createSimulation(doc);
  sim.tap('cannon');
  sim.step(5);
  const flying = sim.frame().entities.find((e) => e.id === 'ball')!;
  expect(flying.vx).toBeGreaterThan(3);
  expect(flying.vy).toBeLessThan(-3);
  sim.dispose();
  doc.entities.find((e) => e.id === 'ball')!.transform = { x: 12, y: 4, rotation: 0 };
  const drop = await createSimulation(doc);
  expect(drop.setCollider('cup', cupCollider)).toBe(true);
  drop.step(600);
  const caught = drop.frame().entities.find((e) => e.id === 'ball')!;
  expect(caught.x).toBeCloseTo(12, 1);
  expect(caught.y).toBeGreaterThan(7);
  expect(caught.y).toBeLessThan(7.7);
  expect(drop.frame().challenges).toContain('ch_cup');
  drop.dispose();
});
it('the fraction blocks can split and rejoin repeatedly using their real spawned identities', async () => {
  const doc = playablePreview(PREVIEW_WORLDS.fractionsLab, 'fractionsLab', 'http://localhost:3200');
  const sim = await createSimulation(doc);
  for (let i = 0; i < 3; i++) {
    const whole = sim.frame().entities.find((e) => e.id === 'whole' || e.templateId === 'whole')!;
    sim.tap(whole.id);
    expect(sim.frame().entities.filter((e) => e.templateId === 'half')).toHaveLength(2);
    sim.tap('join');
    expect(sim.frame().entities.filter((e) => e.templateId === 'whole')).toHaveLength(1);
  }
  sim.dispose();
});
