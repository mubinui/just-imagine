'use client';
import '../../app/studio.css';
import '../../app/learn.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../lib/i18n';
import { getMixer } from '../../lib/sound';
import { env } from '../../lib/env';
import { CompanionMenu } from '../companion/Companion';
import { StageHeader } from '../studio/Dock';
import { PetCelebration } from '../pets/PetCelebration';
import { PetShelf } from '../pets/PetShelf';
import { PetSlot } from '../pets/PetSlot';
import { ComesCloser } from './ComesCloser';
import { StoryAdventure } from './StoryAdventure';
import { useChild, useLearnState } from './LearnMap';
import { LearnIcon, PointsBadge, StarIcon } from './parts';
import {
  applyPet,
  applyPoints,
  buddyFor,
  readBuddy,
  writeBuddy,
  writeDemoLearn,
  type LearnState,
} from './progress';
import { useLearnVoice } from './useLearnVoice';
import type { PublicPack } from './types';

function remainingClipMs(until: number) {
  return Math.max(0, until - Date.now());
}
const RING_MS = 1700;
const TOAST_MS = 2600;

type Quiz = { challengeId: string; question: string; options?: string[] };

export function LearnSection({ packs }: { packs: PublicPack[] }) {
  const { language, t } = useLanguage();
  const child = useChild();
  const { state, setState, failed } = useLearnState(child);
  const [packId, setPackId] = useState(packs[0]!.id);
  const pack = packs.find((p) => p.id === packId) ?? packs[0]!;
  const [close, setClose] = useState<{ characterId: string; from?: DOMRect; hold: number }>();
  const [call, setCall] = useState<'idle' | 'ringing' | 'connected'>('idle');
  const [quiz, setQuiz] = useState<Quiz>();
  const [toast, setToast] = useState<{ delta: number; key: number }>();
  const [found, setFound] = useState<string[]>([]);
  const [shelf, setShelf] = useState(false);
  const soundUntil = useRef(0);
  const pinnedStory = useRef<string | undefined>(undefined);
  const callTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const persist = useCallback(
    (update: (s: LearnState) => LearnState) =>
      setState((current) => {
        if (!current || !child) return current;
        const next = update(current);
        if (env.fake) writeDemoLearn(child.id, next);
        return next;
      }),
    [child, setState],
  );

  const voice = useLearnVoice(child, {
    onQuiz: (message) => setQuiz(message),
    onPoints: (message, persona) => {
      persist((s) => applyPoints(s, persona?.packId ?? pack.id, message));
      setToast({ delta: message.delta, key: Date.now() });
      setQuiz(undefined);
      getMixer().playCue('star', { gain: 0.9 });
    },
    onPet: (petId) => {
      persist((s) => applyPet(s, petId));
      setFound((list) => (list.includes(petId) ? list : [...list, petId]));
      getMixer().playCue('level_up');
    },
  });

  // A character the friend called by voice comes close too, switching place if needed.
  const persona = voice.persona;
  useEffect(() => {
    if (!persona) return;
    const home = packs.find((p) => p.id === persona.packId);
    if (!home) return;
    // Mirror the gateway: the character now holding the call is the one on stage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPackId(home.id);
    if (pinnedStory.current !== persona.characterId)
      setClose((c) =>
        c?.characterId === persona.characterId ? c : { characterId: persona.characterId, hold: 0 },
      );
    setCall((c) => (c === 'ringing' ? 'connected' : c));
  }, [persona, packs]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(undefined), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  // Sound: unlock on the first touch, the theme bed stays off so animal calls carry.
  useEffect(() => {
    const mixer = getMixer();
    const unlock = () => void mixer.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  // Leaving the section hands the call back to the friend.
  const hangUpRef = useRef(voice.hangUp);
  useEffect(() => {
    hangUpRef.current = voice.hangUp;
  });
  useEffect(
    () => () => {
      clearTimeout(ringTimer.current);
      clearTimeout(callTimer.current);
      hangUpRef.current();
    },
    [],
  );

  const character = close ? pack.characters.find((c) => c.id === close.characterId) : undefined;
  const closeName = character ? (language === 'bn' ? character.nameBn : character.name) : '';
  const onCallWith = persona && character && persona.characterId === character.id;

  function comeCloser(characterId: string, from?: DOMRect) {
    pinnedStory.current = undefined;
    if (close?.characterId === characterId) return;
    if (persona && persona.characterId !== characterId) voice.hangUp();
    clearTimeout(ringTimer.current);
    clearTimeout(callTimer.current);
    setCall('idle');
    setQuiz(undefined);
    const entity = pack.hotspots.find((h) => h.characterId === characterId)?.entityId;
    const clip = pack.sounds.find((s) => s.entityId === entity)?.clip;
    const mixer = getMixer();
    void mixer.unlock();
    setClose({ characterId, from, hold: clip ? 4000 : 0 });
    if (clip)
      void mixer.playClip(clip).then((duration) => {
        soundUntil.current = Date.now() + duration * 1000;
        setClose((c) => (c?.characterId === characterId ? { ...c, hold: duration * 1000 } : c));
      });
    else mixer.playCue('swoosh_up', { gain: 0.7 });
  }
  function closeUp() {
    clearTimeout(ringTimer.current);
    clearTimeout(callTimer.current);
    setQuiz(undefined);
    setClose(undefined);
  }
  function ask() {
    if (!character) return;
    clearTimeout(callTimer.current);
    const id = character.id;
    callTimer.current = setTimeout(
      () => voice.summon(pack.id, id),
      remainingClipMs(soundUntil.current),
    );
  }
  function phone() {
    if (!character || call !== 'idle') return;
    const mixer = getMixer();
    void mixer.unlock().then(() => mixer.playClip('/learn/sounds/phone_ring'));
    setCall('ringing');
    const id = character.id;
    ringTimer.current = setTimeout(
      () => voice.summon(pack.id, id),
      Math.max(RING_MS, remainingClipMs(soundUntil.current)),
    );
  }
  function hangUp() {
    clearTimeout(ringTimer.current);
    voice.hangUp();
    setCall('idle');
    setQuiz(undefined);
    getMixer().playCue('close', { gain: 0.7 });
  }

  const learn = state;
  const buddy = child && learn ? buddyFor(learn, readBuddy(child.id)) : undefined;
  const challenge = quiz ? pack.challenges.find((c) => c.id === quiz.challengeId) : undefined;
  const question = challenge
    ? language === 'bn'
      ? challenge.questionBn
      : challenge.question
    : quiz?.question;
  const title = language === 'bn' ? pack.titleBn : pack.title;
  const live = voice.live;

  return (
    <main
      className={['stage', 'learn-stage', 'learn-section', close ? 'is-close' : '']
        .filter(Boolean)
        .join(' ')}
      data-pack={pack.id}
    >
      <StageHeader title={title} status={voice.status} />
      <div className="stage-scene learn-scene">
        <div className="world-frame learning-game-frame">
          <div className="stage-world learn-world">
            {child && (
              <StoryAdventure
                key={`${child.id}:${pack.id}`}
                pack={pack}
                childId={child.id}
                looks={voice.looks}
                motion={voice.motion}
                onMeet={(id) => comeCloser(id)}
                live={Boolean(persona) && !close}
                onObservation={(event) =>
                  voice.observe(pack.id, persona?.characterId ?? pack.characters[0]!.id, event)
                }
                onChapter={(id) => {
                  if (persona && persona.characterId !== id) voice.hangUp();
                  pinnedStory.current = id;
                }}
                onStory={(chapter, phase) =>
                  voice.story(pack.id, chapter.characterId, chapter.id, phase)
                }
                onGuide={(chapter, phase) => {
                  pinnedStory.current = chapter.characterId;
                  setClose(undefined);
                  voice.story(pack.id, chapter.characterId, chapter.id, phase, true);
                }}
                onChallenge={(who) => {
                  pinnedStory.current = who;
                  voice.play(
                    pack.id,
                    who,
                    'challenge',
                    pack.challenges.find(
                      (c) => c.characterId === who && !state?.progress[pack.id]?.includes(c.id),
                    )?.id,
                  );
                }}
              />
            )}
          </div>
          {character && close && (
            <ComesCloser
              key={character.id}
              character={character}
              from={close.from}
              holdFactsMs={close.hold}
              call={call}
              live={Boolean(onCallWith)}
              caption={onCallWith ? voice.caption : ''}
              onClose={closeUp}
              activity={pack.activities.find((a) => a.characterId === character.id)}
              onActivity={() => {
                if (onCallWith) voice.play(pack.id, character.id, 'activity');
              }}
              onSound={() => {
                const entity = pack.hotspots.find((h) => h.characterId === character.id)?.entityId;
                const clip = pack.sounds.find((s) => s.entityId === entity)?.clip;
                if (clip) void getMixer().playClip(clip);
              }}
              onChallenge={() =>
                voice.play(
                  pack.id,
                  character.id,
                  'challenge',
                  pack.challenges.find(
                    (c) =>
                      c.characterId === character.id && !state?.progress[pack.id]?.includes(c.id),
                  )?.id,
                )
              }
              onDress={voice.imagineOutfit}
              challengeDone={
                pack.challenges.filter((c) => c.characterId === character.id).length === 0 ||
                pack.challenges
                  .filter((c) => c.characterId === character.id)
                  .every((c) => state?.progress[pack.id]?.includes(c.id))
              }
              look={voice.looks[`${pack.id}:${character.id}`]}
              motion={
                voice.motion?.packId === pack.id && voice.motion.characterId === character.id
                  ? voice.motion
                  : undefined
              }
            />
          )}
          {quiz && question && (
            <section className="challenge-sheet" role="dialog" aria-labelledby="challenge-q">
              <p className="challenge-from">
                <StarIcon />
                {t('learnWorlds.challengeFrom', { name: closeName || persona?.name || '' })}
                {challenge && <b>{t('learnWorlds.pointsEarned', { points: challenge.points })}</b>}
              </p>
              <h2 id="challenge-q">{question}</h2>
              {quiz.options ? (
                <div className="answer-tiles">
                  {quiz.options.map((option) => (
                    <button
                      type="button"
                      key={option}
                      className="answer-tile"
                      onClick={() => voice.answer(option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="challenge-say">
                  <LearnIcon name="mic" />
                  {t('learnWorlds.sayAnswer')}
                </p>
              )}
            </section>
          )}
          {toast && (
            <p className="points-toast" key={toast.key} role="status">
              <StarIcon />
              {t('learnWorlds.pointsEarned', { points: toast.delta })}
            </p>
          )}
        </div>
        <p className="learn-hint">
          {voice.error ||
            voice.caption ||
            (failed
              ? t('learnWorlds.unavailable')
              : close
                ? t('learnWorlds.tapHintBusy')
                : t('learnWorlds.tapHint'))}
        </p>
      </div>
      <nav className="dock learn-dock" aria-label={title}>
        <div className="dock-friends">
          {child && <PetSlot childId={child.id} state={state} />}
          <PointsBadge
            points={learn?.points ?? 0}
            label={t('learnWorlds.pointsLabel')}
            language={language}
            bump={toast?.key}
          />
        </div>
        <div className="dock-talk">
          {persona ? (
            <button type="button" className="talk is-live" onClick={hangUp}>
              <span className="talk-pulse" aria-hidden="true" />
              <LearnIcon name="hangUp" filled />
              <span>{t('learnWorlds.hangUp')}</span>
            </button>
          ) : character ? (
            <button
              type="button"
              className="talk"
              onClick={ask}
              disabled={call === 'ringing' || (live && voice.status !== 'connected')}
            >
              <LearnIcon name="mic" />
              <span>{t('learnWorlds.ask', { name: closeName })}</span>
            </button>
          ) : null}
        </div>
        <div className="dock-tiles">
          <CompanionMenu inline />
          {character && !onCallWith && (
            <button
              type="button"
              className="dock-tile is-sunny"
              onClick={phone}
              disabled={call === 'ringing'}
            >
              <LearnIcon name="phone" filled />
              <span>{t('learnWorlds.call', { name: closeName })}</span>
            </button>
          )}
          {character ? (
            <button type="button" className="dock-tile" onClick={closeUp}>
              <LearnIcon name="back" />
              <span>{t('learnWorlds.back')}</span>
            </button>
          ) : (
            packs.length > 1 &&
            packs.map((p) => (
              <button
                key={p.id}
                type="button"
                className="dock-tile"
                aria-pressed={p.id === pack.id}
                onClick={() => {
                  closeUp();
                  setPackId(p.id);
                }}
              >
                <LearnIcon name={p.section === 'space' ? 'space' : (p.id as 'animals_farm')} />
                <span>{t(`learnWorlds.scenes.${p.id as 'animals_farm'}`)}</span>
              </button>
            ))
          )}
          <button type="button" className="dock-tile" onClick={() => setShelf(true)}>
            <LearnIcon name="paw" />
            <span>{t('learnWorlds.myPets')}</span>
          </button>
          <Link href="/learn" className="dock-tile is-quiet">
            <LearnIcon name="map" />
            <span>{t('learnWorlds.map')}</span>
          </Link>
        </div>
      </nav>
      {found[0] && (
        <PetCelebration
          key={found[0]}
          petId={found[0]}
          onBuddy={() => {
            if (child) writeBuddy(child.id, found[0]!);
            setFound((list) => list.slice(1));
          }}
          onClose={() => setFound((list) => list.slice(1))}
        />
      )}
      {shelf && child && learn && (
        <PetShelf
          pets={learn.pets}
          buddy={buddy}
          onChoose={(petId) => {
            writeBuddy(child.id, petId);
            setState((s) => (s ? { ...s } : s));
          }}
          onClose={() => setShelf(false)}
        />
      )}
    </main>
  );
}
