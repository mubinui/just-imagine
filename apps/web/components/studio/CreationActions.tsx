'use client';
import { useState } from 'react';
import { useLanguage } from '../../lib/i18n';

/** The child's own words drive creation; there is no preset or parameter form. */
export function CreationActions({
  hasWorld,
  canUndo,
  busy,
  onSubmit,
  onUndo,
}: {
  hasWorld: boolean;
  canUndo: boolean;
  busy: boolean;
  onSubmit: (text: string) => void;
  onUndo: () => void;
}) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  return (
    <details className="creation-actions" open={hasWorld ? undefined : true}>
      <summary>{t(hasWorld ? 'creation.change' : 'creation.invitation')}</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const text = draft.trim();
          if (!text || busy) return;
          onSubmit(text);
          setDraft('');
        }}
      >
        <label htmlFor="creation-wish">
          {t(hasWorld ? 'creation.editLabel' : 'creation.newLabel')}
        </label>
        <p id="creation-help">{t('creation.help')}</p>
        <textarea
          id="creation-wish"
          aria-describedby="creation-help"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={2000}
          rows={2}
          disabled={busy}
        />
        <div className="creation-buttons">
          <button type="submit" disabled={busy || !draft.trim()}>
            {t(busy ? 'creation.working' : hasWorld ? 'creation.submitEdit' : 'creation.submitNew')}
          </button>
          {hasWorld && (
            <button
              type="button"
              className="creation-undo"
              disabled={busy || !canUndo}
              onClick={onUndo}
            >
              {t('creation.undo')}
            </button>
          )}
        </div>
      </form>
    </details>
  );
}
