import { afterEach, expect, it } from 'vitest';
import { isPermissionDenied } from '../lib/permission-denied';
import { uiError } from '../lib/i18n/ui';
import { setRenderLanguage } from '../lib/i18n';
import { BUILD_GIVE_UP_MS, shouldGiveUp, type Build } from '../lib/building';
import { onWorldReadDenied } from '../lib/world-read-denied';
import { english } from '../lib/strings/en';

const denied = { code: 'permission-denied', message: 'Missing or insufficient permissions.' };
afterEach(() => setRenderLanguage('en'));

it('recognises a Firestore permission-denied error by code or message', () => {
  expect(isPermissionDenied(denied)).toBe(true);
  expect(isPermissionDenied({ code: 'permission-denied' })).toBe(true);
  expect(isPermissionDenied(new Error('Missing or insufficient permissions.'))).toBe(true);
  expect(isPermissionDenied({ code: 'unavailable', message: 'offline' })).toBe(false);
  expect(isPermissionDenied({ code: 'unauthenticated', message: 'No user' })).toBe(false);
  expect(isPermissionDenied({ code: 'not-found', message: 'Gone' })).toBe(false);
  expect(isPermissionDenied(undefined)).toBe(false);
});

it('never shows a permissions error to a child, in English or Bangla', () => {
  expect(uiError(denied)).toBe(english.unavailable);
  setRenderLanguage('bn');
  const bangla = uiError(denied);
  expect(bangla).toBe('কাজটা শেষ করা গেল না। আবার চেষ্টা করুন।');
  expect(bangla).not.toMatch(/permission/i);
});

const build: Build = { worldId: 'w1', characterId: 'bhombol', startedAt: 1000 };

it('gives up on a build only after the builder deadline has passed', () => {
  expect(shouldGiveUp(undefined, 1e9)).toBe(false);
  expect(shouldGiveUp(build, 1000 + BUILD_GIVE_UP_MS)).toBe(false);
  expect(shouldGiveUp(build, 1000 + BUILD_GIVE_UP_MS + 1)).toBe(true);
});

it('decides what a denied world read does', () => {
  const late = 1000 + BUILD_GIVE_UP_MS + 1;
  // Normal build in progress: deselect quietly, keep the build.
  expect(onWorldReadDenied({ worldId: 'w1', job: 'building', build, now: 5000 })).toEqual({
    deselect: true,
    toast: false,
    clearBuild: false,
  });
  // Dead build: friendly line once, forget it.
  expect(onWorldReadDenied({ worldId: 'w1', job: undefined, build, now: late })).toEqual({
    deselect: true,
    toast: true,
    clearBuild: true,
  });
  // A different remembered build is never wiped.
  expect(onWorldReadDenied({ worldId: 'other', job: 'ready', build, now: late }).clearBuild).toBe(
    false,
  );
});
