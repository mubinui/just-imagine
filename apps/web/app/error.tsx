'use client';
import { useLanguage } from '../lib/i18n';
import { s } from '../lib/strings/en';
export default function ErrorPage({ reset }: { reset: () => void }) {
  useLanguage();
  return (
    <main className="prose">
      <h1>{s.errorTitle}</h1>
      <p>{s.unavailable}</p>
      <button onClick={reset}>{s.retry}</button>
    </main>
  );
}
