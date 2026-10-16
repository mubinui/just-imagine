'use client';
import { useEffect, useRef, useState } from 'react';
import type { ChildResponse, ServerMessage } from '@just-imagine/protocol';
import { ensureChildVoice, getVoice } from '../../lib/voice';

type Persona = Omit<Extract<ServerMessage, { type: 'persona' }>, 'type'>;
type Quiz = Omit<Extract<ServerMessage, { type: 'quiz' }>, 'type'>;
type LearningLook = Extract<ServerMessage, { type: 'learningLook' }>;
type LearningAction = Extract<ServerMessage, { type: 'learningAction' }>;
type Points = Omit<Extract<ServerMessage, { type: 'points' }>, 'type'>;

export interface LearnVoiceEvents {
  onQuiz?: (quiz: Quiz) => void;
  onPoints?: (points: Points, persona: Persona | undefined) => void;
  onPet?: (petId: string) => void;
}

/**
 * The shared voice session, pointed at Learning World characters. Starting a call opens the
 * child's session if needed (on the tap that asked for it, which also unlocks audio), then asks
 * the gateway to hand the session to the pack character; hanging up hands it back to the friend.
 */
export function useLearnVoice(child: ChildResponse | undefined, events: LearnVoiceEvents) {
  const [status, setStatus] = useState(() => getVoice().status);
  const [persona, setPersona] = useState<Persona>();
  const [caption, setCaption] = useState('');
  const [looks, setLooks] = useState<Record<string, LearningLook>>({});
  const [motion, setMotion] = useState<LearningAction & { nonce: number }>();
  const requested = useRef<
    | {
        kind: 'activity' | 'challenge';
        challengeId?: string;
        missionId?: string;
        storyPhase?: 'begin' | 'progress' | 'complete';
      }
    | undefined
  >(undefined);
  const [error, setError] = useState('');
  const pending = useRef<{ packId: string; characterId: string } | undefined>(undefined);
  const summoning = useRef<{ packId: string; characterId: string } | undefined>(undefined);
  const personaRef = useRef<Persona | undefined>(undefined);
  const handlers = useRef(events);
  useEffect(() => {
    handlers.current = events;
  });

  useEffect(() => {
    const voice = getVoice();
    const offStatus = voice.subscribeStatus(setStatus);
    const off = voice.subscribe((message) => {
      switch (message.type) {
        case 'ready':
          if (pending.current) {
            const { packId, characterId } = pending.current;
            pending.current = undefined;
            getVoice().send({ type: 'summonPersona', packId, characterId });
          }
          break;
        case 'persona': {
          const next = {
            packId: message.packId,
            characterId: message.characterId,
            name: message.name,
          };
          personaRef.current = next;
          summoning.current = undefined;
          if (
            pending.current?.packId === next.packId &&
            pending.current.characterId === next.characterId
          )
            pending.current = undefined;
          setPersona(next);
          setCaption('');
          if (requested.current) {
            voice.send({
              type: 'learningPlay',
              packId: next.packId,
              characterId: next.characterId,
              ...requested.current,
            });
            requested.current = undefined;
          }
          break;
        }
        case 'transcript':
          if (message.role === 'character' && personaRef.current) setCaption(message.text);
          break;
        case 'learningAction':
          setError('');
          setMotion({ ...message, nonce: Date.now() });
          break;
        case 'learningLook':
          setLooks((previous) => {
            const key = `${message.packId}:${message.characterId}`;
            const old = previous[key];
            return {
              ...previous,
              [key]: {
                ...message,
                ...(message.status !== 'reset' && !message.image && old?.image
                  ? { image: old.image }
                  : {}),
              },
            };
          });
          break;
        case 'quiz':
          handlers.current.onQuiz?.(message);
          break;
        case 'points':
          handlers.current.onPoints?.(message, personaRef.current);
          break;
        case 'petUnlocked':
          handlers.current.onPet?.(message.petId);
          break;
        case 'error':
          summoning.current = undefined;
          setError(message.message);
          break;
        case 'bye':
          personaRef.current = undefined;
          setPersona(undefined);
          break;
      }
    });
    return () => {
      off();
      offStatus();
    };
  }, []);

  /** Call from a tap: unlocks audio in the gesture, then connects and summons. */
  function summon(packId: string, characterId: string) {
    if (!child) return;
    if (summoning.current?.packId === packId && summoning.current.characterId === characterId)
      return;
    summoning.current = { packId, characterId };
    const voice = getVoice();
    setError('');
    const unlocked = voice.audio.unlocked ? Promise.resolve() : voice.unlockAudio();
    void Promise.resolve(unlocked)
      .then(async () => {
        if (voice.session?.childId === child.id && voice.status === 'connected') {
          voice.send({ type: 'summonPersona', packId, characterId });
          return;
        }
        pending.current = { packId, characterId };
        await ensureChildVoice(child);
      })
      .catch((e: unknown) => {
        pending.current = undefined;
        summoning.current = undefined;
        setError(e instanceof Error ? e.message : String(e));
      });
  }
  function hangUp() {
    summoning.current = undefined;
    pending.current = undefined;
    requested.current = undefined;
    if (personaRef.current) getVoice().send({ type: 'hangUp' });
    personaRef.current = undefined;
    setPersona(undefined);
    setCaption('');
  }
  /** Preview only: the fake gateway offers tappable options because it has no microphone. */
  function answer(text: string) {
    getVoice().send({ type: 'text', text });
  }
  function play(
    packId: string,
    characterId: string,
    kind: 'activity' | 'challenge',
    challengeId?: string,
  ) {
    if (personaRef.current?.packId === packId && personaRef.current.characterId === characterId) {
      getVoice().send({
        type: 'learningPlay',
        packId,
        characterId,
        kind,
        ...(challengeId ? { challengeId } : {}),
      });
    } else {
      requested.current = { kind, ...(challengeId ? { challengeId } : {}) };
      summon(packId, characterId);
    }
  }
  function observe(packId: string, characterId: string, observation: string) {
    if (getVoice().status === 'connected')
      getVoice().send({ type: 'learningPlay', packId, characterId, kind: 'activity', observation });
  }
  function imagineOutfit() {
    if (personaRef.current)
      answer(
        'Please ask me what new outfit or appearance I would like to imagine for you. Listen to my wish, then use dress_learning_character.',
      );
  }
  function story(
    packId: string,
    characterId: string,
    missionId: string,
    storyPhase: 'begin' | 'progress' | 'complete',
    connect = false,
  ) {
    const context = { kind: 'activity' as const, missionId, storyPhase };
    if (
      personaRef.current?.packId === packId &&
      personaRef.current.characterId === characterId &&
      getVoice().status === 'connected'
    ) {
      getVoice().send({ type: 'learningPlay', packId, characterId, ...context });
    } else if (connect) {
      requested.current = context;
      summon(packId, characterId);
    }
  }
  const live = status === 'connected' || status === 'connecting' || status === 'reconnecting';
  return {
    status,
    live,
    persona,
    caption,
    error,
    summon,
    story,
    hangUp,
    answer,
    play,
    imagineOutfit,
    observe,
    looks,
    motion,
  };
}
