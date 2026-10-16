'use client';
import { useEffect, useState } from 'react';
import { SPECIALISTS, CHARACTERS, type CharacterId } from '@just-imagine/protocol';
import { CharacterArt } from './CharacterArt';
import { useLanguage } from '../../lib/i18n';
import { s } from '../../lib/strings/en';
import type { JobStatus } from './parts';

// The wait is the friend's performance (quality programme spec, section 5). Every beat is
// derived from the builder's job status and two clocks: time since the wish was heard and
// time since the last status. Nothing here is ever a static spinner.
export type Beat = 'heard' | 'backdrop' | 'props' | 'hero' | 'reveal' | 'loop' | 'late';

/** The brush comes out; after this the backdrop starts even if the builder is still queued. */
export const HEARD_MS = 400;
/** How long the Ta-da holds before the show idles waiting for the document. */
export const REVEAL_MS = 1800;
/** A beat without a new status for this long loops its ambient line. */
export const LOOP_AFTER_MS = 4000;
/** Each ambient question stays up this long before the other one takes over. */
export const LOOP_LINE_MS = 3200;
/** Past this the friend apologises and offers a library world. */
export const LATE_MS = 25000;

const TICK_MS = 100;
const CONFETTI_COUNT = 24;

export function showBeatFor(
  job: JobStatus | undefined,
  elapsedMs: number,
  sinceStatusMs: number = elapsedMs,
): Beat {
  const elapsed = Math.max(0, elapsedMs);
  const since = Math.max(0, sinceStatusMs);
  if (job === 'failed') return 'late';
  if (job === 'ready' && since < REVEAL_MS) return 'reveal';
  if (elapsed >= LATE_MS) return 'late';
  if (since >= LOOP_AFTER_MS || job === 'ready') return 'loop';
  if (job === 'placeholders') return 'props';
  if (job === 'hero') return 'hero';
  if (job === 'building') return 'backdrop';
  return since < HEARD_MS ? 'heard' : 'backdrop';
}

/** Which of the two ambient lines is up while looping: 0 or 1, alternating. */
export function loopLine(sinceStatusMs: number): 0 | 1 {
  const idle = Math.max(0, sinceStatusMs - LOOP_AFTER_MS);
  return Math.floor(idle / LOOP_LINE_MS) % 2 === 0 ? 0 : 1;
}

/** How much of the canvas has been painted: 0 blank, 1 backdrop, 2 props, 3 hero, 4 revealed. */
export function milestoneFor(job: JobStatus | undefined, sinceStatusMs: number): 0 | 1 | 2 | 3 | 4 {
  switch (job) {
    case 'ready':
      return 4;
    case 'hero':
      return 3;
    case 'placeholders':
      return 2;
    case 'building':
      return 1;
    case 'queued':
      return Math.max(0, sinceStatusMs) >= HEARD_MS ? 1 : 0;
    default:
      return 0;
  }
}

function lineFor(beat: Beat, sinceStatusMs: number, heroName: string | undefined) {
  switch (beat) {
    case 'heard':
      return s.show.heard;
    case 'backdrop':
      return s.show.backdrop;
    case 'props':
      return s.show.props;
    case 'hero':
      return s.show.hero.replace('{name}', heroName ?? s.show.heroDefault);
    case 'reveal':
      return s.show.reveal;
    case 'loop':
      return loopLine(sinceStatusMs) === 0 ? s.show.loop1 : s.show.loop2;
    case 'late':
      return s.show.late;
  }
}

const CONFETTI = Array.from({ length: CONFETTI_COUNT }, (_, i) => {
  const angle = (i / CONFETTI_COUNT) * Math.PI * 2 + (i % 2) * 0.13;
  const dist = 110 + (i % 4) * 42;
  return {
    dx: `${Math.round(Math.cos(angle) * dist)}px`,
    dy: `${Math.round(Math.sin(angle) * dist * 0.72 - 36)}px`,
    spin: `${(i % 5) * 140 - 280}deg`,
    delay: `${(i % 6) * 40}ms`,
  };
});

// origin is the show's own start when the caller passes 0 for an unknown startedAt.
type Clock = { now: number; job: JobStatus | undefined; statusAt: number; origin: number };

export function GenerationShow({
  job,
  startedAt,
  character,
  name,
  heroName,
  onOfferFallback,
}: {
  job?: JobStatus;
  /** When the wish was heard (the first worldJob), so the 25 s fallback survives remounts. */
  startedAt: number;
  character: CharacterId;
  /** The friend's personal name, when the child named their companion. */
  name?: string;
  /** What is being drawn on the hero beat, when known. */
  heroName?: string;
  face: React.ReactNode;
  onOfferFallback?: () => void;
}) {
  const [clock, setClock] = useState<Clock>({
    now: startedAt,
    job,
    statusAt: startedAt,
    origin: startedAt,
  });
  useEffect(() => {
    const tick = () =>
      setClock((c) => {
        const now = Date.now();
        const origin = startedAt > 0 ? startedAt : c.origin > 0 ? c.origin : now;
        const statusAt = c.job === job && c.statusAt > 0 ? c.statusAt : now;
        return { now, job, statusAt, origin };
      });
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [job, startedAt]);
  const { language } = useLanguage();
  const lang = language === 'bn' ? 1 : 0;
  const specialist = SPECIALISTS[character];
  const elapsed = clock.now - clock.origin;
  const sinceStatus = clock.job === job ? clock.now - clock.statusAt : 0;
  const beat = showBeatFor(job, elapsed, sinceStatus);
  const painted = milestoneFor(job, sinceStatus);
  const friend = name ?? CHARACTERS[character].displayName;
  const line = lineFor(beat, sinceStatus, heroName);
  const paintedClass = (level: number) => (painted >= level ? 'is-painted' : '');
  return (
    <div className={`show is-${beat}`} data-beat={beat} data-painted={painted}>
      <div className="show-inner">
        <div className="show-friend" role="img" aria-label={friend}>
          <span className="spotlight" aria-hidden="true" />
          <CharacterArt
            id={character}
            action={job === 'failed' ? 'listen' : job === 'ready' ? 'cheer' : 'build'}
          />
        </div>
        <div className="show-easel" aria-hidden="true">
          <div className="show-canvas">
            <span className={`show-layer show-sky ${paintedClass(1)}`} />
            <span className={`show-layer show-hills ${paintedClass(1)}`} />
            <span className={`show-layer show-ground ${paintedClass(1)}`} />
            <span className={`show-stroke ${paintedClass(1)}`} />
            <span className={`show-props ${paintedClass(2)}`}>
              <i />
              <i />
              <i />
            </span>
            <span className={`show-hero ${paintedClass(3)}`} />
            {beat === 'reveal' && (
              <span className="show-confetti">
                {CONFETTI.map((bit, i) => (
                  <i
                    key={i}
                    style={
                      {
                        '--dx': bit.dx,
                        '--dy': bit.dy,
                        '--spin': bit.spin,
                        '--delay': bit.delay,
                      } as React.CSSProperties
                    }
                  />
                ))}
              </span>
            )}
          </div>
          <span className="show-spill" />
        </div>
      </div>
      <div className="show-caption-wrap">
        <p className="specialist-role">
          {friend} · {specialist.role[lang]}
        </p>
        <p className="specialist-making">
          {job === 'ready'
            ? lang
              ? 'তোমার জগত তৈরি'
              : 'Your world is ready'
            : specialist.making[lang]}
        </p>
        <p className="show-caption" key={line} role="status" aria-live="polite">
          {line}
        </p>
        {beat === 'late' && onOfferFallback && (
          <button type="button" className="pill primary show-offer" onClick={onOfferFallback}>
            {s.show.pickWorld}
          </button>
        )}
      </div>
    </div>
  );
}
