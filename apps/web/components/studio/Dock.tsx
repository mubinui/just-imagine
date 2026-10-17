'use client';
import { copy as uiText } from '../../lib/i18n/ui';
import { useState, useEffect } from 'react';
import { UiIcon } from '../UiIcon';
import { useLanguage } from '../../lib/i18n';
import { SPECIALISTS, CHARACTERS, type CharacterId, type Companion } from '@just-imagine/protocol';
import { s } from '../../lib/strings/en';
import { CharacterArt } from './CharacterArt';
import { ChildNavigation, CompanionArt } from '../companion/Companion';
import { ThemePicker } from '../ThemePicker';
import type { JobStatus, VoiceStatus } from './parts';

/** Header: world title on the left, a single status indicator on the right. */
export function StageHeader({
  title,
  status,
  job,
  note,
  center,
}: {
  title: string;
  status: VoiceStatus;
  job?: JobStatus;
  note?: string;
  center?: React.ReactNode;
}) {
  useLanguage();
  const building = Boolean(job && job !== 'ready' && job !== 'failed');
  const state = building ? 'building' : status;
  const label = building
    ? s.jobLabels[job as Exclude<JobStatus, 'ready' | 'failed'>]
    : (s.statusLabels[status as keyof typeof s.statusLabels] ?? status);
  return (
    <header className="stage-header">
      <h1 className="stage-title">{uiText(title)}</h1>
      {center}
      <ThemePicker compact />
      <p className="stage-status" data-state={state} role="status">
        <span className="dot" aria-hidden="true" />
        <span>{uiText(label)}</span>
        {note && <span className="note">{uiText(note)}</span>}
        <span className="sr-only">
          {s.speak}: {uiText(label)}
        </span>
      </p>
    </header>
  );
}

/** Bottom dock: friends, the talk button, and the action tiles. Nothing else floats. */
export function Dock({
  cast,
  active,
  speaking,
  activeFace,
  companion,
  status,
  captions,
  talkName,
  onPick,
  onTalk,
  onStop,
  onRetry,
  onNewGame,
  onRestart,
  onCaptions,
  onFinish,
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
  onPick: (id: CharacterId) => void;
  onTalk: () => void;
  onStop: () => void;
  onRetry: () => void;
  onNewGame: () => void;
  onRestart: () => void;
  onCaptions: () => void;
  onFinish: () => void;
  /** The child's buddy pet (components/pets/PetSlot), after the friends. */
  pet?: React.ReactNode;
}) {
  const { language } = useLanguage();
  const lang = language === 'bn' ? 1 : 0;
  const [demonstrating, setDemonstrating] = useState<CharacterId>();
  useEffect(() => {
    if (!demonstrating) return;
    const timer = setTimeout(() => setDemonstrating(undefined), 6500);
    return () => clearTimeout(timer);
  }, [demonstrating]);
  const live = status === 'connected' || status === 'connecting' || status === 'reconnecting';
  return (
    <footer className="dock studio-dock" aria-label={s.guides}>
      {demonstrating && (
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
      )}
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
                {isActive && activeFace ? (
                  activeFace
                ) : companion?.characterId === c.id ? (
                  <CompanionArt companion={companion} />
                ) : (
                  <CharacterArt id={c.id} />
                )}
              </span>
              <span className="name">{uiText(c.displayName)}</span>
            </button>
          );
        })}
        {pet}
      </div>
      <div className="dock-talk">
        {status === 'error' ? (
          <button type="button" className="talk is-retry" onClick={onRetry}>
            <UiIcon name="restart" />
            <span>{s.retry}</span>
          </button>
        ) : live ? (
          <button type="button" className="talk is-live" onClick={onStop}>
            <span className="talk-pulse" aria-hidden="true" />
            <UiIcon name="stop" />
            <span>{s.stop}</span>
          </button>
        ) : (
          <button type="button" className="talk" onClick={onTalk}>
            <UiIcon name="mic" />
            <span>{uiText(s.talkTo, { name: talkName })}</span>
          </button>
        )}
      </div>
      <div className="studio-navigation">
        <ChildNavigation />
      </div>
      <div className="dock-tiles">
        <button type="button" className="dock-tile" onClick={onNewGame}>
          <UiIcon name="game" />
          <span>{s.buildGame}</span>
        </button>
        <button type="button" className="dock-tile" onClick={onRestart}>
          <UiIcon name="restart" />
          <span>{s.reset}</span>
        </button>
        <button type="button" className="dock-tile" aria-pressed={captions} onClick={onCaptions}>
          <UiIcon name="captions" />
          <span>{s.captions}</span>
        </button>
        <button type="button" className="dock-tile is-quiet" onClick={onFinish}>
          <UiIcon name="finish" />
          <span>{s.end}</span>
        </button>
      </div>
    </footer>
  );
}
