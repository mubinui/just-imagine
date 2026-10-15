'use client';
import { useEffect, useRef, useState } from 'react';
import { mountCharacter } from '@just-imagine/characters';
import type { CharacterId, Emotion } from '@just-imagine/protocol';
import { getVoice } from '../lib/voice';
import { env } from '../lib/env';
import { Avatar } from './ProfilePicker';
export function CharacterFace({ character }: { character: CharacterId }) {
  const [failed, setFailed] = useState(false);
  const host = useRef<HTMLDivElement>(null),
    canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let active = true,
      rig: Awaited<ReturnType<typeof mountCharacter>> | undefined,
      emotion: Emotion = 'idle';
    const voice = getVoice(),
      audio = voice.audio,
      previous = audio.onMouth;
    const mouth = (value: number) => {
      host.current?.style.setProperty('--mouth-open', String(value));
      rig?.setMouth(value);
    };
    audio.onMouth = mouth;
    const unsubscribe = voice.subscribe((message) => {
      if (message.type === 'characterState' && message.characterId === character) {
        emotion = message.emotion;
        host.current?.setAttribute('data-emotion', emotion);
        rig?.setState(emotion, message.speaking);
      }
      if (message.type === 'interrupted' || message.type === 'bye') mouth(0);
    });
    if (env.characterAssetBaseUrl && canvas.current)
      void mountCharacter(
        canvas.current,
        `${env.characterAssetBaseUrl.replace(/\/$/, '')}/${character}.riv`,
        () => {
          if (active) setFailed(true);
        },
      )
        .then((value) => {
          if (!active) value.dispose();
          else {
            rig = value;
            rig.setState(emotion, false);
          }
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
      unsubscribe();
      if (audio.onMouth === mouth) audio.onMouth = previous;
      rig?.dispose();
    };
  }, [character]);
  return (
    <div ref={host} className="character-face" aria-hidden="true">
      {env.characterAssetBaseUrl && !failed ? (
        <canvas ref={canvas} width={220} height={220} />
      ) : (
        <Avatar
          kind={
            character === 'mishti' || character === 'chandni'
              ? 'fox'
              : character === 'pori'
                ? 'bunny'
                : 'panda'
          }
        />
      )}
    </div>
  );
}
