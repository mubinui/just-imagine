'use client';
import { useLanguage } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onIdTokenChanged } from 'firebase/auth';
import { firebase } from '../lib/firebase';
import { env } from '../lib/env';
import { lockParentArea } from '../lib/parent-gate';
import { s } from '../lib/strings/en';
export function ChildGuard({ children }: { children: React.ReactNode }) {
  useLanguage();
  const [ready, setReady] = useState(env.fake);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  // Any child screen locks the parent space: getting back in needs the grown-up to sign in again.
  useEffect(lockParentArea, []);
  useEffect(() => {
    if (env.fake) return;
    let version = 0;
    const stop = onIdTokenChanged(firebase().auth, (user) => {
      const current = ++version;
      setReady(false);
      if (!user) {
        router.replace('/sign-in');
        return;
      }
      void user
        .getIdTokenResult()
        .then(({ claims }) => {
          if (current !== version) return;
          if (Object.hasOwn(claims, 'role')) {
            router.replace(claims['role'] === 'student' ? '/study' : '/school');
            return;
          }
          setFailed(false);
          setReady(true);
        })
        .catch(() => {
          if (current === version) setFailed(true);
        });
    });
    return () => {
      version++;
      stop();
    };
  }, [router]);
  return ready ? (
    children
  ) : failed ? (
    <div className="loading" role="alert">
      <p>{s.errorTitle}</p>
      <button type="button" onClick={() => window.location.reload()}>
        {s.retry}
      </button>
    </div>
  ) : (
    <p className="loading">{s.load}</p>
  );
}
