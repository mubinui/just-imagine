'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebase } from '../../lib/firebase';
import { Brand } from '../Shell';
import { AuthCompanion } from '../AuthCompanion';

export function AdminSignIn({ notOperator = false }: { notOperator?: boolean }) {
  const { language } = useLanguage();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(form: FormData) {
    setError('');
    setBusy(true);
    const auth = firebase().auth;
    try {
      const result = await signInWithEmailAndPassword(
        auth,
        String(form.get('email')),
        String(form.get('password')),
      );
      const response = await fetch('/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: await result.user.getIdToken(true) }),
      });
      if (!response.ok) {
        await signOut(auth);
        throw new Error(
          (await response.json().catch(() => null))?.error ?? uiText('Sign in again to continue.'),
        );
      }
      router.replace('/admin');
      router.refresh();
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setError(
        code.startsWith('auth/')
          ? uiText('That email and password do not match an account.')
          : e instanceof Error
            ? uiError(e)
            : uiText('Sign in again to continue.'),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div data-world="parent" className="adm adm-signin-page">
      <main className="auth-page adm-signin auth-character-page">
        <header className="auth-character-header">
          <Brand />
        </header>
        <div className="auth-character-layout">
          <AuthCompanion role="operator" language={language} />
          <section>
            <h1>{uiText('Operator sign-in')}</h1>
            <p>
              {uiText(
                'For Just Imagine operators only. Parent accounts sign in at the family area; this console needs an operator account with admin access.',
              )}
            </p>
            {notOperator && (
              <div className="adm-alert" role="alert">
                <p>
                  {uiText(
                    'The account you are signed in with is not an operator account, so the console stayed closed. Sign in below with an operator account.',
                  )}
                </p>
                <Link className="adm-link" href="/">
                  {uiText('Back to Just Imagine')}
                </Link>
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submit(new FormData(event.currentTarget));
              }}
              className="adm-signin-form"
            >
              <label>
                {uiText('Email')}
                <input name="email" type="email" autoComplete="username" required />
              </label>
              <label>
                {uiText('Password')}
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              {error && (
                <p className="adm-alert" role="alert">
                  {uiText(error)}
                </p>
              )}
              <button type="submit" className="adm-button adm-primary" disabled={busy}>
                {busy ? uiText('Checking access…') : uiText('Sign in')}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
