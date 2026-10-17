'use client';
import { useLanguage, formatNumber, currentLanguage } from '../../lib/i18n';
import { uiNumber } from '../../lib/i18n/ui';
import { copy as uiText } from '../../lib/i18n/ui';
import { useEffect, useState } from 'react';
import { s } from '../../lib/strings/en';
import type { GameAsk, GameHud as GameHudState } from '../../lib/game-bridge';

/** Seconds as m:ss for the timer chip. */
export function formatTimer(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds - 1e-9));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) =>
    typeof values[key] === 'number'
      ? formatNumber(values[key] as number, currentLanguage())
      : uiText(String(values[key] ?? '')),
  );

const StarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2.6 14.6 8.4l6.3.6-4.8 4.2 1.4 6.2L12 16.2l-5.5 3.2 1.4-6.2L3.1 9l6.3-.6Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);
const HeartIcon = ({ empty = false }: { empty?: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 20.4s-7.6-4.6-7.6-10.2A4.3 4.3 0 0 1 12 7.7a4.3 4.3 0 0 1 7.6 2.5c0 5.6-7.6 10.2-7.6 10.2Z"
      fill={empty ? 'none' : 'currentColor'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2">
    <circle cx="12" cy="13" r="7.6" />
    <path d="M12 9v4.4l2.8 1.8M9.5 2.8h5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const KnotIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true" fill="none" strokeLinecap="round">
    <circle cx="32" cy="32" r="22" fill="var(--peach)" />
    <path
      d="M14 28c8-9 26-9 33 0s-4 20-15 17-12-15-2-19 20 3 19 12M18 40c5 6 16 9 26 4"
      stroke="var(--ink)"
      strokeWidth="3.4"
    />
    <path d="M47 13c4 2 6 6 5 10" stroke="var(--ink)" strokeWidth="3.4" />
  </svg>
);
const TrophyIcon = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <circle cx="32" cy="32" r="24" fill="var(--yellow)" />
    <path
      d="M32 13.5 37.4 25l12.6 1.3-9.5 8.4 2.8 12.4L32 40.7l-11.3 6.4 2.8-12.4-9.5-8.4L26.6 25Z"
      fill="var(--ground)"
      stroke="var(--ink)"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
  </svg>
);

function Sheet({
  id,
  icon,
  title,
  text,
  children,
  tone,
}: {
  id: string;
  icon?: React.ReactNode;
  title: string;
  text?: string;
  children: React.ReactNode;
  tone?: 'won' | 'lost' | 'tangled' | 'ask';
}) {
  useLanguage();
  return (
    <div className="prediction-sheet game-sheet" data-tone={tone}>
      <div className="prediction-card" role="dialog" aria-modal="true" aria-labelledby={id}>
        {icon && <span className="game-sheet-icon">{icon}</span>}
        <h2 id={id}>{uiText(title)}</h2>
        {text && <p className="game-sheet-text">{uiText(text)}</p>}
        <div className="actions">{children}</div>
      </div>
    </div>
  );
}

/**
 * The generated game's heads-up display, drawn inside the 16:9 world: score
 * top-left, lives and timer top-right, a level banner, the game's questions,
 * the win and lose sheets, and the "game got tangled" recovery state.
 */
export function GameHud({
  hud,
  ask,
  tangled,
  onAnswer,
  onReplay,
  onRetry,
}: {
  hud?: GameHudState;
  ask?: GameAsk;
  tangled: boolean;
  onAnswer: (index: number) => void;
  onReplay: () => void;
  onRetry: () => void;
}) {
  useLanguage();
  const [banner, setBanner] = useState<number>();
  const level = hud?.level;
  useEffect(() => {
    if (level === undefined) return;
    // The banner is an announcement: it appears for each new level, then leaves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBanner(level);
    const t = setTimeout(() => setBanner(undefined), 2200);
    return () => clearTimeout(t);
  }, [level]);

  if (tangled)
    return (
      <Sheet
        id="game-tangled-title"
        tone="tangled"
        icon={<KnotIcon />}
        title={s.game.tangled}
        text={s.game.tangledText}
      >
        <button type="button" onClick={onRetry}>
          {s.game.untangle}
        </button>
      </Sheet>
    );
  if (!hud) return null;
  const urgent = hud.timer !== undefined && hud.timer <= 10 && !hud.outcome;
  const hearts = hud.lives !== undefined ? Math.max(0, Math.round(hud.lives)) : undefined;
  return (
    <>
      <div className="game-hud" aria-label={s.game.hud}>
        {hud.score !== undefined && (
          <div className="game-chip game-score" role="status" aria-live="polite">
            <span className="game-chip-icon">
              <StarIcon />
            </span>
            <span className="game-chip-body">
              <span className="sr-only">{s.game.score}: </span>
              <strong key={hud.score} className="game-score-value">
                {uiNumber(hud.score)}
              </strong>
              {hud.label && <span className="game-chip-label">{uiText(hud.label)}</span>}
            </span>
          </div>
        )}
        {hud.score === undefined && hud.label && (
          <p className="game-chip game-chip-label">{uiText(hud.label)}</p>
        )}
        <div className="game-hud-right">
          {hearts !== undefined && (
            <div
              className="game-chip game-lives"
              aria-label={fill(s.game.lives, { lives: hearts })}
            >
              {hearts <= 5 ? (
                Array.from({ length: Math.max(hearts, 1) }, (_, i) => (
                  <HeartIcon key={i} empty={hearts === 0} />
                ))
              ) : (
                <>
                  <HeartIcon />
                  <strong>{uiNumber(hearts)}</strong>
                </>
              )}
            </div>
          )}
          {hud.timer !== undefined && (
            <div
              className={urgent ? 'game-chip game-timer is-urgent' : 'game-chip game-timer'}
              aria-label={`${s.game.timer}: ${uiText(formatTimer(hud.timer))}`}
            >
              <ClockIcon />
              <strong>{uiText(formatTimer(hud.timer))}</strong>
            </div>
          )}
        </div>
      </div>
      {banner !== undefined && !hud.outcome && (
        <p className="game-level-banner" role="status" key={banner}>
          {uiText(fill(s.game.level, { n: banner }))}
        </p>
      )}
      {ask && !hud.outcome && (
        <Sheet id="game-ask-title" tone="ask" title={ask.question}>
          {ask.options.map((option, index) => (
            <button type="button" key={`${index}:${option}`} onClick={() => onAnswer(index)}>
              {uiText(option)}
            </button>
          ))}
        </Sheet>
      )}
      {hud.outcome === 'won' && (
        <Sheet
          id="game-won-title"
          tone="won"
          icon={<TrophyIcon />}
          title={s.game.won}
          text={hud.score === undefined ? undefined : fill(s.game.wonText, { score: hud.score })}
        >
          <button type="button" onClick={onReplay}>
            {s.game.playAgain}
          </button>
        </Sheet>
      )}
      {hud.outcome === 'lost' && (
        <Sheet
          id="game-lost-title"
          tone="lost"
          title={s.game.lost}
          text={hud.score === undefined ? undefined : fill(s.game.lostText, { score: hud.score })}
        >
          <button type="button" onClick={onReplay}>
            {s.game.tryAgain}
          </button>
        </Sheet>
      )}
    </>
  );
}
