'use client';
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
  return (
    <div className="adm-heading">
      <div>
        <h1>{title}</h1>
        {detail && <p className="adm-detail">{detail}</p>}
      </div>
      {onRefresh && (
        <button type="button" className="adm-button" onClick={onRefresh} disabled={busy}>
          {busy ? 'Refreshing…' : 'Refresh'}
        </button>
      )}
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  if (!message) return null;
  const signedOut = message.includes('Sign in again');
  return (
    <div className="adm-alert" role="alert">
      <p>{message}</p>
      {signedOut && (
        <Link className="adm-link" href="/admin/sign-in">
          Go to operator sign-in
        </Link>
      )}
    </div>
  );
}

/** Placeholder rows shaped like the content they stand in for. */
export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="adm-skeleton" aria-busy="true" aria-label="Loading">
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
  return (
    <div className="adm-empty">
      <p className="adm-empty-title">{title}</p>
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
  return (
    <label className="adm-reason" htmlFor={id}>
      Reason
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={3}
        maxLength={500}
        placeholder="Recorded in the audit log"
        autoComplete="off"
      />
    </label>
  );
}
export const reasonReady = (reason: string) => reason.trim().length >= 3;
