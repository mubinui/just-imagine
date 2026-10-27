import { afterEach, expect, it } from 'vitest';
import { isPermissionDenied } from '../lib/permission-denied';
import { uiError } from '../lib/i18n/ui';
import { setRenderLanguage } from '../lib/i18n';
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
