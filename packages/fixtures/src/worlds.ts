import { SceneDocSchema } from '@just-imagine/scene-schema';
import type { WorldDoc, WorldWithId } from '@just-imagine/protocol';
import jellyDragon from '../worlds/jelly-dragon.json' with { type: 'json' };
import moonBounce from '../worlds/moon-bounce.json' with { type: 'json' };
import pondFloat from '../worlds/pond-float.json' with { type: 'json' };
import projectileLab from '../worlds/projectile-lab.json' with { type: 'json' };
import galtonBoard from '../worlds/galton-board.json' with { type: 'json' };
import fractionsLab from '../worlds/fractions-lab.json' with { type: 'json' };
import catchTheFlies from '../worlds/catch-the-flies.json' with { type: 'json' };

export const FIXTURE_WORLDS = {
  jellyDragon: SceneDocSchema.parse(jellyDragon),
  moonBounce: SceneDocSchema.parse(moonBounce),
  pondFloat: SceneDocSchema.parse(pondFloat),
  projectileLab: SceneDocSchema.parse(projectileLab),
} as const;
export type FixtureWorldKey = keyof typeof FIXTURE_WORLDS;

// Additive catalog: preserve the original four demo fixture keys.
export const LAB_WORLDS = {
  galtonBoard: SceneDocSchema.parse(galtonBoard),
  fractionsLab: SceneDocSchema.parse(fractionsLab),
} as const;

// Additive catalog: preview worlds that carry a generated game script (Game API v1).
export const GAME_WORLDS = {
  catchTheFlies: SceneDocSchema.parse(catchTheFlies),
} as const;
export type GameWorldKey = keyof typeof GAME_WORLDS;

export function fixtureWorldDoc(
  key: FixtureWorldKey,
  overrides: Partial<WorldDoc> = {},
): WorldWithId {
  const doc = structuredClone(overrides.doc ?? FIXTURE_WORLDS[key]);
  const now = 1_760_000_000_000;
  return {
    id: doc.worldId,
    ownerUid: 'u_fixture',
    childId: 'c_fixture',
    title: doc.title,
    status: 'ready',
    doc,
    schemaVersion: 1,
    promptVersion: 'fixture',
    styleVersion: 'fixture',
    assets: {},
    concepts: doc.learning.concepts,
    thumbnailUrl: null,
    jobId: `j_${key}`,
    createdAt: now,
    updatedAt: now,
    ...structuredClone(overrides),
  };
}
