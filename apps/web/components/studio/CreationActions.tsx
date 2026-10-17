'use client';
import { useId, useState } from 'react';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText } from '../../lib/i18n/ui';
import { UiIcon } from '../UiIcon';

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
  // Talking comes first; the keyboard opens only when the child (or a grown-up) asks for it.
  const [writing, setWriting] = useState(false);
  const formId = useId();
  return (
    <div className="creation-actions" data-open={writing || undefined}>
      <button
        type="button"
        className="write-toggle"
        aria-expanded={writing}
        aria-controls={formId}
        onClick={() => setWriting(!writing)}
      >
        <UiIcon name="write" />
        <span>{uiText('Write')}</span>
        <span className="write-toggle-hint">
          {t(hasWorld ? 'creation.change' : 'creation.invitation')}
        </span>
      </button>
      {writing && (
        <form
          id={formId}
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
              {t(
                busy ? 'creation.working' : hasWorld ? 'creation.submitEdit' : 'creation.submitNew',
              )}
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
      )}
    </div>
  );
}
