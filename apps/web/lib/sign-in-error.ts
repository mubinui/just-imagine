import { uiError } from './i18n/ui';

const WRONG = 'That email and password do not match. Check them and try again.';
/** Firebase sign-in codes in words a parent can act on. Bangla lives in ui-bn.ts. */
const MESSAGES: Record<string, string> = {
  'auth/wrong-password': WRONG,
  'auth/invalid-credential': WRONG,
  'auth/invalid-login-credentials': WRONG,
  'auth/user-not-found': WRONG,
  'auth/invalid-email': WRONG,
  'auth/user-mismatch': 'Sign in with the family account that is already open.',
  'auth/popup-closed-by-user': 'Sign-in was closed before it finished. Try again.',
  'auth/cancelled-popup-request': 'Sign-in was closed before it finished. Try again.',
  'auth/popup-blocked':
    'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.',
  'auth/too-many-requests': 'Too many tries. Wait a few minutes, then try again.',
  'auth/network-request-failed': 'Could not connect. Check the internet connection and try again.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Choose a password with at least 8 characters.',
};

/** What to show when signing in fails; never a raw Firebase code. */
export function signInError(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code.startsWith('auth/')) return MESSAGES[code] ?? 'Could not sign in. Please try again.';
  return uiError(error);
}
