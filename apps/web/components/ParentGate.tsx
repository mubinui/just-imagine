'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type User,
} from 'firebase/auth';
import { useLanguage } from '../lib/i18n';
import { copy as uiText } from '../lib/i18n/ui';
import { signInError } from '../lib/sign-in-error';
import { env } from '../lib/env';
import { firebase, prepareSignIn } from '../lib/firebase';
import { signOutFamily, unlockParentArea } from '../lib/parent-gate';
import { s } from '../lib/strings/en';
import { Brand, Preview } from './Shell';
import { AuthCompanion } from './AuthCompanion';

/**
 * Stands in front of the parent space after a child screen has been open. The grown-up already
 * signed in on this device signs in again; anyone else can only go back to playing.
 */
export function ParentGate({ onOpen }: { onOpen?: () => void }) {
  const { language } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(env.fake),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (env.fake) return;
    prepareSignIn();
    const auth = firebase().auth;
    let live = true;
    void auth.authStateReady().then(() => {
      if (!live) return;
      setUser(auth.currentUser);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, []);
  const providers = new Set(user?.providerData.map((p) => p.providerId));
  const google = env.fake || providers.has('google.com'),
    password = env.fake || (providers.has('password') && Boolean(user?.email));

  async function open(signIn: (user: User) => Promise<unknown>) {
    setError('');
    setBusy(true);
    try {
      if (env.fake) await unlockParentArea();
      else {
        if (!user) throw new Error(s.signInAgain);
        await signIn(user);
        await unlockParentArea(await user.getIdToken(true));
      }
      onOpen?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? signInError(e) : s.unavailable);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page auth-character-page parent-gate">
      <header className="auth-character-header">
        <Brand />
        <Preview />
      </header>
      <div className="auth-character-layout">
        <AuthCompanion role="family" language={language} />
        <section className="auth-panel" aria-labelledby="parent-gate-title">
          <h1 id="parent-gate-title">{s.parentGateTitle}</h1>
          <p className="parent-gate-lead">{s.parentGateLead}</p>
          {user?.email && (
            <p className="parent-gate-account">
              {uiText(s.parentGateAccount, { email: user.email })}
            </p>
          )}
          {!ready ? (
            <p className="loading">{s.load}</p>
          ) : (
            <>
              {password && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const secret = String(new FormData(event.currentTarget).get('password'));
                    void open((u) =>
                      reauthenticateWithCredential(
                        u,
                        EmailAuthProvider.credential(u.email ?? '', secret),
                      ),
                    );
                  }}
                >
                  <label>
                    {s.parentGatePassword}
                    <input
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required={!env.fake}
                    />
                  </label>
                  <button className="button primary" disabled={busy}>
                    {s.parentGateOpen}
                  </button>
                </form>
              )}
              {google && (
                <button
                  className={password ? 'button secondary' : 'button primary'}
                  disabled={busy}
                  onClick={() =>
                    void open((u) => reauthenticateWithPopup(u, new GoogleAuthProvider()))
                  }
                >
                  {s.google}
                </button>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="error">
              {uiText(error)}
            </p>
          )}
          <Link href="/play">{s.parentGateBack}</Link>
          <button
            type="button"
            className="text-link parent-gate-other"
            onClick={() => void signOutFamily().then(() => router.push('/sign-in'))}
          >
            {s.parentGateOther}
          </button>
        </section>
      </div>
    </main>
  );
}
