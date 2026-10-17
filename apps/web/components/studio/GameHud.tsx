'use client';
import { useLanguage, formatNumber, currentLanguage } from '../../lib/i18n';
import { uiNumber } from '../../lib/i18n/ui';
import { copy as uiText } from '../../lib/i18n/ui';
import { useEffect, useState } from 'react';
import { s } from '../../lib/strings/en';
import type { GameAsk, GameHud as GameHudState } from '../../lib/game-bridge';
import { UiIcon } from '../UiIcon';

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

const StarIcon = () => <UiIcon name="star" />;
const HeartIcon = ({ empty = false }: { empty?: boolean }) => (
  <UiIcon name={empty ? 'heartEmpty' : 'heart'} />
);
const ClockIcon = () => <UiIcon name="timer" />;
const KnotIcon = () => <UiIcon name="knot" />;
const TrophyIcon = () => <UiIcon name="trophy" />;

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
