'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
import Link from 'next/link';

export function PageHeading({
  title,
  detail,
  onRefresh,
  busy,
}: {
  title: string;
  detail?: string;
  onRefresh?: () => void;
  busy?: boolean;
}) {
  useLanguage();
  return (
    <div className="adm-heading">
      <div>
        <h1>{uiText(title)}</h1>
        {detail && <p className="adm-detail">{uiText(detail)}</p>}
      </div>
      {onRefresh && (
        <button type="button" className="adm-button" onClick={onRefresh} disabled={busy}>
          {busy ? uiText('Refreshing…') : uiText('Refresh')}
        </button>
      )}
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  useLanguage();
  if (!message) return null;
  const signedOut = /sign in again|প্রবেশ করুন/i.test(message);
  return (
    <div className="adm-alert" role="alert">
      <p>{uiError(message)}</p>
      {signedOut && (
        <Link className="adm-link" href="/admin/sign-in">
          {uiText('Go to operator sign-in')}
        </Link>
      )}
    </div>
  );
}

/** Placeholder rows shaped like the content they stand in for. */
export function Skeleton({ rows = 4 }: { rows?: number }) {
  useLanguage();
  return (
    <div className="adm-skeleton" aria-busy="true" aria-label={uiText('Loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}

export type Tone = 'good' | 'warn' | 'bad' | 'quiet';
/** A status label: the word carries the meaning, the fill only reinforces it. */
export function Status({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <span className={`adm-status adm-status-${tone}`}>{children}</span>;
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  useLanguage();
  return (
    <div className="adm-empty">
      <p className="adm-empty-title">{uiText(title)}</p>
      {children && <p>{children}</p>}
    </div>
  );
}

export function ReasonField({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  id: string;
}) {
  useLanguage();
  return (
    <label className="adm-reason" htmlFor={id}>
      {uiText('Reason')}
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={3}
        maxLength={500}
        placeholder={uiText('Recorded in the audit log')}
        autoComplete="off"
      />
    </label>
  );
}
export const reasonReady = (reason: string) => reason.trim().length >= 3;
