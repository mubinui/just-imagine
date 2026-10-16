import { FIXTURE_WORLDS, LAB_WORLDS, GAME_WORLDS } from '@just-imagine/fixtures/browser';
export const PREVIEW_WORLDS = { ...FIXTURE_WORLDS, ...LAB_WORLDS, ...GAME_WORLDS };
export type PreviewKey = keyof typeof PREVIEW_WORLDS;
