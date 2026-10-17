import type { CharacterId } from '@just-imagine/protocol';

/** A world the child asked for that is still being made, remembered across child screens. */
export interface Build {
  worldId: string;
  characterId: CharacterId;
  startedAt: number;
}
export type BadgeState = 'hidden' | 'making' | 'slow' | 'ready' | 'failed';

const KEY = 'ji-building';
/** After this long without a finished world the badge says so instead of spinning on. */
export const SLOW_BUILD_MS = 4 * 60 * 1000;

export function currentBuild(): Build | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as Partial<Build> | null;
    if (
      value &&
      typeof value.worldId === 'string' &&
      typeof value.characterId === 'string' &&
      typeof value.startedAt === 'number'
    )
      return value as Build;
  } catch {
    /* a corrupted or unavailable record is the same as none */
  }
  return undefined;
}

/** Keeps the first start time when the same world reports progress again. */
export function rememberBuild(build: Build) {
  const existing = currentBuild();
  const next =
    existing?.worldId === build.worldId ? { ...build, startedAt: existing.startedAt } : build;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage may be unavailable; the badge simply does not appear */
  }
  announce();
}

function announce() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(KEY));
}

export function clearBuild() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
  announce();
}

/** Listens for builds remembered or cleared in this tab. */
export function onBuildChange(listener: () => void) {
  window.addEventListener(KEY, listener);
  return () => window.removeEventListener(KEY, listener);
}

/** The world document appears only once the first playable draft exists, so `undefined` means still early. */
export function badgeState(
  build: Build | undefined,
  now: number,
  worldStatus: 'building' | 'ready' | 'failed' | undefined,
): BadgeState {
  if (!build) return 'hidden';
  if (worldStatus === 'ready') return 'ready';
  if (worldStatus === 'failed') return 'failed';
  return now - build.startedAt > SLOW_BUILD_MS ? 'slow' : 'making';
}
