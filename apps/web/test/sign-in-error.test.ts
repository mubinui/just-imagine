import { afterEach, expect, it } from 'vitest';
import { signInError } from '../lib/sign-in-error';
import { copy } from '../lib/i18n/ui';
import { setRenderLanguage } from '../lib/i18n';

const firebaseError = (code: string) =>
  Object.assign(new Error(`Firebase: Error (${code}).`), { code });
afterEach(() => setRenderLanguage('en'));

it('turns Firebase sign-in codes into words a parent can act on', () => {
  for (const code of ['auth/wrong-password', 'auth/invalid-credential', 'auth/user-not-found'])
    expect(signInError(firebaseError(code))).toBe(
      'That email and password do not match. Check them and try again.',
    );
  expect(signInError(firebaseError('auth/user-mismatch'))).toBe(
    'Sign in with the family account that is already open.',
  );
  expect(signInError(firebaseError('auth/popup-closed-by-user'))).toBe(
    'Sign-in was closed before it finished. Try again.',
  );
});

it('never shows a raw Firebase code', () => {
  expect(signInError(firebaseError('auth/internal-error'))).toBe(
    'Could not sign in. Please try again.',
  );
});

it('keeps server messages that are not Firebase codes', () => {
  expect(signInError(new Error('Account deletion is in progress'))).toBe(
    'Account deletion is in progress',
  );
});

it('has Bangla for every message', () => {
  setRenderLanguage('bn');
  for (const code of [
    'auth/wrong-password',
    'auth/user-mismatch',
    'auth/popup-closed-by-user',
    'auth/popup-blocked',
    'auth/too-many-requests',
    'auth/network-request-failed',
    'auth/email-already-in-use',
    'auth/weak-password',
    'auth/internal-error',
  ])
    expect(copy(signInError(firebaseError(code)))).toMatch(/^[^A-Za-z]*$/);
});
