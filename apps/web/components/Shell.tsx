'use client';
import { useLanguage } from '../lib/i18n';
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
  useLanguage();
  const path = usePathname();
  if (
    ['/studio', '/learn', '/stories'].some(
      (route) => path === route || path.startsWith(route + '/'),
    )
  )
    return null;
  return (
    <header className="header">
      <Brand />
      <nav>
        <Link href="/play">{s.play}</Link>
        <Link href="/parent/dashboard">{s.parent}</Link>
      </nav>
      <ThemePicker compact />
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
  return (
    <footer>
      <Brand />
      <p>{s.footer}</p>
      <Link href="/privacy">{s.privacy}</Link>
    </footer>
  );
}
