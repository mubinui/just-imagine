'use client';
import { useLanguage } from '../lib/i18n';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { firebase } from '../lib/firebase';
import { env } from '../lib/env';
import { s } from '../lib/strings/en';
export function ChildGuard({ children }: { children: React.ReactNode }) {
  useLanguage();
  const [ready, setReady] = useState(env.fake);
  const router = useRouter();
  useEffect(() => {
    if (env.fake) return;
    return onAuthStateChanged(firebase().auth, (user) => {
      if (user) setReady(true);
      else router.replace('/sign-in');
    });
  }, [router]);
  return ready ? children : <p className="loading">{s.load}</p>;
}
