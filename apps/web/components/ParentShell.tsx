'use client';
import { useLanguage } from '../lib/i18n';
import { copy as uiText } from '../lib/i18n/ui';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Brand, Preview } from './Shell';
import { ParentGate } from './ParentGate';
import { parentAreaOpen, signOutFamily } from '../lib/parent-gate';
import { s } from '../lib/strings/en';
export function ParentShell({ children }: { children: React.ReactNode }) {
  useLanguage();
  const path = usePathname(),
    router = useRouter();
  // The server checks the lock on arrival, but back, forward and prefetched links can show this
  // page without asking it, so nothing shows until the lock is checked here too.
  const [locked, setLocked] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    void parentAreaOpen().then((open) => live && setLocked(!open));
    return () => {
      live = false;
    };
  }, []);
  if (locked) return <ParentGate onOpen={() => setLocked(false)} />;
  if (locked === null) return <p className="loading">{s.load}</p>;
  return (
    <div data-world="parent">
      <header className="header">
        <Brand />
        <Link className="button secondary" href="/play">
          {s.play} ↗
        </Link>
      </header>
      <Preview />
      <div className="parent-shell">
        <aside className="parent-nav">
          <p>{s.parent}</p>
          <nav>
            {[
              ['dashboard', s.dashboard],
              ['children', s.children],
              ['billing', s.billing],
              ['settings', s.settings],
            ].map(([route, label]) => (
              <Link
                key={route}
                href={'/parent/' + route}
                aria-current={path.endsWith(route!) ? 'page' : undefined}
              >
                {uiText(label)}
              </Link>
            ))}
          </nav>
          <button
            onClick={async () => {
              await signOutFamily();
              router.push('/sign-in');
            }}
          >
            {s.signOut}
          </button>
        </aside>
        <main className="parent-content">{children}</main>
      </div>
    </div>
  );
}
