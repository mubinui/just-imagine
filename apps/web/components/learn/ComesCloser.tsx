'use client';
import { copy as uiText } from '../../lib/i18n/ui';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../../lib/i18n';
import { getVoice } from '../../lib/voice';
import { LearningActivity } from './LearningActivity';
import { LearnArt } from './LearnArt';
import { flipFrom, type Box } from './geometry';
import type { PublicCharacter, PublicActivity } from './types';

const ENTER_MS = 640;

/**
 * The comes-closer moment (spec 6b): the tapped character leaves its spot in the world and grows
 * to the front of the stage while the world dims behind it; its facts arrive as speech bubbles.
 * `from` is the hotspot's on-screen rectangle, so the portrait starts exactly where the child
 * tapped. During a call the portrait sits in a toy phone; while the character speaks its mouth
 * follows the voice.
 */
export function ComesCloser({
  character,
  from,
  holdFactsMs,
  call,
  live,
  caption,
  onClose,
  activity,
  onActivity,
  onSound,
  onChallenge,
  onDress,
  look,
  motion,
  challengeDone,
}: {
  character: PublicCharacter;
  from?: DOMRect;
  /** Wait before the first bubble, e.g. while the animal's real call plays. */
  holdFactsMs: number;
  call: 'idle' | 'ringing' | 'connected';
  live: boolean;
  caption: string;
  onClose: () => void;
  activity?: PublicActivity;
  onActivity: () => void;
  onSound?: () => void;
  onChallenge: () => void;
  onDress: () => void;
  challengeDone: boolean;
  look?: { status: string; image?: string; description?: string };
  motion?: { action: string; nonce: number };
}) {
  const { language, t } = useLanguage();
  const name = language === 'bn' ? character.nameBn : character.name;
  const facts = language === 'bn' ? character.factsBn : character.facts;
  const catchphrase = language === 'bn' ? character.catchphraseBn : character.catchphrase;
  const portrait = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(0);
  const [playing, setPlaying] = useState(false);

  // The child may have scrolled to the cast before opening a portrait. Start the conversation in view.
  useLayoutEffect(() => {
    const scene = portrait.current?.closest<HTMLElement>('.stage-scene');
    if (scene) scene.scrollTop = 0;
  }, [character.id]);

  // FLIP: measure the portrait's resting slot, start it on the hotspot, release it to the slot.
  useLayoutEffect(() => {
    const el = portrait.current;
    if (!el || typeof el.animate !== 'function') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!from) {
      const entrance = el.animate(
        [
          { transform: 'translateY(12px)', opacity: 0.85 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: 240, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      );
      return () => entrance.cancel();
    }
    const to = el.getBoundingClientRect();
    const box = (r: DOMRect): Box => ({
      left: r.left,
      top: r.top,
      width: r.width,
      height: r.height,
    });
    const { x, y, scale } = flipFrom(box(from), box(to));
    const entrance = el.animate(
      [
        { transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity: 0.9 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: ENTER_MS, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' },
    );
    return () => entrance.cancel();
  }, [from, character.id]);

  // Facts arrive one at a time after the entrance (and after an animal's own call).
  useEffect(() => {
    const first = setTimeout(() => setShown(1), ENTER_MS + holdFactsMs);
    return () => clearTimeout(first);
  }, [character.id, holdFactsMs]);

  // The portrait's mouth follows the character's voice while it holds the call.
  useEffect(() => {
    const el = portrait.current;
    if (!live || !el) return;
    const voice = getVoice();
    const mouth = (value: number) =>
      el.style.setProperty('--mouth-open', String(voice.speakerId === character.id ? value : 0));
    const unsubscribeMouth = voice.audio.subscribeMouth(mouth);
    return () => {
      unsubscribeMouth();
      el.style.setProperty('--mouth-open', '0');
    };
  }, [live, character.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const visible = facts.slice(0, shown);
  return (
    <section
      className={`comes-closer is-${call}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby="closer-name"
    >
      <div className="closer-figure">
        <div
          ref={portrait}
          className="closer-portrait"
          data-voice-character={character.id}
          data-emotion={live ? 'happy' : 'idle'}
        >
          <span className="closer-phone" aria-hidden="true" />
          <div
            className="learning-actor"
            key={motion?.nonce ?? 'still'}
            data-action={motion?.action ?? 'idle'}
          >
            {look?.image ? (
              // Server-generated, moderated WebP; data URLs do not use an image optimizer.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={look.image} alt={look.description || name} className="learning-look" />
            ) : (
              <LearnArt id={character.id} />
            )}
          </div>
        </div>
        <h2 id="closer-name">{uiText(name)}</h2>
        <p className="closer-status" role="status">
          {call === 'ringing'
            ? t('learnWorlds.ringing', { name })
            : call === 'connected'
              ? t('learnWorlds.onCall', { name })
              : live
                ? t('learnWorlds.talkingWith', { name })
                : catchphrase}
        </p>
      </div>
      <div className="closer-talk">
        <div className="learning-actions">
          {activity && (
            <button type="button" aria-pressed={playing} onClick={() => setPlaying((v) => !v)}>
              {t(playing ? 'learnWorlds.showFacts' : 'learnWorlds.playTogether')}
            </button>
          )}
          <button type="button" onClick={onChallenge} disabled={challengeDone}>
            {t(challengeDone ? 'learnWorlds.challengeDone' : 'learnWorlds.challenge')}
          </button>
          {live && (
            <button type="button" onClick={onDress} disabled={look?.status === 'drawing'}>
              {t('learnWorlds.dressMe')}
            </button>
          )}
        </div>
        {live && <p className="call-play-hint">{t('learnWorlds.callPlayHint')}</p>}
        {look?.status === 'drawing' && (
          <p className="look-status" role="status">
            {t('learnWorlds.drawingLook')}
          </p>
        )}
        {look?.status === 'failed' && (
          <p className="look-status" role="status">
            {t('learnWorlds.lookFailed')}
          </p>
        )}
        {playing && activity && (
          <LearningActivity
            activity={activity}
            characterId={character.id}
            onComplete={onActivity}
            onSound={onSound}
          />
        )}
        <div className="character-speech" aria-live="polite">
          {caption ? (
            <p className="bubble is-live">{uiText(caption)}</p>
          ) : (
            !playing &&
            visible.map((fact, i) => (
              <p key={i} className="bubble">
                {uiText(fact)}
              </p>
            ))
          )}
          {!playing && !caption && shown > 0 && shown < facts.length && (
            <button type="button" className="bubble-more" onClick={() => setShown((n) => n + 1)}>
              {t('learnWorlds.nextFact')}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
