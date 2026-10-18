'use client';
import { useLanguage } from '../lib/i18n';
import { copy as uiText, uiError } from '../lib/i18n/ui';
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
import { s } from '../lib/strings/en';
import { Brand, Preview } from './Shell';
import { AuthCompanion } from './AuthCompanion';
export function AuthForm({ signup = false }: { signup?: boolean }) {
  const { language } = useLanguage();
  const router = useRouter();
  const [consent, setConsent] = useState(false),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  // Ready Google sign-in before the first tap, so phones open its popup on that tap.
  useEffect(prepareSignIn, []);
  async function submit(form: FormData | null) {
    setError('');
    if ((signup || !form) && !consent) {
      setError(s.consentRequired);
      return;
    }
    setBusy(true);
    try {
      if (env.fake) {
        localStorage.setItem('ji-preview-auth', '1');
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
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: await result.user.getIdToken(),
          consent,
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error);
      router.push(signup ? '/parent/children' : '/play');
    } catch (e) {
      setError(e instanceof Error ? uiError(e) : s.unavailable);
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
            <button className="button primary" disabled={busy}>
              {s.submit}
            </button>
          </form>
          <button className="button secondary" disabled={busy} onClick={() => void submit(null)}>
            {s.google}
          </button>
          {error && (
            <p role="alert" className="error">
              {uiText(error)}
            </p>
          )}
          <Link href={signup ? '/sign-in' : '/sign-up'}>{signup ? s.signIn : s.signUp}</Link>
          {env.fake && <Link href="/play">{s.previewSignIn}</Link>}
        </section>
      </div>
    </main>
  );
}
