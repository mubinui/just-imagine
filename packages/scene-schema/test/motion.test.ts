import { expect, it } from 'vitest';
import { EntitySchema, MotionAtlasSchema } from '../src/schema';
import { GeneratedEntitySchema } from '../src/gen';
import { minimalScene } from './helpers';
it('accepts old entities and validated generated locomotion without invented asset URLs', () => {
  const e = minimalScene().entities[0]!;
  expect(EntitySchema.safeParse(e).success).toBe(true);
  const { asset: _asset, ...generated } = e;
  expect(
    GeneratedEntitySchema.parse({
      ...generated,
      locomotion: { kind: 'run', stride: 1.2, facing: 'right' },
    }).locomotion?.kind,
  ).toBe('run');
  expect(
    GeneratedEntitySchema.safeParse({
      ...generated,
      locomotion: { kind: 'roll', stride: 1, facing: 'left', wheels: [{ x: 5, y: 0, radius: 0 }] },
    }).success,
  ).toBe(false);
  expect(MotionAtlasSchema.safeParse({ columns: 3, rows: 2, frames: 8 }).success).toBe(false);
});
