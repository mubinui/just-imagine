'use client';
import { useState } from 'react';
import type { ChildResponse, Language } from '@just-imagine/protocol';
import { useLanguage, selectLanguageProfile, setLanguage } from '../lib/i18n';
import { copy as uiText, uiError } from '../lib/i18n/ui';
import { api } from '../lib/api';

/** A persisted child choice also governs the shared screens in this browser. */
export function LanguagePreferencesForm({ child }: { child?: ChildResponse }) {
  const { language } = useLanguage();
  const [draft, setDraft] = useState<Language>(child?.language ?? language);
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState(''),
    [error, setError] = useState('');
  return (
    <form
      className="language-preferences"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setStatus('');
        setError('');
        try {
          if (child) {
            const updated = await api<ChildResponse>(
              'updateChild',
              { childId: child.id },
              { language: draft },
            );
            selectLanguageProfile(updated);
          } else setLanguage(draft);
          setStatus(
            uiText(
              'Language saved. Every screen and the next conversation will use this language.',
            ),
          );
        } catch (error) {
          setError(uiError(error));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>{uiText('App and conversation language')}</h2>
      <p>
        {child
          ? uiText(
              'Choose the language for {v0}. The app, learning activities and voice will follow it.',
              { v0: child.firstName },
            )
          : uiText('Choose the language used throughout the app.')}
      </p>
      <p>
        {uiText(
          'Saved stories and worlds open in this language too. First-time translation may take a moment.',
        )}
      </p>
      <label>
        {uiText('Language')}
        <select
          value={draft}
          disabled={busy}
          onChange={(event) => {
            setDraft(event.target.value === 'bn' ? 'bn' : 'en');
            setStatus('');
          }}
        >
          <option value="en">{uiText('English')}</option>
          <option value="bn">{uiText('Bangla (Bangladesh)')}</option>
        </select>
      </label>
      <button type="submit" className="button primary" disabled={busy}>
        {uiText(busy ? 'Saving…' : 'Save language')}
      </button>
      <p role="status">{status}</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
