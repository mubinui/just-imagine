'use client';
import { setLanguage, useLanguage } from '../lib/i18n';
import { setSchoolLanguage } from '../lib/i18n/study';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { s } from '../lib/strings/en';
import { env } from '../lib/env';
import { Mark } from './Mark';
import { ThemePicker } from './ThemePicker';
export function Brand() {
  useLanguage();
  return (
    <Link className="brand" href="/">
      <span className="brand-mark" aria-hidden="true">
        <Mark size={32} />
      </span>
      {s.brand}
      <span className="brand-dot">.</span>
    </Link>
  );
}
export function Header() {
  const { language } = useLanguage();
  const path = usePathname();
  const welcome = path === '/';
  if (
    ['/studio', '/learn', '/stories'].some(
      (route) => path === route || path.startsWith(route + '/'),
    )
  )
    return null;
  return (
    <header className={`header${welcome ? ' welcome-header' : ''}`}>
      <Brand />
      {welcome ? (
        <nav aria-label={s.landing.entryLabel}>
          <Link href={env.fake ? '/play' : '/sign-in'}>{s.landing.parents}</Link>
          <Link href="/study/sign-in">{s.landing.students}</Link>
          <Link href="/school/sign-in">{s.landing.teachers}</Link>
        </nav>
      ) : (
        <nav>
          <Link href="/play">{s.play}</Link>
          <Link href="/parent/dashboard">{s.parent}</Link>
        </nav>
      )}
      {welcome ? (
        <div className="welcome-preferences">
          <label className="welcome-language">
            <span className="sr-only">{s.languageLabel}</span>
            <select
              aria-label={s.languageLabel}
              value={language}
              onChange={(event) => {
                const next = event.target.value === 'bn' ? 'bn' : 'en';
                setLanguage(next);
                setSchoolLanguage(next);
              }}
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
      ) : (
        <ThemePicker compact />
      )}
    </header>
  );
}
export function Preview() {
  useLanguage();
  return env.fake ? (
    <div className="preview" role="note">
      {s.preview}
    </div>
  ) : null;
}
export function Footer() {
  useLanguage();
  const welcome = usePathname() === '/';
  return (
    <footer>
      <Brand />
      <p>{s.footer}</p>
      <Link href="/privacy">{s.privacy}</Link>
      {welcome && <Link href="/admin/sign-in">{s.landing.operator}</Link>}
    </footer>
  );
}
