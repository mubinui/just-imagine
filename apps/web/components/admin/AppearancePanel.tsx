'use client';
import { useState, type CSSProperties } from 'react';
import { THEME_PALETTES, type Appearance, type ThemeId } from '@just-imagine/protocol';
import { themeStyle, publishAppearance } from '../../lib/appearance';
import { adminApi, useAdminResource } from './adminApi';
import { LoadError, PageHeading, Skeleton } from './parts';
import { Mark } from '../Mark';
import { UiIcon } from '../UiIcon';

const load = () => adminApi<Appearance>('appearance');
export function AppearancePanel() {
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
        `${palette.name} is live. Open pages update within 30 seconds or when they regain focus.`,
      );
      await reload();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'The theme could not be applied. Try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="Appearance"
        detail="Choose the colours families see throughout Just Imagine."
        onRefresh={() => void reload()}
        busy={loading || busy}
      />
      <LoadError message={error} />
      {!data ? (
        loading && <Skeleton rows={5} />
      ) : (
        <div className="adm-appearance">
          <section className="adm-section" aria-labelledby="palette-title">
            <h2 id="palette-title">Interface palette</h2>
            <p className="adm-detail">
              The brand mark, navigation, buttons and reading surfaces change together. Character
              art and learning worlds keep their original colours.
            </p>
            <fieldset className="adm-palettes" disabled={busy}>
              <legend className="sr-only">Choose a palette</legend>
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
                        {p.name}
                        {data.theme === id ? ' · Live' : ''}
                      </strong>
                      <small>{p.description}</small>
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
                {busy ? 'Applying…' : `Apply ${palette.name}`}
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
                  Reset preview
                </button>
              )}
            </div>
            <p className="adm-live" role="status">
              {notice ||
                (selected === data.theme
                  ? `${palette.name} is the published theme.`
                  : 'Preview only. Apply when you are ready.')}
            </p>
            {failure && (
              <p className="adm-alert" role="alert">
                {failure}
              </p>
            )}
          </section>
          <section
            className="adm-theme-preview"
            style={themeStyle(selected) as CSSProperties}
            aria-label={`${palette.name} theme preview`}
          >
            <div className="adm-preview-brand">
              <Mark size={42} />
              <strong>
                Just Imagine<span>.</span>
              </strong>
            </div>
            <div className="adm-preview-stage">
              <UiIcon name="book" />
              <h2>
                A little idea.
                <br />A whole new world.
              </h2>
              <p>Your characters, your adventures.</p>
              <span className="adm-preview-button">
                <UiIcon name="mic" /> Talk together
              </span>
            </div>
            <div className="adm-preview-paper">
              <strong>Read, play, discover.</strong>
              <p>A calm place for the next big question.</p>
              <span>Parent and reading surfaces</span>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
