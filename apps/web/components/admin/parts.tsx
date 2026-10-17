'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  useLanguage();
  if (!message) return null;
  const signedOut = /sign in again|প্রবেশ করুন/i.test(message);
  return (
    <div className="adm-alert adm-alert-row" role="alert">
      <p>{uiError(message)}</p>
      {signedOut ? (
        <Link className="adm-link" href="/admin/sign-in">
          {uiText('Go to operator sign-in')}
        </Link>
      ) : (
        onRetry && (
          <button type="button" className="adm-button adm-quiet" onClick={onRetry}>
            {uiText('Retry')}
          </button>
        )
      )}
    </div>
  );
}

/** A labelled control in an operator form. */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="adm-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

/** Copies a value and confirms it in place, for ids and one-time links. */
export function CopyButton({ value, label }: { value: string; label: string }) {
  useLanguage();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="adm-button adm-quiet adm-small"
      aria-label={label}
      onClick={() =>
        void navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          })
          .catch(() => undefined)
      }
    >
      {copied ? uiText('Copied') : uiText('Copy')}
    </button>
  );
}

/** Success and failure for one form, shown next to the control that caused it. */
export function FormResult({ notice, failure }: { notice: string; failure: string }) {
  return (
    <>
      <p className="adm-live" role="status">
        {notice}
      </p>
      {failure && (
        <p className="adm-alert" role="alert">
          {failure}
        </p>
      )}
    </>
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

/** A modal side panel for editing one record; Escape and Close both dismiss it. */
export function Drawer({
  title,
  titleId,
  onClose,
  wide = false,
  children,
}: {
  title: string;
  titleId: string;
  onClose: () => void;
  wide?: boolean;
  children: React.ReactNode;
}) {
  useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={wide ? 'adm-drawer adm-drawer-wide' : 'adm-drawer'}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="adm-drawer-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="adm-button" onClick={() => dialog.current?.close()}>
          {uiText('Close')}
        </button>
      </div>
      {children}
    </dialog>
  );
}
