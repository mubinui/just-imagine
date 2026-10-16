'use client';
import { useEffect, useRef, useState } from 'react';
import { ADVENTURES, type StoryChapter } from '@just-imagine/learning-content/play';
import { useLanguage, formatNumber } from '../../lib/i18n';
import { getVoice } from '../../lib/voice';
import { LearnArt } from './LearnArt';
import { LearnIcon } from './parts';
import { LearningGame } from './LearningGame';
import { AdventureBoard } from './AdventureBoard';
import { useAdventureBook } from './useAdventureBook';
import type { PublicPack, Section } from './types';
export type StoryPhase = 'begin' | 'progress' | 'complete';
const CLASSIC_SECTIONS: Record<string, Section> = {
  brush: 'hygiene',
  oxygen: 'body',
  moon: 'space',
  picnic: 'food',
  dance: 'exercise',
};
export function StoryAdventure(props: {
  pack: PublicPack;
  childId: string;
  live: boolean;
  looks?: Record<string, { image?: string }>;
  motion?: { characterId: string; action: string; nonce: number };
  onMeet: (id: string) => void;
  onGuide: (chapter: StoryChapter, phase: StoryPhase) => void;
  onStory: (chapter: StoryChapter, phase: StoryPhase) => void;
  onChapter: (id: string) => void;
  onObservation: (event: string) => void;
  onChallenge: (characterId: string) => void;
}) {
  const book = useAdventureBook(props.childId, props.pack.id);
  const story = ADVENTURES[props.pack.id];
  if (!story) return null;
  if (!book.loaded)
    return (
      <div className="story-loading" role="status">
        <LearnArt id={story.chapters[0]!.characterId} />
        <p>{'Opening your adventure… / তোমার গল্প খুলছে…'}</p>
      </div>
    );
  return <StoryBook {...props} book={book} />;
}
function StoryBook({
  pack,
  live,
  looks,
  motion,
  onMeet,
  onGuide,
  onStory,
  onChapter,
  onObservation,
  onChallenge,
  book,
}: Parameters<typeof StoryAdventure>[0] & { book: ReturnType<typeof useAdventureBook> }) {
  const story = ADVENTURES[pack.id]!;
  const { language } = useLanguage(),
    bn = language === 'bn',
    lang = bn ? 1 : 0;
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      story.chapters.findIndex((c) => !book.done.includes(c.id)),
    ),
  );
  const [phase, setPhase] = useState<'opening' | 'playing' | 'ending'>('opening'),
    [attempt, setAttempt] = useState(0);
  const chapter = story.chapters[index]!,
    character = pack.characters.find((c) => c.id === chapter.characterId)!;
  const details = useRef<HTMLDetailsElement>(null),
    root = useRef<HTMLDivElement>(null);
  const endingTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(endingTimer.current), []);
  const chapterNotify = useRef(onChapter);
  useEffect(() => {
    chapterNotify.current = onChapter;
  });
  useEffect(() => {
    chapterNotify.current(chapter.characterId);
  }, [chapter.characterId]);
  useEffect(() => {
    if (!live || !root.current) return;
    const audio = getVoice().audio,
      node = root.current;
    const mouth = (value: number) => node.style.setProperty('--mouth-open', String(value));
    const unsubscribeMouth = audio.subscribeMouth(mouth);
    return () => {
      unsubscribeMouth();
      node.style.setProperty('--mouth-open', '0');
    };
  }, [live]);
  const currentPhase: StoryPhase =
    phase === 'ending' ? 'complete' : phase === 'opening' ? 'begin' : 'progress';
  const allDone = story.chapters.every((c) => book.done.includes(c.id));
  function choose(next: number) {
    clearTimeout(endingTimer.current);
    setIndex(next);
    setPhase('opening');
    setAttempt((v) => v + 1);
    if (details.current) details.current.open = false;
    root.current?.closest('.stage-scene')?.scrollTo({ top: 0 });
  }
  function complete() {
    void book.save(chapter.id);
    onStory(chapter, 'complete');
    endingTimer.current = setTimeout(
      () => setPhase('ending'),
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850,
    );
  }
  function next() {
    const later = story.chapters.findIndex((c, i) => i > index && !book.done.includes(c.id));
    const anywhere = story.chapters.findIndex((c) => !book.done.includes(c.id));
    choose(later >= 0 ? later : anywhere >= 0 ? anywhere : (index + 1) % story.chapters.length);
  }
  const image = looks?.[`${pack.id}:${chapter.characterId}`]?.image;
  const figure = (
    <div
      className={`story-guide learning-actor ${phase === 'ending' ? 'is-celebrating' : ''}`}
      key={motion?.nonce ?? 'still'}
      data-action={motion?.characterId === chapter.characterId ? motion.action : 'idle'}
    >
      {image /* Server-moderated data URL. */ ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" />
      ) : (
        <LearnArt id={chapter.characterId} />
      )}
    </div>
  );
  const classicPack =
    chapter.game.kind === 'classic'
      ? { ...pack, section: CLASSIC_SECTIONS[chapter.game.game]! }
      : pack;
  return (
    <div
      ref={root}
      className={`story-adventure is-${phase}`}
      data-voice-character={chapter.characterId}
      data-chapter={chapter.id}
      data-phase={phase}
      style={{ backgroundImage: `url(${pack.scene.theme.backdrop?.url})` }}
    >
      <header className="story-toolbar">
        <div>
          <h2>{story.title[lang]}</h2>
          <p>
            {formatNumber(index + 1, language)} / {formatNumber(story.chapters.length, language)} ·{' '}
            {chapter.title[lang]}
          </p>
        </div>
        <div className="story-tools">
          <button
            type="button"
            className="story-friend"
            onClick={() => onMeet(chapter.characterId)}
            aria-label={bn ? `${character.nameBn}কে কাছে আনো` : `Meet ${character.name}`}
          >
            <LearnArt id={chapter.characterId} />
            <span>{bn ? 'বন্ধুর সঙ্গে দেখা' : 'Meet your friend'}</span>
          </button>
          <details className="story-chapters" ref={details}>
            <summary>
              <LearnIcon name="map" />
              <span>{bn ? 'গল্পের পাতা' : 'Story chapters'}</span>
            </summary>
            <nav aria-label={bn ? 'গল্পের অধ্যায়' : 'Adventure chapters'}>
              <p>{story.opening[lang]}</p>
              {story.chapters.map((c, i) => (
                <button
                  type="button"
                  key={c.id}
                  aria-current={i === index ? 'step' : undefined}
                  onClick={() => choose(i)}
                  data-chapter-link={c.id}
                >
                  <LearnArt id={c.characterId} />
                  <span>{c.title[lang]}</span>
                  {book.done.includes(c.id) && (
                    <svg viewBox="0 0 24 24" aria-label={bn ? 'খেলা হয়েছে' : 'Played'}>
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  )}
                </button>
              ))}
            </nav>
          </details>
        </div>
      </header>
      {phase !== 'playing' ? (
        <section className="story-scene" aria-labelledby="story-scene-title">
          {figure}
          <div className="story-dialogue">
            <h3 id="story-scene-title">
              {phase === 'ending' && allDone
                ? bn
                  ? 'পুরো গল্প একসঙ্গে!'
                  : 'The whole story, together!'
                : chapter.title[lang]}
            </h3>
            <p>{phase === 'ending' && allDone ? story.ending[lang] : chapter.setup[lang]}</p>
            <p className="story-goal">
              {phase === 'ending' ? chapter.ending[lang] : chapter.goal[lang]}
            </p>
            {phase === 'ending' && (
              <p className="story-lesson">
                {bn ? character.factsBn[chapter.fact] : character.facts[chapter.fact]}
              </p>
            )}
            <div className="story-actions">
              <button
                type="button"
                className="story-primary"
                onClick={() => {
                  if (phase === 'ending') next();
                  else {
                    setPhase('playing');
                    onStory(chapter, 'begin');
                  }
                }}
              >
                {phase === 'ending'
                  ? allDone
                    ? bn
                      ? 'আবার গল্প খেলি'
                      : 'Play the story again'
                    : bn
                      ? 'পরের অধ্যায়'
                      : 'Next chapter'
                  : bn
                    ? 'চলো সাহায্য করি'
                    : 'Let’s help'}
              </button>
              <button type="button" onClick={() => onGuide(chapter, currentPhase)}>
                <LearnIcon name="phone" />
                {bn ? `${character.nameBn}কে ডাকো` : `Call ${character.name}`}
              </button>
              {phase === 'ending' && (
                <button type="button" onClick={() => onChallenge(chapter.characterId)}>
                  <LearnIcon name="studio" />
                  {bn ? 'কথায় চ্যালেঞ্জ' : 'Try a spoken challenge'}
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="story-play-heading">
            <div>
              <h3>{chapter.title[lang]}</h3>
              <p>{chapter.goal[lang]}</p>
            </div>
            <div className="story-play-actions">
              <button
                type="button"
                onClick={() => onGuide(chapter, 'progress')}
                aria-label={bn ? `${character.nameBn}কে ডাকো` : `Call ${character.name}`}
              >
                {figure}
                <span>{bn ? 'সাহায্য নাও' : 'Ask for help'}</span>
              </button>
              <button
                type="button"
                aria-label={bn ? 'অধ্যায় আবার খেলো' : 'Restart chapter'}
                onClick={() => {
                  clearTimeout(endingTimer.current);
                  setAttempt((v) => v + 1);
                }}
              >
                <LearnIcon name="back" />
              </button>
            </div>
          </div>
          <div className="story-playfield" key={`${chapter.id}:${attempt}`}>
            {chapter.game.kind === 'classic' ? (
              <LearningGame
                pack={classicPack}
                live={live}
                looks={looks}
                onMeet={onMeet}
                onObservation={onObservation}
                onChallenge={() => onChallenge(chapter.characterId)}
                story={{ onComplete: complete }}
              />
            ) : (
              <AdventureBoard
                chapter={chapter}
                pack={pack}
                looks={looks}
                onComplete={complete}
                onProgress={() => onStory(chapter, 'progress')}
              />
            )}
          </div>
        </>
      )}
      <footer className="story-bookmark">
        <span>
          {formatNumber(book.done.length, language)} /{' '}
          {formatNumber(story.chapters.length, language)}{' '}
          {bn ? 'অধ্যায় খেলা হয়েছে' : 'chapters played'}
        </span>
        <span role="status">
          {book.status === 'saving'
            ? bn
              ? 'গল্প সেভ হচ্ছে…'
              : 'Saving your story…'
            : book.status === 'offline'
              ? bn
                ? 'এখানে আছে; অনলাইনে সেভ আবার চেষ্টা করো।'
                : 'Kept here; online save needs another try.'
              : bn
                ? 'গল্পের পাতা মনে রাখা আছে'
                : 'Your place is remembered'}
        </span>
        {book.status === 'offline' && (
          <button type="button" onClick={() => void book.save()}>
            {bn ? 'আবার সেভ করো' : 'Retry save'}
          </button>
        )}
      </footer>
    </div>
  );
}
