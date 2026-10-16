'use client';
import { CHARACTERS, type CharacterId, type Companion } from '@just-imagine/protocol';
import { s } from '../../lib/strings/en';
import { CharacterArt } from './CharacterArt';
import { CompanionArt } from '../companion/Companion';
import type { JobStatus, VoiceStatus } from './parts';

const Icon = ({ d, filled = false }: { d: string; filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    fill={filled ? 'currentColor' : 'none'}
    stroke={filled ? 'none' : 'currentColor'}
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);
const ICONS = {
  mic: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7',
  stop: 'M7 7h10v10H7z',
  game: 'M12 2.8 14.4 9.6 21.2 12l-6.8 2.4L12 21.2l-2.4-6.8L2.8 12l6.8-2.4Z',
  restart: 'M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5',
  captions:
    'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 7h6m-6 3.5h10',
  finish: 'M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14M4 12h11m-4-4 4 4-4 4',
};

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
  const building = Boolean(job && job !== 'ready' && job !== 'failed');
  const state = building ? 'building' : status;
  const label = building
    ? s.jobLabels[job as Exclude<JobStatus, 'ready' | 'failed'>]
    : (s.statusLabels[status as keyof typeof s.statusLabels] ?? status);
  return (
    <header className="stage-header">
      <h1 className="stage-title">{title}</h1>
      {center}
      <p className="stage-status" data-state={state} role="status">
        <span className="dot" aria-hidden="true" />
        <span>{label}</span>
        {note && <span className="note">{note}</span>}
        <span className="sr-only">
          {s.speak}: {status}
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
  explore,
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
  explore?: React.ReactNode;
}) {
  const live = status === 'connected' || status === 'connecting' || status === 'reconnecting';
  return (
    <nav className="dock" aria-label={s.guides}>
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
              aria-label={c.displayName}
              onClick={() => onPick(c.id)}
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
              <span className="name">{c.displayName}</span>
            </button>
          );
        })}
      </div>
      <div className="dock-talk">
        {status === 'error' ? (
          <button type="button" className="talk is-retry" onClick={onRetry}>
            <Icon d={ICONS.restart} />
            <span>{s.retry}</span>
          </button>
        ) : live ? (
          <button type="button" className="talk is-live" onClick={onStop}>
            <span className="talk-pulse" aria-hidden="true" />
            <Icon d={ICONS.stop} filled />
            <span>{s.stop}</span>
          </button>
        ) : (
          <button type="button" className="talk" onClick={onTalk}>
            <Icon d={ICONS.mic} />
            <span>{s.talkTo.replace('{name}', talkName)}</span>
          </button>
        )}
      </div>
      <div className="dock-tiles">
        <button type="button" className="dock-tile" onClick={onNewGame}>
          <Icon d={ICONS.game} filled />
          <span>{s.buildGame}</span>
        </button>
        <button type="button" className="dock-tile" onClick={onRestart}>
          <Icon d={ICONS.restart} />
          <span>{s.reset}</span>
        </button>
        <button type="button" className="dock-tile" aria-pressed={captions} onClick={onCaptions}>
          <Icon d={ICONS.captions} />
          <span>{s.captions}</span>
        </button>
        {explore}
        <button type="button" className="dock-tile is-quiet" onClick={onFinish}>
          <Icon d={ICONS.finish} />
          <span>{s.end}</span>
        </button>
      </div>
    </nav>
  );
}
