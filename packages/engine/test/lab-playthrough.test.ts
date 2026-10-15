import { it, expect } from 'vitest';
import { LAB_WORLDS } from '@just-imagine/fixtures';
import { createSimulation } from '../src/index';
it('plays the Galton board until six accumulated landing trials complete', async () => {
  const s = await createSimulation(LAB_WORLDS.galtonBoard);
  s.step(10);
  expect(s.frame().challenges).toEqual([]);
  for (let trial = 0; trial < 7; trial++) {
    s.tap('release');
    s.step(360);
  }
  const histogram = s.frame().histograms.landings!;
  expect(histogram).toHaveLength(4);
  expect(histogram.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(6);
  expect(s.frame().challenges).toContain('collect_six');
  expect(s.frame().entities.length).toBeLessThanOrEqual(24);
  s.dispose();
});
it('splits, collides the halves, recombines, and splits the new whole again', async () => {
  const s = await createSimulation(LAB_WORLDS.fractionsLab);
  s.tap('whole');
  let halves = s.frame().entities.filter((e) => e.id.startsWith('spawn_'));
  expect(halves).toHaveLength(2);
  expect(s.frame().entities.some((e) => e.id === 'whole')).toBe(false);
  for (let n = 0; n < 150; n++) {
    s.drag(halves[0]!.id, { x: 8, y: 4 });
    s.drag(halves[1]!.id, { x: 8, y: 4 });
    s.step();
  }
  s.cancelDrag(halves[0]!.id);
  s.cancelDrag(halves[1]!.id);
  expect(s.frame().challenges).toContain('share_together');
  s.tap('join');
  const whole = s.frame().entities.find((e) => e.id.startsWith('spawn_'))!;
  expect(s.frame().entities.filter((e) => e.id.startsWith('spawn_'))).toHaveLength(1);
  s.tap(whole.id);
  halves = s.frame().entities.filter((e) => e.id.startsWith('spawn_'));
  expect(halves).toHaveLength(2);
  s.step(60);
  expect(halves.every((e) => Number.isFinite(e.x))).toBe(true);
  s.dispose();
});
