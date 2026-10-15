import { describe, it, expect } from 'vitest';
import { validateScene } from '@just-imagine/scene-schema';
import { WorldDocSchema } from '@just-imagine/protocol';
import { FIXTURE_WORLDS, fixtureWorldDoc } from '../src/worlds';

describe('fixture worlds', () => {
  it('every fixture validates with no issues at all', () => {
    for (const [key, doc] of Object.entries(FIXTURE_WORLDS)) {
      const r = validateScene(doc);
      expect(r.ok, key).toBe(true);
      expect(r.issues, key).toEqual([]);
    }
  });
  it('covers water, space-free moon gravity and a pretend material between them', () => {
    expect(FIXTURE_WORLDS.pondFloat.entities.some((e) => e.kind === 'water')).toBe(true);
    expect(FIXTURE_WORLDS.moonBounce.environment.gravity.y).toBe(1.62);
    expect(FIXTURE_WORLDS.jellyDragon.materials['cloud']?.pretend).toBe(true);
  });
  it('wraps a fixture in a ready WorldDoc', () => {
    const world = fixtureWorldDoc('jellyDragon', { ownerUid: 'u1', childId: 'c1' });
    expect(WorldDocSchema.safeParse(world).success).toBe(true);
    expect(world.id).toBe('w_fixture_jelly_dragon');
    expect(world.status).toBe('ready');
    expect(world.ownerUid).toBe('u1');
  });
});

it('provides complete additive probability and fractions labs within existing DSL limits', async () => {
  const { LAB_WORLDS } = await import('../src/worlds');
  for (const doc of Object.values(LAB_WORLDS)) {
    expect(validateScene(doc).issues).toEqual([]);
    expect(doc.tier).toBe('lab');
    expect(doc.challenges?.length).toBeGreaterThan(0);
  }
  const board = LAB_WORLDS.galtonBoard;
  expect(board.entities.filter((entity) => entity.tags.includes('peg'))).toHaveLength(10);
  expect(board.visuals?.some((visual) => visual.type === 'histogram')).toBe(true);
  expect(board.rules.some((rule) => rule.then.some((action) => action.action === 'spawn'))).toBe(
    true,
  );
  const fractions = LAB_WORLDS.fractionsLab;
  expect(fractions.visuals?.filter((visual) => visual.type === 'fraction')).toHaveLength(3);
  const whole = fractions.entities.find((entity) => entity.id === 'whole')!;
  const half = fractions.entities.find((entity) => entity.id === 'half')!;
  expect(whole.body.size.width * whole.body.size.height).toBe(
    2 * half.body.size.width * half.body.size.height,
  );
  expect(fractions.rules.map((rule) => rule.id)).toEqual(['split', 'join_halves']);
  expect(Object.keys(FIXTURE_WORLDS)).toHaveLength(4);
});
