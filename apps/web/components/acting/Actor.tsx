'use client';
import { useEffect, useRef } from 'react';
import { SPECIALISTS, type CharacterId } from '@just-imagine/protocol';
import { ACTING } from './catalog';
import { actorOffset, actingFrame, advanceSpeech, restingSpeech } from './model';
import { watchActor } from './clock';

/** The acting atlas; `thumb` picks the half-size copy drawn at the same 800-unit width. */
const atlas = (file: string, thumb?: boolean) =>
  `/characters/acting/${thumb ? 'thumbs/' : ''}${file}-acting-v2.webp`;

/** One opaque pose at a time, registered to the same optical frame. */
export function Actor({ id, action, thumb }: { id: string; action?: string; thumb?: boolean }) {
  const root = useRef<SVGGElement>(null),
    image = useRef<SVGImageElement>(null);
  const sheet = ACTING[id];
  useEffect(() => {
    const node = root.current,
      bitmap = image.current;
    if (!node || !bitmap || action === 'still') return;
    let previousAsset = '',
      previous = -1,
      previousAction = '',
      actionStart = 0,
      previousTick = 0,
      speech = restingSpeech();
    return watchActor(node, (now, reduced) => {
      const requested = node.closest('[data-action]')?.getAttribute('data-action');
      const chosen =
        action ??
        (requested && requested !== 'idle'
          ? requested
          : node.closest('.is-celebrating,.pet-found')
            ? 'cheer'
            : node.closest('[data-emotion="thinking"]')
              ? 'listen'
              : 'idle');
      if (chosen !== previousAction) {
        previousAction = chosen;
        actionStart = now;
      }
      const voiceOwner = node.closest('[data-voice-character]');
      const energy =
        voiceOwner?.getAttribute('data-voice-character') === id
          ? Number(getComputedStyle(node).getPropertyValue('--mouth-open')) || 0
          : 0;
      speech = advanceSpeech(speech, energy, previousTick ? now - previousTick : 1000 / 30);
      previousTick = now;
      const mouth = speech.frame === 4 ? 0.8 : speech.frame === 3 ? 0.2 : 0;
      const swimmingRow = ['dolphin', 'whale', 'seal', 'penguin'].indexOf(id);
      const swimming =
        chosen === 'swim' && swimmingRow >= 0 && now - actionStart < 2400 && !reduced;
      const specialist =
        chosen === 'build' && Object.hasOwn(SPECIALISTS, id)
          ? SPECIALISTS[id as CharacterId]
          : undefined;
      const frame = specialist
        ? reduced
          ? 6
          : Math.min(7, Math.floor(((now - actionStart) % 7200) / 650))
        : swimming
          ? Math.floor((now - actionStart) / 140) % 6
          : actingFrame({
              elapsed: now - actionStart,
              action: chosen,
              mouth,
              reduced,
              offset: actorOffset(id),
            });
      const asset = specialist
        ? `/characters/specialists/${specialist.file}-v1.webp`
        : id === 'katha'
          ? '/characters/specialists/katha-v1.webp'
          : swimming
            ? '/learn/cinematic/animals-ocean-locomotion-v2.webp'
            : atlas(sheet!.file, thumb);
      if (frame === previous && asset === previousAsset) return;
      if (asset !== previousAsset) {
        previousAsset = asset;
        bitmap.setAttribute('href', asset);
        bitmap.setAttribute('width', swimming ? '600' : '800');
        bitmap.setAttribute(
          'height',
          String(specialist ? 300 : swimming ? 400 : sheet!.rows * 100),
        );
        bitmap.setAttribute(
          'y',
          String(-100 * (specialist ? specialist.row : swimming ? swimmingRow : sheet!.row)),
        );
      }
      previous = frame;
      node.setAttribute('data-acting-frame', String(frame));
      node.setAttribute('data-acting-action', chosen);
      node.setAttribute('data-acting-cycle', specialist ? 'build' : swimming ? 'swim' : 'gesture');
      bitmap.setAttribute('x', String(-frame * 100));
    });
  }, [id, action, sheet, thumb]);
  if (!sheet) return null;
  return (
    <g ref={root} data-acting-id={id} data-acting-frame="0">
      <svg width="100" height="100" viewBox="0 0 100 100" overflow="hidden">
        <image
          ref={image}
          href={id === 'katha' ? '/characters/specialists/katha-v1.webp' : atlas(sheet.file, thumb)}
          x="0"
          y={-sheet.row * 100}
          width="800"
          height={sheet.rows * 100}
          preserveAspectRatio="none"
        />
      </svg>
    </g>
  );
}
