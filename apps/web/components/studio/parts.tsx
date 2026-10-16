'use client';
import type { Companion } from '@just-imagine/protocol';
import { CompanionArt } from '../companion/Companion';
import { tappableEntities } from '../../lib/playable-preview';
import Link from 'next/link';
import { CHARACTERS, type CharacterId, type ServerMessage } from '@just-imagine/protocol';
import {
  GRAVITY_PRESETS,
  WIND_PRESETS,
  type Dial,
  type SceneDoc,
} from '@just-imagine/scene-schema';
import { s } from '../../lib/strings/en';
import { CharacterArt } from './CharacterArt';
import { DotOrb } from './DotOrb';
import { UiIcon } from '../UiIcon';

export type VoiceStatus = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed' | string;
export type JobStatus = Extract<ServerMessage, { type: 'worldJob' }>['status'];

const HomeIcon = () => <UiIcon name="home" />;
const GalleryIcon = () => <UiIcon name="gallery" />;
const ResetIcon = () => <UiIcon name="restart" />;
const CaptionIcon = () => <UiIcon name="captions" />;
const CloseIcon = () => <UiIcon name="close" />;
const ChevronIcon = () => <UiIcon name="chevron" />;
const MicIcon = () => <UiIcon name="mic" />;
const GameIcon = () => <UiIcon name="game" />;
const StopIcon = () => <UiIcon name="stop" />;
const ExitIcon = () => <UiIcon name="finish" />;
export { CloseIcon, ChevronIcon };

export function StudioControls({
  live,
  name,
  onAsk,
  onStop,
  onBuild,
  onFinish,
  menu,
}: {
  live: boolean;
  name: string;
  onAsk: () => void;
  onStop: () => void;
  onBuild: () => void;
  onFinish: () => void;
  menu?: React.ReactNode;
}) {
  return (
    <div className="controls" role="group" aria-label={s.guides}>
      {live ? (
        <button type="button" className="pill stop" onClick={onStop}>
          <StopIcon />
          <span>{s.stop}</span>
        </button>
      ) : (
        <button type="button" className="pill primary" onClick={onAsk}>
          <MicIcon />
          <span>{s.ask.replace('{name}', name)}</span>
        </button>
      )}
      <button type="button" className="pill build" onClick={onBuild}>
        <GameIcon />
        <span>{s.buildGame}</span>
      </button>
      {menu}
      <button type="button" className="pill quiet" onClick={onFinish} aria-label={s.end}>
        <ExitIcon />
      </button>
    </div>
  );
}
const StarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
    <path d="m12 2.5 2.6 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7l-5.7 3.4 1.5-6.5-5-4.4 6.6-.6Z" />
  </svg>
);

export function TopBar({
  status,
  job,
  captions,
  onCaptions,
  onReset,
  onRetry,
  storybook,
  note,
}: {
  status: VoiceStatus;
  job?: JobStatus;
  captions: boolean;
  onCaptions: () => void;
  onReset: () => void;
  onRetry: () => void;
  storybook?: React.ReactNode;
  note?: string;
}) {
  const state =
    status === 'connected' && job && job !== 'ready' && job !== 'failed' ? 'building' : status;
  const label =
    state === 'building'
      ? s.jobLabels[job as Exclude<JobStatus, 'ready' | 'failed'>]
      : (s.statusLabels[status as keyof typeof s.statusLabels] ?? status);
  return (
    <div className="stage-top">
      <Link className="pill quiet" href="/play" aria-label={s.home}>
        <HomeIcon />
      </Link>
      <Link className="pill quiet" href="/gallery" aria-label={s.gallery}>
        <GalleryIcon />
        <span>{s.gallery}</span>
      </Link>
      {storybook}
      <span className="spacer" />
      <button className="pill quiet" type="button" onClick={onReset} aria-label={s.reset}>
        <ResetIcon />
      </button>
      <button
        className="pill"
        type="button"
        aria-pressed={captions}
        aria-label={s.captions}
        onClick={onCaptions}
      >
        <CaptionIcon />
        <span>{s.captions}</span>
      </button>
      <div className="status-chip" data-state={state} role="status">
        <strong>{label}</strong>
        <small>
          {s.speak}: {status}
        </small>
        {note && <small className="note">{note}</small>}
        {status === 'error' && (
          <button type="button" onClick={onRetry}>
            {s.retry}
          </button>
        )}
      </div>
    </div>
  );
}

export function Storybook<K extends string>({
  worlds,
  selected,
  onSelect,
}: {
  worlds: Record<K, { title: string }>;
  selected: K;
  onSelect: (key: K) => void;
}) {
  return (
    <div className="storybook" role="group" aria-label={s.storybook}>
      <span className="storybook-tag" title={s.preview}>
        {s.preview}
      </span>
      {(Object.entries(worlds) as [K, { title: string }][]).map(([key, doc]) => (
        <button
          type="button"
          className={selected === key ? 'selected' : ''}
          key={key}
          onClick={() => onSelect(key)}
          aria-pressed={selected === key}
        >
          {doc.title}
        </button>
      ))}
    </div>
  );
}

export function Listening({
  name: personalName,
  character,
  face,
  building,
  status,
  live,
  speaking = false,
}: {
  name?: string;
  character: CharacterId;
  face: React.ReactNode;
  building: boolean;
  status: VoiceStatus;
  live: boolean;
  speaking?: boolean;
}) {
  const name = personalName ?? CHARACTERS[character].displayName;
  return (
    <div
      className={['listening', building ? 'is-building' : '', live ? '' : 'is-off']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="listening-inner">
        <div className="listening-friend">
          {live && <DotOrb mode={speaking ? 'speaking' : 'listening'} />}
          <span className="listening-portrait">{face}</span>
          {live && (
            <span className="mic-badge" aria-hidden="true">
              <MicIcon />
            </span>
          )}
        </div>
        <h1>{building ? s.building : live ? s.listening.replace('{name}', name) : s.tapFriend}</h1>
        {building ? (
          <span className="building-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        ) : live ? (
          <p>{s.listeningHint}</p>
        ) : (
          <p>{s.tapFriendHint}</p>
        )}
      </div>
    </div>
  );
}

export function DialTray({
  doc,
  values,
  onChange,
}: {
  doc: SceneDoc;
  values: Record<string, string>;
  onChange: (dial: Dial, value: string) => void;
}) {
  if (!doc.learning.dials.length) return null;
  const options = (dial: Dial): [string, string][] =>
    dial === 'gravity'
      ? Object.keys(GRAVITY_PRESETS).map((k) => [
          k,
          s.dialOptions.gravity[k as keyof typeof s.dialOptions.gravity] ?? k,
        ])
      : dial === 'wind'
        ? Object.keys(WIND_PRESETS).map((k) => [
            k,
            s.dialOptions.wind[k as keyof typeof s.dialOptions.wind] ?? k,
          ])
        : Object.keys(doc.materials).map((k) => [k, k.replace(/_/g, ' ')]);
  return (
    <div className="dial-tray">
      {doc.learning.dials.map((dial) => (
        <label className="dial" key={dial}>
          <span>{s.dialLabels[dial]}</span>
          <select
            aria-label={dial}
            value={
              values[dial] ??
              (dial === 'gravity'
                ? Object.entries(GRAVITY_PRESETS).find(
                    ([, gravity]) => gravity === doc.environment.gravity.y,
                  )?.[0]
                : dial === 'heroMaterial'
                  ? doc.entities.find((e) => e.id === doc.learning.heroEntityId)?.body.material
                  : Object.entries(WIND_PRESETS).find(
                      ([, wind]) => wind === doc.environment.wind.x,
                    )?.[0]) ??
              ''
            }
            onChange={(e) => onChange(dial, e.target.value)}
          >
            <option value="" disabled>
              {s.choose}
            </option>
            {options(dial).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}

export function EntityActions({
  doc,
  onTap,
  onFlick,
}: {
  doc: SceneDoc;
  onTap: (id: string) => void;
  onFlick: (id: string, direction: { x: number; y: number }) => void;
}) {
  const dynamic = tappableEntities(doc).filter((entity) => !entity.character);
  if (!dynamic.length) return null;
  return (
    <section aria-label="World actions" className="entity-actions">
      <p id="entity-keyboard-help" className="sr-only">
        {s.keyboardPlay}
      </p>
      <div className="actions">
        {dynamic.map((e) => (
          <button
            type="button"
            key={e.id}
            aria-describedby="entity-keyboard-help"
            onClick={() => onTap(e.id)}
            onKeyDown={(event) => {
              const direction = (
                {
                  ArrowLeft: { x: -1, y: 0 },
                  ArrowRight: { x: 1, y: 0 },
                  ArrowUp: { x: 0, y: -1 },
                  ArrowDown: { x: 0, y: 1 },
                } as Record<string, { x: number; y: number }>
              )[event.key];
              if (direction) {
                event.preventDefault();
                onFlick(e.id, direction);
              }
            }}
          >
            {e.name}
          </button>
        ))}
      </div>
    </section>
  );
}

export function PredictionSheet({
  prediction,
  onAnswer,
}: {
  prediction: Extract<ServerMessage, { type: 'prediction' }>;
  onAnswer: (index: number) => void;
}) {
  return (
    <div className="prediction-sheet" role="dialog" aria-labelledby="prediction-title">
      <div className="prediction-card">
        <h2 id="prediction-title">{prediction.question}</h2>
        <div className="actions">
          {prediction.options.map((option, index) => (
            <button type="button" key={option} onClick={() => onAnswer(index)}>
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DiscoveryToast({
  discovery,
  onClose,
}: {
  discovery: Extract<ServerMessage, { type: 'discovery' }>;
  onClose: () => void;
}) {
  return (
    <section className="discovery-toast" aria-live="polite" aria-label={s.discovery}>
      <span className="badge" aria-hidden="true">
        <StarIcon />
      </span>
      <details>
        <summary>{discovery.title}</summary>
        <p>{discovery.kidExplanation}</p>
        <p>{discovery.realLifeNote}</p>
      </details>
      <button type="button" className="close" aria-label={s.close} onClick={onClose}>
        <CloseIcon />
      </button>
    </section>
  );
}

export function CastStrip({
  cast,
  active,
  speaking,
  activeFace,
  companion,
  onPick,
  left,
  right,
}: {
  cast: (typeof CHARACTERS)[CharacterId][];
  active: CharacterId;
  speaking: boolean;
  activeFace?: React.ReactNode;
  companion?: Companion;
  onPick: (id: CharacterId) => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <nav className="cast-strip" aria-label={s.guides}>
      <div className="corner left">{left}</div>
      <div className="cast-list">
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
                c.kind === 'guide' ? 'is-guide' : '',
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
      <div className="corner right">{right}</div>
    </nav>
  );
}

export function SummonOverlay({ character }: { character: CharacterId }) {
  const c = CHARACTERS[character];
  return (
    <div className="summon" role="status" aria-live="assertive">
      <div className="summon-inner">
        <span className="art">
          <CharacterArt id={character} />
        </span>
        <h2>{s.summoned.replace('{name}', c.displayName)}</h2>
        <p>{c.catchphrase}</p>
      </div>
    </div>
  );
}

export function SpellFlourish({ spell }: { spell: keyof typeof s.spellNames }) {
  return (
    <div className="spell" role="status" aria-live="polite">
      <span className="spell-banner">{s.spellNames[spell]}</span>
    </div>
  );
}

export function quotaCopy(seconds: number) {
  if (seconds <= 30) return s.quotaSoon;
  return s.quotaFriendly.replace('{minutes}', String(Math.max(1, Math.round(seconds / 60))));
}
