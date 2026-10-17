'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText } from '../../lib/i18n/ui';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { Brand } from '../Shell';
import { firebase } from '../../lib/firebase';

const PAGES = [
  ['/admin', 'Overview'],
  ['/admin/families', 'Families'],
  ['/admin/schools', 'Schools'],
  ['/admin/catalog', 'Catalog'],
  ['/admin/lessons', 'Lessons'],
  ['/admin/safety', 'Safety'],
  ['/admin/content', 'Content'],
  ['/admin/appearance', 'Appearance'],
  ['/admin/system', 'System'],
  ['/admin/audit', 'Audit log'],
] as const;

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  useLanguage();
  const path = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  return (
    <div data-world="parent" className="adm">
      <header className="header adm-header">
        <Brand />
        <p className="adm-who">
          {uiText('Operator console')}
          <span>{uiText(email)}</span>
        </p>
      </header>
      <div className="parent-shell">
        <aside className="parent-nav">
          <p>{uiText('Operate')}</p>
          <nav aria-label={uiText('Operator console')}>
            {PAGES.map(([href, label]) => (
              <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>
                {uiText(label)}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            disabled={leaving}
            onClick={async () => {
              setLeaving(true);
              await signOut(firebase().auth).catch(() => undefined);
              await fetch('/admin/session', { method: 'DELETE' }).catch(() => undefined);
              router.replace('/admin/sign-in');
            }}
          >
            {leaving ? uiText('Signing out…') : uiText('Sign out')}
          </button>
        </aside>
        <main className="parent-content adm-content">{children}</main>
      </div>
    </div>
  );
}
