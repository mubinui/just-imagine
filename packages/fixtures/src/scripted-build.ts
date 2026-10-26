import type { WorldWithId } from '@just-imagine/protocol';
import { fixtureWorldDoc, GAME_WORLDS } from './worlds';

/**
 * Fake mode's scripted build. The fake gateway and the browser are separate processes, so the
 * gateway publishes a built world by naming it: a world id from `scriptedBuildId` is Catch the
 * Flies, and the browser's fake world source serves that game under the id.
 */
const PREFIX = 'w_fake_build_';

export function scriptedBuildId(build: number): string {
  return `${PREFIX}${build}`;
}

export function isScriptedBuild(worldId: string): boolean {
  return worldId.startsWith(PREFIX);
}

export function scriptedBuildWorld(worldId: string): WorldWithId {
  return fixtureWorldDoc('projectileLab', {
    doc: { ...structuredClone(GAME_WORLDS.catchTheFlies), worldId },
    jobId: `j_${worldId}`,
  });
}
