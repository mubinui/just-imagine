import { beforeEach, expect, it } from 'vitest';
import {
  badgeState,
  clearBuild,
  currentBuild,
  rememberBuild,
  SLOW_BUILD_MS,
} from '../lib/building';

beforeEach(() => sessionStorage.clear());

it('remembers a world being made and keeps its first start time', () => {
  rememberBuild({ worldId: 'w_one', characterId: 'bhombol', startedAt: 100 });
  rememberBuild({ worldId: 'w_one', characterId: 'bhombol', startedAt: 900 });
  expect(currentBuild()).toEqual({ worldId: 'w_one', characterId: 'bhombol', startedAt: 100 });
  rememberBuild({ worldId: 'w_two', characterId: 'mishti', startedAt: 950 });
  expect(currentBuild()?.worldId).toBe('w_two');
  clearBuild();
  expect(currentBuild()).toBeUndefined();
});

it('ignores a corrupted record instead of failing', () => {
  sessionStorage.setItem('ji-building', '{not json');
  expect(currentBuild()).toBeUndefined();
});

it('shows making until the world is ready, then ready', () => {
  const build = { worldId: 'w_one', characterId: 'bhombol' as const, startedAt: 0 };
  expect(badgeState(build, 1000, undefined)).toBe('making');
  expect(badgeState(build, 1000, 'building')).toBe('making');
  expect(badgeState(build, 1000, 'ready')).toBe('ready');
  expect(badgeState(build, 1000, 'failed')).toBe('failed');
});

it('admits a slow build honestly instead of spinning forever', () => {
  const build = { worldId: 'w_one', characterId: 'bhombol' as const, startedAt: 0 };
  expect(badgeState(build, SLOW_BUILD_MS + 1, undefined)).toBe('slow');
  expect(badgeState(build, SLOW_BUILD_MS + 1, 'ready')).toBe('ready');
  expect(badgeState(undefined, 0, undefined)).toBe('hidden');
});
