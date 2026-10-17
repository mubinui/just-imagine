'use client';
import { useState, type ReactNode } from 'react';
import { schoolRequest } from '../../lib/school/api';
import { schoolError, schoolErrorMessage } from '../../lib/school/errors';
import { useSchoolLanguage } from '../../lib/i18n/study';
export function LanguageSwitch({ student = false }: { student?: boolean }) {
  const { language, setLanguage, s } = useSchoolLanguage();
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
      {error && <span role="alert">{schoolError(error, language)}</span>}
    </label>
  );
}
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  const { s, language } = useSchoolLanguage();
  return error ? (
    <div className="sch-error" role="alert">
      <p>{schoolError(error, language)}</p>
      {retry && <button onClick={retry}>{s('retry')}</button>}
    </div>
  ) : null;
}
export function Loading() {
  const { s } = useSchoolLanguage();
  return (
    <p className="sch-loading" role="status">
      {s('loading')}
    </p>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="sch-field">
      <span>{label}</span>
      {children}
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
  return { busy, error, errorDetail, notice, run, setError };
}
export function ActionNotice({
  action,
}: {
  action: { error: string; errorDetail?: unknown; notice: string };
}) {
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
}
