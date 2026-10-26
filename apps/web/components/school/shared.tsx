'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { UiIcon } from '../UiIcon';
import { schoolRequest } from '../../lib/school/api';
import { schoolError, schoolErrorMessage, type SchoolAudience } from '../../lib/school/errors';
import { useSchoolLanguage } from '../../lib/i18n/study';

/** Teacher screens speak to adults (আপনি); student screens keep the friendly তুমি register. */
const Audience = createContext<SchoolAudience>('student');
export function SchoolAudienceProvider({
  audience,
  children,
}: {
  audience: SchoolAudience;
  children: ReactNode;
}) {
  return <Audience.Provider value={audience}>{children}</Audience.Provider>;
}
export const useSchoolAudience = () => useContext(Audience);
export function LanguageSwitch({ student = false }: { student?: boolean }) {
  const { language, setLanguage, s } = useSchoolLanguage();
  const audience = useSchoolAudience();
  const [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  return (
    <label className="sch-language">
      <span className="sr-only">{s('language')}</span>
      <select
        value={language}
        disabled={saving}
        onChange={(e) => {
          const next = e.target.value === 'bn' ? 'bn' : 'en';
          if (!student) {
            setLanguage(next);
            return;
          }
          setSaving(true);
          setError('');
          void schoolRequest('study/me', { language: next }, 'PATCH')
            .then(() => setLanguage(next))
            .catch((err) => setError(schoolErrorMessage(err)))
            .finally(() => setSaving(false));
        }}
      >
        <option value="en">English</option>
        <option value="bn">বাংলা</option>
      </select>
      {error && <span role="alert">{schoolError(error, language, audience)}</span>}
    </label>
  );
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  const { s, language } = useSchoolLanguage();
  const audience = useSchoolAudience();
  return error ? (
    <div className="sch-error" role="alert">
      <p>{schoolError(error, language, audience)}</p>
      {retry && (
        <button type="button" onClick={retry}>
          {s('retry')}
        </button>
      )}
    </div>
  ) : null;
}
/** A quiet skeleton in the shape of the content it replaces; the label stays for screen readers. */
export function Loading({ rows = 3 }: { rows?: number }) {
  const { s } = useSchoolLanguage();
  return (
    <div className="sch-loading" role="status" aria-live="polite">
      <span className="sr-only">{s('loading')}</span>
      {Array.from({ length: rows }, (_, i) => (
        <span className="sch-skeleton" key={i} aria-hidden="true" />
      ))}
    </div>
  );
}
export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="sch-empty-state" role="status">
      <p className="sch-empty-title">{title}</p>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
  error,
  hintId,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  /** Lets the control reference the hint or error with aria-describedby. */
  hintId?: string;
  className?: string;
}) {
  return (
    <label
      className={className ? `sch-field ${className}` : 'sch-field'}
      data-invalid={error ? 'true' : undefined}
    >
      <span>{label}</span>
      {children}
      {(error || hint) && (
        <small id={hintId} className={error ? 'sch-field-error' : 'sch-field-hint'}>
          {error || hint}
        </small>
      )}
    </label>
  );
}
export function useSchoolAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [errorDetail, setErrorDetail] = useState<unknown>(),
    [notice, setNotice] = useState('');
  async function run(fn: () => Promise<void>, success = '') {
    setBusy(true);
    setError('');
    setErrorDetail(undefined);
    setNotice('');
    try {
      await fn();
      setNotice(success);
      return true;
    } catch (e) {
      setErrorDetail(e);
      setError(schoolErrorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, errorDetail, notice, run, setError, setNotice };
}
export function ActionNotice({
  action,
  toast = false,
}: {
  action: { error: string; errorDetail?: unknown; notice: string };
  /** Teacher console: float the result where the teacher is looking instead of the page top. */
  toast?: boolean;
}) {
  const { s } = useSchoolLanguage();
  const [dismissed, setDismissed] = useState<unknown>(null);
  const current = action.errorDetail ?? (action.error || action.notice);
  useEffect(() => {
    if (!toast || !action.notice || action.error) return;
    const timer = window.setTimeout(() => setDismissed(current), 6000);
    return () => window.clearTimeout(timer);
  }, [toast, action.notice, action.error, current]);
  if (!toast)
    return (
      <>
        <ErrorNotice error={action.errorDetail ?? action.error} />
        {action.notice && (
          <p role="status" className="sch-notice">
            {action.notice}
          </p>
        )}
      </>
    );
  const visible = current && dismissed !== current;
  return (
    <div className="sch-toast-region" aria-live="polite">
      {visible && (
        <div className="sch-toast" data-tone={action.error ? 'error' : 'success'}>
          {action.error || action.errorDetail ? (
            <ErrorNotice error={action.errorDetail ?? action.error} />
          ) : (
            <p role="status" className="sch-notice">
              {action.notice}
            </p>
          )}
          <button
            type="button"
            className="sch-toast-close"
            aria-label={s('close')}
            onClick={() => setDismissed(current)}
          >
            <UiIcon name="close" />
          </button>
        </div>
      )}
    </div>
  );
}
