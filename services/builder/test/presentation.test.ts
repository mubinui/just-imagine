import { it, expect } from 'vitest';
import { minimalScene } from '../../../packages/scene-schema/test/helpers';
import { applyPaintedFloor } from '../src/presentation';
it('hides only the loading rectangle over an approved painted base floor, preserving physics and platforms', () => {
  const doc = minimalScene();
  doc.game = {
    mode: 'freeplay',
    script: { apiVersion: 1, source: 'game.on("tap",()=>{});', hash: 'test' },
  };
  doc.theme.backdrop.status = 'ready';
  const base = doc.entities.find((e) => e.kind === 'ground')!;
  const body = structuredClone(base.body),
    at = structuredClone(base.transform);
  const platform = structuredClone(base);
  platform.id = 'platform';
  platform.tags = ['platform'];
  platform.body.size = { width: 3, height: 0.3 };
  platform.transform = { x: 7, y: 4, rotation: 0 };
  doc.entities.push(platform);
  applyPaintedFloor(doc);
  expect(base.tags).toContain('painted_ground');
  expect(platform.tags).not.toContain('painted_ground');
  expect(base.body).toEqual(body);
  expect(base.transform).toEqual(at);
});
it('retains readable ground geometry while artwork is missing or the world is a guided lab', () => {
  const doc = minimalScene();
  doc.game = { script: { apiVersion: 1, source: 'game.on("tap",()=>{});', hash: 'test' } };
  const base = doc.entities[0]!;
  applyPaintedFloor(doc);
  expect(base.tags).not.toContain('painted_ground');
  doc.theme.backdrop.status = 'ready';
  doc.tier = 'lab';
  applyPaintedFloor(doc);
  expect(base.tags).not.toContain('painted_ground');
});
