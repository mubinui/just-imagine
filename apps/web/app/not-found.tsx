'use client';
import { useLanguage } from '../lib/i18n';
import Link from 'next/link';
import { s } from '../lib/strings/en';
export default function NotFound() {
  useLanguage();
  return (
    <main className="prose">
      <h1>{s.errorTitle}</h1>
      <Link href="/">{s.home}</Link>
    </main>
  );
}
