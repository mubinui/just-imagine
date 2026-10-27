'use client';
import { useLanguage } from '../lib/i18n';
import { copy as uiText } from '../lib/i18n/ui';
import { signInError } from '../lib/sign-in-error';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { firebase, prepareSignIn } from '../lib/firebase';
import { env } from '../lib/env';
import { signOutFamily, unlockParentArea } from '../lib/parent-gate';
import { s } from '../lib/strings/en';
import { Brand, Preview } from './Shell';
import { AuthCompanion } from './AuthCompanion';
import { ConsentStep } from './ConsentStep';
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const { language } = useLanguage();
  const router = useRouter();
  const [consent, setConsent] = useState(false),
    // Set when signing in reached an account Just Imagine has never seen: it needs consent once.
    [newAccount, setNewAccount] = useState(false),
    [accountEmail, setAccountEmail] = useState<string | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const askConsent = signup || newAccount;
  /** Opens the family session; returning parents never need consent again. */
  async function openSession(idToken: string) {
    const response = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, consent: askConsent && consent }),
    });
    if (response.ok) {
      router.push(signup || newAccount ? '/parent/children' : '/play');
      return;
    }
    const body = (await response.json().catch(() => ({}))) as { error?: string; code?: string };
    if (body.code === 'CONSENT_REQUIRED') {
      // Not a failure: the step itself explains what is needed.
      setAccountEmail(firebase().auth.currentUser?.email ?? null);
      setNewAccount(true);
      setError('');
      return;
    }
    throw new Error(body.error);
  }
  /** Finishes a new account after consent, with the sign-in that just happened. */
  async function createAccount() {
    setError('');
    if (!consent) {
      setError(s.consentRequired);
      return;
    }
    const user = firebase().auth.currentUser;
    if (!user) {
      setNewAccount(false);
      setError(s.signInAgain);
      return;
    }
    setBusy(true);
    try {
      await openSession(await user.getIdToken());
    } catch (e) {
      setError(e instanceof Error ? signInError(e) : s.unavailable);
    } finally {
      setBusy(false);
    }
  }
  /** Leaves the unfinished new account and returns to the sign-in choices. */
  async function switchAccount() {
    setBusy(true);
    try {
      await signOutFamily();
    } finally {
      setNewAccount(false);
      setConsent(false);
      setError('');
      setBusy(false);
    }
  }
  // Ready Google sign-in before the first tap, so phones open its popup on that tap.
  useEffect(prepareSignIn, []);
  async function submit(form: FormData | null) {
    setError('');
    if (signup && !consent) {
      setError(s.consentRequired);
      return;
    }
    setBusy(true);
    try {
      if (env.fake) {
        localStorage.setItem('ji-preview-auth', '1');
        if (signup) await unlockParentArea();
        router.push(signup ? '/parent/children' : '/play');
        return;
      }
      const auth = firebase().auth;
      const result = form
        ? signup
          ? await createUserWithEmailAndPassword(
              auth,
              String(form.get('email')),
              String(form.get('password')),
            )
          : await signInWithEmailAndPassword(
              auth,
              String(form.get('email')),
              String(form.get('password')),
            )
        : await signInWithPopup(auth, new GoogleAuthProvider());
      await openSession(await result.user.getIdToken());
    } catch (e) {
      setError(e instanceof Error ? signInError(e) : s.unavailable);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page auth-character-page">
      <header className="auth-character-header">
        <Brand />
        <Preview />
      </header>
      <div className="auth-character-layout">
        <AuthCompanion role="family" language={language} />
        <section className="auth-panel">
          {newAccount ? (
            <ConsentStep
              email={accountEmail}
              consent={consent}
              busy={busy}
              error={error}
              onConsent={setConsent}
              onCreate={() => void createAccount()}
              onOtherAccount={() => void switchAccount()}
            />
          ) : (
            <>
              <h1>{signup ? s.signUp : s.signIn}</h1>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void submit(new FormData(event.currentTarget));
                }}
              >
                <label>
                  {s.email}
                  <input name="email" type="email" autoComplete="email" required />
                </label>
                <label>
                  {s.password}
                  <input
                    name="password"
                    type="password"
                    autoComplete={signup ? 'new-password' : 'current-password'}
                    minLength={8}
                    required
                  />
                </label>
                {askConsent && (
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      {s.consent} <Link href="/privacy">{s.privacy}</Link>
                    </span>
                  </label>
                )}
                <button className="button primary" disabled={busy}>
                  {s.submit}
                </button>
              </form>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => void submit(null)}
              >
                {s.google}
              </button>
              {error && (
                <p role="alert" className="error">
                  {uiText(error)}
                </p>
              )}
              <Link href={signup ? '/sign-in' : '/sign-up'}>{signup ? s.signIn : s.signUp}</Link>
              {env.fake && <Link href="/play">{s.previewSignIn}</Link>}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
