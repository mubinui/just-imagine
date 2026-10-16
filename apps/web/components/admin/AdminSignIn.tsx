'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { firebase } from '../../lib/firebase';
import { Brand } from '../Shell';

export function AdminSignIn() {
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
          (await response.json().catch(() => null))?.error ?? 'Sign in again to continue.',
        );
      }
      router.replace('/admin');
      router.refresh();
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      setError(
        code.startsWith('auth/')
          ? 'That email and password do not match an account.'
          : e instanceof Error
            ? e.message
            : 'Sign in again to continue.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div data-world="parent" className="adm adm-signin-page">
      <main className="auth-page adm-signin">
        <Brand />
        <section>
          <h1>Operator sign-in</h1>
          <p>
            For Just Imagine operators only. Parent accounts sign in at the family area; this
            console needs an operator account with admin access.
          </p>
          <form action={(f) => void submit(f)} className="adm-signin-form">
            <label>
              Email
              <input name="email" type="email" autoComplete="username" required />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required />
            </label>
            {error && (
              <p className="adm-alert" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="adm-button adm-primary" disabled={busy}>
              {busy ? 'Checking access…' : 'Sign in'}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
