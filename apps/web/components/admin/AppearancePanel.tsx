'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
import { useState, type CSSProperties } from 'react';
import { THEME_PALETTES, type Appearance, type ThemeId } from '@just-imagine/protocol';
import { themeStyle, publishAppearance } from '../../lib/appearance';
import { adminApi, useAdminResource } from './adminApi';
import { LoadError, PageHeading, Skeleton } from './parts';
import { Mark } from '../Mark';
import { UiIcon } from '../UiIcon';

const load = () => adminApi<Appearance>('appearance');
export function AppearancePanel() {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { data, error, loading, reload } = useAdminResource(load);
  const [draft, setDraft] = useState<ThemeId>(),
    [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(''),
    [notice, setNotice] = useState('');
  const selected = draft ?? data?.theme ?? 'forest';
  const palette = THEME_PALETTES[selected];
  async function save() {
    if (!data) return;
    setBusy(true);
    setFailure('');
    setNotice('');
    try {
      await adminApi('setAppearance', {
        body: {
          theme: selected,
          revision: data.revision,
          reason: `Published ${palette.name} interface palette from Appearance`,
        },
      });
      publishAppearance({ theme: selected, revision: data.revision + 1 });
      setNotice(
        bn
          ? `${uiText(palette.name)} এখন অ্যাপের নির্ধারিত রং। এটি অনুসরণ করা পাতা ৩০ সেকেন্ডের মধ্যে বা ফিরে এলে বদলাবে। ডিভাইসের নিজস্ব পছন্দ রাখা থাকবে।`
          : `${palette.name} is now the app default. Pages following it update within 30 seconds or on return. Personal choices stay selected.`,
      );
      await reload();
    } catch (e) {
      setFailure(
        e instanceof Error ? uiError(e) : uiText('The theme could not be applied. Try again.'),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title={uiText('Appearance')}
        detail={
          bn
            ? 'ডিভাইসের রং বেছে নেওয়া না থাকলে যে রং ব্যবহার হবে, তা নির্ধারণ করুন।'
            : 'Choose the colors used by devices that follow the app default.'
        }
        onRefresh={() => void reload()}
        busy={loading || busy}
      />
      <LoadError message={error} />
      {!data ? (
        loading && <Skeleton rows={5} />
      ) : (
        <div className="adm-appearance">
          <section className="adm-section" aria-labelledby="palette-title">
            <h2 id="palette-title">{uiText('Interface palette')}</h2>
            <p className="adm-detail">
              {uiText(
                'The brand mark, navigation, buttons and reading surfaces change together. Character art and learning worlds keep their original colours.',
              )}
            </p>
            <fieldset className="adm-palettes" disabled={busy}>
              <legend className="sr-only">{uiText('Choose a palette')}</legend>
              {(Object.keys(THEME_PALETTES) as ThemeId[]).map((id) => {
                const p = THEME_PALETTES[id];
                return (
                  <label key={id} className="adm-palette" data-selected={selected === id}>
                    <input
                      type="radio"
                      name="interface-palette"
                      value={id}
                      checked={selected === id}
                      onChange={() => {
                        setDraft(id);
                        setNotice('');
                        setFailure('');
                      }}
                    />
                    <span className="adm-swatch" aria-hidden="true">
                      {[p.ink, p.accent, p.ground, p.yellow].map((colour, i) => (
                        <i key={i} style={{ background: colour }} />
                      ))}
                    </span>
                    <span>
                      <strong>
                        {uiText(p.name)}
                        {data.theme === id ? ` · ${bn ? 'অ্যাপের নির্ধারিত' : 'App default'}` : ''}
                      </strong>
                      <small>{uiText(p.description)}</small>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <div className="adm-toolbar">
              <button
                className="adm-button adm-primary"
                type="button"
                disabled={busy || loading || !!error || selected === data.theme}
                onClick={() => void save()}
              >
                {busy
                  ? uiText('Applying…')
                  : bn
                    ? `${uiText(palette.name)} অ্যাপের নির্ধারিত রং করুন`
                    : `Use ${palette.name} as app default`}
              </button>
              {selected !== data.theme && (
                <button
                  className="adm-button"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDraft(data.theme);
                    setFailure('');
                  }}
                >
                  {uiText('Reset preview')}
                </button>
              )}
            </div>
            <p className="adm-live" role="status">
              {notice ||
                (selected === data.theme
                  ? bn
                    ? `${uiText(palette.name)} অ্যাপের নির্ধারিত রং। নিজের ডিভাইসের পছন্দ আলাদা হতে পারে।`
                    : `${palette.name} is the app default. Your device's choice can differ.`
                  : bn
                    ? 'এটি শুধু নমুনা। প্রস্তুত হলে অ্যাপের নির্ধারিত রং করুন।'
                    : 'Preview only. Set as app default when ready.')}
            </p>
            {failure && (
              <p className="adm-alert" role="alert">
                {uiText(failure)}
              </p>
            )}
          </section>
          <section
            className="adm-theme-preview"
            style={themeStyle(selected) as CSSProperties}
            aria-label={uiText('{v0} theme preview', { v0: String(palette.name) })}
          >
            <div className="adm-preview-brand">
              <Mark size={42} />
              <strong>
                {uiText('Just Imagine')}
                <span>.</span>
              </strong>
            </div>
            <div className="adm-preview-stage">
              <UiIcon name="book" />
              <h2>
                {uiText('A little idea.')}
                <br />
                {uiText('A whole new world.')}
              </h2>
              <p>{uiText('Your characters, your adventures.')}</p>
              <span className="adm-preview-button">
                <UiIcon name="mic" /> {uiText('Talk together')}
              </span>
            </div>
            <div className="adm-preview-paper">
              <strong>{uiText('Read, play, discover.')}</strong>
              <p>{uiText('A calm place for the next big question.')}</p>
              <span>{uiText('Parent and reading surfaces')}</span>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
