import type { Creation, WorldWithId } from '@just-imagine/protocol';
import { fixtureWorldDoc, GAME_WORLDS } from './worlds';

/**
 * Fake mode's scripted build. The fake gateway and the browser are separate processes, so the
 * gateway publishes a built world by naming it: a world id from `scriptedBuildId` is Catch the
 * Flies, and the browser's fake world source serves that game under the id. A template fallback
 * build carries `template_` in its id, and its world's creation says it fell back.
 */
const PREFIX = 'w_fake_build_';
const TEMPLATE = 'template_';

export function scriptedBuildId(build: number, fallback?: 'template'): string {
  return `${PREFIX}${fallback ? TEMPLATE : ''}${build}`;
}

export function isScriptedBuild(worldId: string): boolean {
  return worldId.startsWith(PREFIX);
}

export function scriptedBuildWorld(worldId: string): WorldWithId {
  const fallback = worldId.startsWith(`${PREFIX}${TEMPLATE}`);
  return fixtureWorldDoc('projectileLab', {
    doc: { ...structuredClone(GAME_WORLDS.catchTheFlies), worldId },
    jobId: `j_${worldId}`,
    ...(fallback
      ? {
          // `fallback` is the protocol's record of a template game standing in for the wish.
          creation: {
            originalWish: 'a simpler game where a frog catches flies',
            changes: [],
            mode: 'game',
            fallback: 'template',
          } as Creation,
        }
      : {}),
  });
}
