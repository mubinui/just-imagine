'use client';
import { useEffect, useRef } from 'react';
import { watchActor } from '../acting/clock';
import { advanceSpeech, restingSpeech, toothFrame, type ToothPose } from '../acting/model';

/** Preserve the original atlas while selecting one opaque cell, never blending full bodies. */
export function ToothActor({ pose = 'idle' }: { pose?: ToothPose }) {
  const root = useRef<SVGGElement>(null);
  const image = useRef<SVGImageElement>(null);
  const initial = toothFrame({ pose, elapsed: 0 });
  useEffect(() => {
    const node = root.current,
      bitmap = image.current;
    if (!node || !bitmap) return;
    let previous = initial,
      previousAction = '',
      actionStart = 0,
      previousTick = 0,
      speech = restingSpeech();
    return watchActor(node, (now, reduced) => {
      const requested = node.closest('[data-action]')?.getAttribute('data-action');
      const action = node.closest('.is-celebrating,.pet-found') ? 'cheer' : (requested ?? 'idle');
      if (action !== previousAction) {
        previousAction = action;
        actionStart = now;
      }
      const owner = node.closest('[data-voice-character]')?.getAttribute('data-voice-character');
      const energy =
        owner === 'tooth'
          ? Number(getComputedStyle(node).getPropertyValue('--mouth-open')) || 0
          : 0;
      speech = advanceSpeech(speech, energy, previousTick ? now - previousTick : 1000 / 30);
      previousTick = now;
      const frame = toothFrame({
        pose,
        action,
        elapsed: now - actionStart,
        mouth: speech.frame ? 1 : 0,
        reduced,
      });
      node.setAttribute('data-acting-action', pose === 'idle' ? action : pose);
      if (frame === previous) return;
      previous = frame;
      node.setAttribute('data-acting-frame', String(frame));
      bitmap.setAttribute('x', String(-(frame % 4) * 100));
      bitmap.setAttribute('y', String(-Math.floor(frame / 4) * 100));
    });
  }, [pose, initial]);
  return (
    <g
      ref={root}
      className="tooth-acting"
      data-acting-id="tooth"
      data-acting-frame={initial}
      data-acting-action={pose}
    >
      <svg x="0" y="0" width="100" height="100" viewBox="0 0 100 100" overflow="hidden">
        <image
          ref={image}
          href="/learn/cinematic/twinkle-acting-v1.webp"
          x={-(initial % 4) * 100}
          y={-Math.floor(initial / 4) * 100}
          width="400"
          height="200"
        />
      </svg>
    </g>
  );
}
