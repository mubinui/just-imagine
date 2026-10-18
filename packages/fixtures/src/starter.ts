import type { SceneDoc } from '@just-imagine/scene-schema';
import { PREVIEW_WORLDS, playablePreview, type PreviewKey } from './playable';

export { STARTER_STORIES, type StarterStory } from './starter-stories';

/**
 * Ready-to-play worlds every new explorer finds in My worlds: one game and two playable science
 * worlds, prepared with the same painted art and level tuning the Studio shows.
 */
export const STARTER_WORLD_KEYS = [
  'catchTheFlies',
  'moonBounce',
  'projectileLab',
] as const satisfies readonly PreviewKey[];
export type StarterWorldKey = (typeof STARTER_WORLD_KEYS)[number];

/** A starter world's scene, with every asset URL on the given web origin. */
export function starterWorld(key: StarterWorldKey, origin: string, worldId: string): SceneDoc {
  return { ...playablePreview(PREVIEW_WORLDS[key], key, origin), worldId };
}
