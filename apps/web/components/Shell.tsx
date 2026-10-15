import Link from 'next/link';
import { s } from '../lib/strings/en';
import { env } from '../lib/env';
import { Mark } from './Mark';
export function Brand() {
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
  return (
    <header className="header">
      <Brand />
      <nav>
        <Link href="/play">{s.play}</Link>
        <Link href="/parent/dashboard">{s.parent}</Link>
      </nav>
    </header>
  );
}
export function Preview() {
  return env.fake ? (
    <div className="preview" role="note">
      {s.preview}
    </div>
  ) : null;
}
export function Footer() {
  return (
    <footer>
      <Brand />
      <p>{s.footer}</p>
      <Link href="/privacy">{s.privacy}</Link>
    </footer>
  );
}
