'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
/* eslint-disable @next/next/no-img-element -- Parent-selected in-memory photo preview. */
import { useEffect, useState } from 'react';
import {
  CHARACTERS,
  CompanionIdSchema,
  type ChildResponse,
  type Companion,
} from '@just-imagine/protocol';
import { api } from '../../lib/api';
import { env } from '../../lib/env';
import { CompanionArt } from './Companion';
export function CompanionSetup({
  child,
  onSaved,
}: {
  child: ChildResponse;
  onSaved: () => Promise<void>;
}) {
  useLanguage();
  const [name, setName] = useState(child.companion?.name ?? uiText('Pip')),
    [characterId, setCharacterId] = useState(child.companion?.characterId ?? 'bhombol'),
    [mode, setMode] = useState<'preset' | 'photo'>(
      child.companion?.kind === 'chibi' ? 'photo' : 'preset',
    ),
    [photo, setPhoto] = useState<File>(),
    [preview, setPreview] = useState(''),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  useEffect(() => {
    if (!photo) return;
    const url = URL.createObjectURL(photo);
    queueMicrotask(() => setPreview(url));
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const friend: Companion = child.companion ?? { kind: 'preset', characterId, name };
  async function save() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      let result: ChildResponse;
      if (mode === 'photo') {
        if (!photo || !consent)
          throw new Error(uiText('Choose a photo and confirm permission first.'));
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]!);
          reader.onerror = () =>
            reject(new Error(uiText('The photo could not be read. Please choose it again.')));
          reader.readAsDataURL(photo);
        });
        result = await api<ChildResponse>(
          'createCompanion',
          { childId: child.id },
          { name, characterId, consent, mimeType: photo.type, photo: data },
        );
        setPhoto(undefined);
        setPreview('');
        setConsent(false);
      } else
        result = await api<ChildResponse>(
          'updateChild',
          { childId: child.id },
          { companion: { kind: 'preset', characterId, name } },
        );
      try {
        if (JSON.parse(localStorage.getItem('ji-child') || 'null')?.id === child.id)
          localStorage.setItem('ji-child', JSON.stringify(result));
      } catch {
        /* Selection refreshes next time the profile is opened. */
      }
      await onSaved();
      setMessage(
        uiText('{v0} is ready to explore with {v1}.', {
          v0: String(name),
          v1: String(child.firstName),
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error ? uiError(e) : uiText('Your friend could not be saved. Try again.'),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="companion-setup"
      aria-label={uiText('{v0} companion', { v0: child.firstName })}
    >
      <div className="companion-setup-preview">
        <CompanionArt companion={friend} />
        <p>{uiText(child.companion?.name ?? uiText('A friend for every adventure'))}</p>
      </div>
      <div className="companion-setup-fields">
        <h3>{uiText('Meet their play friend')}</h3>
        <p>{uiText('A familiar face to explore, wonder and find the way together.')}</p>
        <div className="companion-options" role="group" aria-label={uiText('Companion style')}>
          <button
            type="button"
            aria-pressed={mode === 'preset'}
            disabled={busy}
            onClick={() => {
              setMode('preset');
              setPhoto(undefined);
              setPreview('');
            }}
          >
            {uiText('Choose a friend')}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'photo'}
            disabled={busy}
            onClick={() => setMode('photo')}
          >
            {uiText('Make a chibi from a photo')}
          </button>
        </div>
        <label>
          {uiText("Friend's name")}
          <input
            value={name}
            maxLength={24}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <fieldset disabled={busy}>
          <legend>{uiText('Choose their personality')}</legend>
          <div className="companion-personalities">
            {CompanionIdSchema.options.map((id) => (
              <button
                type="button"
                key={id}
                aria-pressed={characterId === id}
                onClick={() => setCharacterId(id)}
              >
                <CompanionArt
                  companion={{ kind: 'preset', characterId: id, name: CHARACTERS[id].displayName }}
                />
                <span>{uiText(CHARACTERS[id].displayName)}</span>
                <small>{uiText(CHARACTERS[id].title)}</small>
              </button>
            ))}
          </div>
        </fieldset>
        {mode === 'photo' && (
          <div className="companion-photo">
            <label>
              {uiText('Photo of your child')}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setError('');
                  setPreview('');
                  setPhoto(undefined);
                  if (
                    file &&
                    (file.size > 4 * 1024 * 1024 ||
                      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
                  ) {
                    setError(uiText('Choose a JPEG, PNG or WebP smaller than 4 MB.'));
                    e.target.value = '';
                    return;
                  }
                  setPhoto(file);
                }}
              />
            </label>
            {photo && preview && (
              <img
                className="companion-photo-preview"
                src={preview}
                width={96}
                height={96}
                alt={uiText('Selected photo, used only to draw the companion')}
              />
            )}
            <p>
              {uiText(
                "Use a clear photo of one child. We send it to Gemini to draw a cartoon, then keep only the generated artwork in your child's profile. The original is not saved by this app.",
              )}
            </p>
            <label className="companion-consent">
              <input
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(e) => setConsent(e.target.checked)}
              />
              {uiText(
                'I am the parent or guardian and permit this photo to be sent to Gemini for the avatar.',
              )}
            </label>
            {env.fake && (
              <p>
                {uiText(
                  'Photo drawing needs the connected Gemini service. You can choose a ready-made friend in this preview.',
                )}
              </p>
            )}
          </div>
        )}
        <button
          type="button"
          className="button primary"
          disabled={busy || !name.trim() || (mode === 'photo' && (!photo || !consent || env.fake))}
          onClick={() => void save()}
        >
          {busy
            ? uiText('Getting your friend ready…')
            : mode === 'photo'
              ? uiText('Draw their chibi friend')
              : uiText('Save their friend')}
        </button>
        {error && (
          <p className="error" role="alert">
            {uiText(error)}
          </p>
        )}
        {message && <p role="status">{uiText(message)}</p>}
      </div>
    </section>
  );
}
