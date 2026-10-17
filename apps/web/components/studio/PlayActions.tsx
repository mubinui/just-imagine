'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText } from '../../lib/i18n/ui';
import { useEffect, useState, type RefObject } from 'react';
import type { Engine, SimulationFrame } from '@just-imagine/engine';
import type { PreviewKey } from '../../lib/preview-worlds';
import { UiIcon } from '../UiIcon';

const ACTIVITIES: Record<PreviewKey, { title: string; hint: string; action: string }> = {
  jellyDragon: {
    title: 'How high can jelly bounce?',
    hint: 'Drag the dragon off its cloud, or give it a little jump.',
    action: 'Bounce dragon',
  },
  moonBounce: {
    title: 'A race on the Moon',
    hint: 'Drop both together. Then try Earth gravity.',
    action: 'Drop them together',
  },
  pondFloat: {
    title: 'Float or sink?',
    hint: 'Drop them in. Drag them out. Try a different material.',
    action: 'Drop into the pond',
  },
  projectileLab: {
    title: 'Ready, aim… bounce!',
    hint: 'Change the angle or speed, then try to hit the cup.',
    action: 'Launch ball',
  },
  galtonBoard: {
    title: 'Where will it land?',
    hint: 'Drop balls through the pegs and compare the baskets.',
    action: 'Drop a ball',
  },
  fractionsLab: {
    title: 'One whole. Two equal halves.',
    hint: 'Split the block, then drag the two halves together.',
    action: 'Split into halves',
  },
  // Generated-game worlds draw their own HUD; the Studio hides these actions for them.
  catchTheFlies: {
    title: 'Catch the flies',
    hint: 'Tap the flies before the owl wakes up.',
    action: 'Catch a fly',
  },
};
export function PlayActions({
  world,
  engine,
  onPlay,
}: {
  world: PreviewKey;
  engine: RefObject<Engine | undefined>;
  onPlay: (action: 'primary' | 'again' | 'join') => void;
}) {
  useLanguage();
  const [frame, setFrame] = useState<SimulationFrame>();
  useEffect(() => {
    const timer = setInterval(() => setFrame(engine.current?.frame()), 250);
    return () => clearInterval(timer);
  }, [engine, world]);
  const activity = ACTIVITIES[world];
  const full = world === 'galtonBoard' && (frame?.entities.length ?? 0) >= 24;
  const whole = frame?.entities.some((e) => e.id === 'whole' || e.templateId === 'whole');
  const halves =
    frame?.entities.filter((e) => e.id === 'half' || e.templateId === 'half').length ?? 0;
  const landings = Object.values(frame?.histograms ?? {})
    .flat()
    .reduce((a, b) => a + b, 0);
  const reading =
    world === 'moonBounce'
      ? uiText('Gravity {v0} m/s²', { v0: frame?.gravity.y.toFixed(2) ?? '1.62' })
      : world === 'galtonBoard'
        ? uiText('{v0} balls settled', { v0: landings })
        : world === 'fractionsLab'
          ? whole
            ? uiText('1 whole')
            : uiText('{v0} equal halves', { v0: halves })
          : world === 'projectileLab'
            ? uiText('{v0} s flight time', {
                v0: Object.values(frame?.stopwatches ?? {})[0]?.toFixed(2) ?? '0.00',
              })
            : '';
  return (
    <section className="play-actions" aria-label={uiText('World actions')}>
      <div className="play-invitation">
        <h2>{uiText(activity.title)}</h2>
        <p>{uiText(activity.hint)}</p>
      </div>
      <div className="play-buttons">
        <button
          type="button"
          className="play-primary"
          disabled={!frame || full || (world === 'fractionsLab' && !whole)}
          onClick={() => onPlay('primary')}
          onKeyDown={(event) => {
            const direction = {
              ArrowLeft: { x: -1, y: 0 },
              ArrowRight: { x: 1, y: 0 },
              ArrowUp: { x: 0, y: -1 },
              ArrowDown: { x: 0, y: 1 },
            }[event.key as 'ArrowUp'];
            if (direction) {
              event.preventDefault();
              const hero = frame?.entities.find(
                (e) =>
                  e.id === 'ball' ||
                  e.id === 'dragon' ||
                  e.id === 'duck' ||
                  e.id === 'whole' ||
                  e.templateId === 'whole',
              );
              if (hero) engine.current?.flick(hero.id, direction);
            }
          }}
        >
          <UiIcon name="play" />
          {uiText(full ? 'Baskets are full' : activity.action)}
        </button>
        {world === 'fractionsLab' && (
          <button
            type="button"
            className="play-secondary"
            disabled={halves < 2}
            onClick={() => onPlay('join')}
          >
            {uiText('Join the halves')}
          </button>
        )}
        <button type="button" className="play-secondary" onClick={() => onPlay('again')}>
          {uiText('Try again')}
        </button>
      </div>
      {reading && <output className="play-reading">{uiText(reading)}</output>}
    </section>
  );
}
