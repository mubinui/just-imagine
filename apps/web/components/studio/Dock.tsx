'use client';
import { copy as uiText } from '../../lib/i18n/ui';
import { useEffect, useId, useRef, useState } from 'react';
import { UiIcon } from '../UiIcon';
import { useLanguage } from '../../lib/i18n';
import { SPECIALISTS, CHARACTERS, type CharacterId, type Companion } from '@just-imagine/protocol';
import { s } from '../../lib/strings/en';
import { CharacterArt } from './CharacterArt';
import { CompanionArt } from '../companion/Companion';
import { ThemePicker } from '../ThemePicker';
import type { JobStatus, VoiceStatus } from './parts';

/** Header: world title on the left (or after `leading`), a single status indicator on the right. */
export function StageHeader({
  title,
  status,
  job,
  note,
  center,
  leading,
  menu,
}: {
  title: string;
  status: VoiceStatus;
  job?: JobStatus;
  note?: string;
  center?: React.ReactNode;
  leading?: React.ReactNode;
  menu?: React.ReactNode;
}) {
  useLanguage();
  const building = Boolean(job && job !== 'ready' && job !== 'failed');
  const state = building ? 'building' : status;
  const label = building
    ? s.jobLabels[job as Exclude<JobStatus, 'ready' | 'failed'>]
    : (s.statusLabels[status as keyof typeof s.statusLabels] ?? status);
  return (
    <header className="stage-header">
      {leading}
      <h1 className="stage-title">{uiText(title)}</h1>
      {center}
      <div className="stage-tools">
        <p className="stage-status" data-state={state} role="status">
          <span className="dot" aria-hidden="true" />
          <span>{uiText(label)}</span>
          {note && <span className="note">{uiText(note)}</span>}
          <span className="sr-only">
            {s.speak}: {uiText(label)}
          </span>
        </p>
        <ThemePicker compact />
        {menu}
      </div>
    </header>
  );
}

/** Bottom dock: the friend's portrait is the talk button, then their speech bubble and Build a game.
    The other friends open from the stacked faces beside the portrait. */
export function Dock({
  cast,
  active,
  speaking,
  activeFace,
  companion,
  status,
  captions,
  talkName,
  caption,
  onPick,
  onTalk,
  onStop,
  onRetry,
  onNewGame,
  pet,
}: {
  cast: (typeof CHARACTERS)[CharacterId][];
  active: CharacterId;
  speaking: boolean;
  activeFace?: React.ReactNode;
  companion?: Companion;
  status: VoiceStatus;
  captions: boolean;
  talkName: string;
  /** The friend's latest spoken line, shown as their speech bubble when captions are on. */
  caption?: string;
  onPick: (id: CharacterId) => void;
  onTalk: () => void;
  onStop: () => void;
  onRetry: () => void;
  onNewGame: () => void;
  /** The child's buddy pet (components/pets/PetSlot), after the friends. */
  pet?: React.ReactNode;
}) {
  const { language } = useLanguage();
  const lang = language === 'bn' ? 1 : 0;
  const [demonstrating, setDemonstrating] = useState<CharacterId>();
  const [castOpen, setCastOpen] = useState(false);
  const castRoot = useRef<HTMLDivElement>(null);
  const castToggle = useRef<HTMLButtonElement>(null);
  const castId = useId();
  useEffect(() => {
    if (!demonstrating) return;
    const timer = setTimeout(() => setDemonstrating(undefined), 6500);
    return () => clearTimeout(timer);
  }, [demonstrating]);
  useEffect(() => {
    if (!castOpen) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !castRoot.current?.contains(event.target))
        setCastOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setCastOpen(false);
      castToggle.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [castOpen]);
  const live = status === 'connected' || status === 'connecting' || status === 'reconnecting';
  const art = (id: CharacterId) =>
    companion?.characterId === id ? (
      <CompanionArt companion={companion} />
    ) : (
      <CharacterArt id={id} />
    );
  const others = cast.filter((c) => c.id !== active).slice(0, 3);
  const chooseFriend = uiText('Choose a friend');
  const talkState = status === 'error' ? 'retry' : live ? 'live' : 'idle';
  // A chosen friend introduces themselves; inside the open picker so it never covers a friend.
  const intro = demonstrating && (
    <aside className="specialist-intro" role="status" key={demonstrating}>
      <CharacterArt id={demonstrating} action="build" />
      <div>
        <strong>
          {uiText(cast.find((c) => c.id === demonstrating)?.displayName)} ·{uiText(' ')}
          {uiText(SPECIALISTS[demonstrating].role[lang])}
        </strong>
        <p>{uiText(SPECIALISTS[demonstrating].ability[lang])}</p>
      </div>
      <button
        type="button"
        aria-label={lang ? 'বন্ধ করো' : uiText('Close introduction')}
        onClick={() => setDemonstrating(undefined)}
      >
        ×
      </button>
    </aside>
  );
  return (
    <footer className="dock studio-dock" aria-label={s.guides}>
      {demonstrating && !castOpen && intro}
      <div className="dock-voice" ref={castRoot}>
        <div className="dock-talk">
          <button
            type="button"
            className={[
              'talk',
              talkState === 'live' ? 'is-live' : '',
              talkState === 'retry' ? 'is-retry' : '',
              speaking ? 'is-speaking' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={talkState === 'retry' ? onRetry : talkState === 'live' ? onStop : onTalk}
          >
            {talkState === 'live' && <span className="talk-pulse" aria-hidden="true" />}
            <span className="talk-face" aria-hidden="true">
              {activeFace ?? art(active)}
            </span>
            <span className="talk-badge" aria-hidden="true">
              <UiIcon
                name={talkState === 'retry' ? 'restart' : talkState === 'live' ? 'stop' : 'mic'}
              />
            </span>
            <span className="talk-label">
              {talkState === 'retry'
                ? s.retry
                : talkState === 'live'
                  ? s.stop
                  : uiText(s.talkTo, { name: talkName })}
            </span>
          </button>
        </div>
        {cast.length > 1 && (
          <button
            ref={castToggle}
            type="button"
            className="cast-toggle"
            aria-label={chooseFriend}
            aria-expanded={castOpen}
            aria-controls={castId}
            onClick={() => setCastOpen(!castOpen)}
          >
            {others.map((c) => (
              <span className="cast-head" key={c.id} aria-hidden="true">
                {art(c.id)}
              </span>
            ))}
          </button>
        )}
        {castOpen && (
          <div id={castId} className="cast-panel" role="group" aria-label={chooseFriend}>
            {intro}
            <div className="dock-friends">
              {cast.map((c) => {
                const isActive = c.id === active;
                return (
                  <button
                    type="button"
                    key={c.id}
                    className={[
                      'friend',
                      isActive ? 'is-active' : '',
                      isActive && speaking ? 'is-speaking' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    aria-pressed={isActive}
                    aria-label={uiText(c.displayName)}
                    onClick={() => {
                      setDemonstrating(c.id);
                      onPick(c.id);
                    }}
                  >
                    <span className="art">
                      <span className="ring" aria-hidden="true" />
                      {isActive && activeFace ? activeFace : art(c.id)}
                    </span>
                    <span className="name">{uiText(c.displayName)}</span>
                  </button>
                );
              })}
              {pet}
            </div>
          </div>
        )}
      </div>
      <div className="dock-speech">
        {captions && caption && (
          <p className="dock-bubble caption" aria-live="polite">
            <strong>{uiText(talkName)}</strong>
            <span>{uiText(caption)}</span>
          </p>
        )}
      </div>
      <div className="dock-tiles">
        <button type="button" className="dock-tile" onClick={onNewGame}>
          <UiIcon name="game" />
          <span>{s.buildGame}</span>
        </button>
      </div>
    </footer>
  );
}
