'use client';
import { setLanguage, useLanguage, type Language } from '../../lib/i18n';
import { copy as uiText } from '../../lib/i18n/ui';
import { schoolLanguage, setSchoolLanguage } from '../../lib/i18n/study';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import type { AdminSystemStatus } from '@just-imagine/protocol';
import { Brand } from '../Shell';
import { firebase } from '../../lib/firebase';
import { ThemePicker } from '../ThemePicker';
import { UiIcon } from '../UiIcon';
import { adminApi } from './adminApi';
import { ADMIN_PAGES, KILL_SWITCH_EVENT, currentPage } from './nav';

/** One language for the whole console: the family store and the school store move together. */
function chooseLanguage(next: Language) {
  setLanguage(next);
  setSchoolLanguage(next);
}

function useKillSwitch() {
  const [paused, setPaused] = useState(false);
  const check = useCallback(() => {
    adminApi<AdminSystemStatus>('system')
      .then((status) => setPaused(status.killSwitch.on))
      .catch(() => undefined);
  }, []);
  useEffect(() => {
    queueMicrotask(check);
    const timer = setInterval(check, 60_000);
    window.addEventListener(KILL_SWITCH_EVENT, check);
    return () => {
      clearInterval(timer);
      window.removeEventListener(KILL_SWITCH_EVENT, check);
    };
  }, [check]);
  return paused;
}

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const { language } = useLanguage();
  const path = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuOpen = menuFor === path;
  const paused = useKillSwitch();
  const active = currentPage(path);
  const activeLabel = ADMIN_PAGES.find((p) => p.href === active)?.label ?? 'Overview';
  // Shared lesson screens read the school store; keep it on the console's language.
  useEffect(() => {
    if (schoolLanguage() !== language) setSchoolLanguage(language);
  }, [language]);
  return (
    <div data-world="parent" className="adm adm-shell">
      <a className="adm-skip" href="#adm-main">
        {uiText('Skip to content')}
      </a>
      <header className="header adm-header">
        <Brand />
        <div className="adm-header-end">
          <p className="adm-who">
            {uiText('Operator console')}
            <span className="adm-email" title={email}>
              {email}
            </span>
          </p>
          <label className="adm-language">
            <span className="adm-visually-hidden">{uiText('Language')}</span>
            <select
              aria-label={uiText('Language')}
              value={language}
              onChange={(e) => chooseLanguage(e.target.value === 'bn' ? 'bn' : 'en')}
            >
              <option lang="en" value="en">
                English
              </option>
              <option lang="bn" value="bn">
                বাংলা
              </option>
            </select>
          </label>
          <ThemePicker compact />
        </div>
      </header>
      {paused && (
        <div className="adm-banner" role="status">
          <p>
            <strong>{uiText('Generation is paused.')}</strong>{' '}
            {uiText('Voice sessions and world builds refuse new work until it is resumed.')}
          </p>
          {active !== '/admin/system' && (
            <Link className="adm-link" href="/admin/system">
              {uiText('Open System')}
            </Link>
          )}
        </div>
      )}
      <div className="parent-shell adm-frame">
        <aside className="parent-nav adm-nav" data-open={menuOpen}>
          <p>{uiText('Operate')}</p>
          <button
            type="button"
            className="adm-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="adm-nav-links"
            onClick={() => setMenuFor(menuOpen ? null : path)}
          >
            <span>
              <small>{uiText('Menu')}</small>
              {uiText(activeLabel)}
            </span>
            <UiIcon name="arrowDown" />
          </button>
          <nav id="adm-nav-links" aria-label={uiText('Operator console')}>
            {ADMIN_PAGES.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={active === href ? 'page' : undefined}
                onClick={() => setMenuFor(null)}
              >
                <UiIcon name={icon} />
                <span>{uiText(label)}</span>
              </Link>
            ))}
          </nav>
          <button
            type="button"
            className="adm-signout"
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
        <main id="adm-main" className="parent-content adm-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
