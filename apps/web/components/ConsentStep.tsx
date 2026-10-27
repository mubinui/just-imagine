import Link from 'next/link';
import { copy as uiText } from '../lib/i18n/ui';
import { s } from '../lib/strings/en';

/** Shown once, when signing in reaches an account Just Imagine has never seen. */
export function ConsentStep({
  email,
  consent,
  busy,
  error,
  onConsent,
  onCreate,
  onOtherAccount,
}: {
  email?: string | null;
  consent: boolean;
  busy: boolean;
  error: string;
  onConsent: (checked: boolean) => void;
  onCreate: () => void;
  onOtherAccount: () => void;
}) {
  return (
    <>
      <h1>{s.signUp}</h1>
      <p className="consent-step-lead">{s.newAccountConsent}</p>
      {email && <p className="consent-step-account">{uiText(s.parentGateAccount, { email })}</p>}
      <div className="consent-step">
        <label className="check">
          <input type="checkbox" checked={consent} onChange={(e) => onConsent(e.target.checked)} />
          <span>
            {s.consent} <Link href="/privacy">{s.privacy}</Link>
          </span>
        </label>
        {error && (
          <p role="alert" className="error">
            {uiText(error)}
          </p>
        )}
        <button type="button" className="button primary" disabled={busy} onClick={onCreate}>
          {s.createFamilyAccount}
        </button>
      </div>
      <button
        type="button"
        className="text-link consent-step-other"
        disabled={busy}
        onClick={onOtherAccount}
      >
        {s.parentGateOther}
      </button>
    </>
  );
}
