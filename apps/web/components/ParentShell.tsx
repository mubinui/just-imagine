'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { Brand, Preview } from './Shell';
import { env } from '../lib/env';
import { firebase } from '../lib/firebase';
import { s } from '../lib/strings/en';
export function ParentShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    router = useRouter();
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
                {label}
              </Link>
            ))}
          </nav>
          <button
            onClick={async () => {
              if (!env.fake) {
                await signOut(firebase().auth);
                await fetch('/api/session', { method: 'DELETE' });
              }
              localStorage.removeItem('ji-child');
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
