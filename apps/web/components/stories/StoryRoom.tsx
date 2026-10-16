'use client';
/* eslint-disable @next/next/no-img-element -- Generated story art is served from the configured owned asset service. */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { type StoryDoc, type StoryProgressSchema } from '@just-imagine/protocol';
import type { z } from 'zod';
import { api } from '../../lib/api';
import { useLanguage } from '../../lib/i18n';
import { getVoice } from '../../lib/voice';
import { useChild } from '../learn/LearnMap';
import { Actor } from '../acting/Actor';
import { CompanionMenu } from '../companion/Companion';
import { useStoryNarration } from './useStoryNarration';
import '../../app/studio.css';
import '../../app/stories.css';

type Progress = z.infer<typeof StoryProgressSchema>;
export function Katha({ action = 'idle' }: { action?: string }) {
  const root = useRef<SVGSVGElement>(null);
  useEffect(
    () =>
      getVoice().audio.subscribeMouth((value) => {
        root.current?.style.setProperty(
          '--mouth-open',
          String(getVoice().speakerId === 'katha' ? value : 0),
        );
      }),
    [],
  );
  return (
    <svg
      ref={root}
      className="katha"
      viewBox="0 0 100 100"
      data-voice-character="katha"
      aria-hidden="true"
    >
      <Actor id="katha" action={action} />
    </svg>
  );
}
export function StoryRoom() {
  const child = useChild(),
    { language } = useLanguage(),
    bn = language === 'bn';
  const [topic, setTopic] = useState(''),
    [books, setBooks] = useState<StoryDoc[]>([]),
    [book, setBook] = useState<StoryDoc>();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saveState, setSaveState] = useState('');
  const [discovered, setDiscovered] = useState(false),
    [choiceResponse, setChoiceResponse] = useState(''),
    [choiceAction, setChoiceAction] = useState('');
  const [auto, setAuto] = useState(true);
  const current = useRef(book),
    creating = useRef(false),
    saveChain = useRef<Promise<void>>(Promise.resolve());
  const revisions = useRef(new Map<string, number>());
  const request = useRef<{ topic: string; id: string } | undefined>(undefined);
  const commands = useRef<{ topic: (value: string) => void; finished: () => void }>({
    topic: () => {},
    finished: () => {},
  });
  const narration = useStoryNarration(
    child,
    (value) => commands.current.topic(value),
    () => commands.current.finished(),
  );
  const bookId = book?.id,
    bookStatus = book?.status;
  useEffect(() => {
    current.current = book;
  }, [book]);
  const load = useCallback(async () => {
    if (!child) return;
    const result = await api<{ stories: StoryDoc[] }>('listStories', { childId: child.id });
    setBooks(result.stories);
  }, [child]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      void load().catch((e) => setError(e.message));
      const remembered = child && localStorage.getItem(`ji-story-book:${child.id}`);
      if (remembered)
        void api<StoryDoc>('getStory', { storyId: remembered })
          .then((saved) => {
            if (active && saved.childId === child?.id) {
              current.current = saved;
              setBook(saved);
            }
          })
          .catch(() => {
            if (child) localStorage.removeItem(`ji-story-book:${child.id}`);
          });
    });
    return () => {
      active = false;
    };
  }, [load, child]);
  useEffect(() => {
    if (!bookId || !bookStatus || !['queued', 'writing', 'illustrating'].includes(bookStatus))
      return;
    let active = true;
    const poll = setInterval(() => {
      void api<StoryDoc>('getStory', { storyId: bookId })
        .then((next) => {
          if (!active) return;
          setBook((previous) =>
            previous?.id === next.id
              ? {
                  ...next,
                  progress: previous.progress,
                  revision: Math.max(next.revision, previous.revision),
                }
              : previous,
          );
        })
        .catch(() => {
          if (active)
            setError(
              bn
                ? 'সংযোগ নেই। তোমার গল্প সেভ আছে।'
                : 'The workshop connection stopped. Your story is saved.',
            );
        });
    }, 2500);
    return () => {
      active = false;
      clearInterval(poll);
    };
  }, [bookId, bookStatus, bn]);
  async function create(value = topic) {
    if (!child || creating.current || value.trim().length < 3) return;
    narration.pause();
    creating.current = true;
    setBusy(true);
    setError('');
    setChoiceResponse('');
    if (request.current?.topic !== value.trim())
      request.current = { topic: value.trim(), id: `request_${crypto.randomUUID()}` };
    try {
      const next = await api<StoryDoc>(
        'createStory',
        { childId: child.id },
        { topic: request.current.topic, requestId: request.current.id },
      );
      setBook(next);
      current.current = next;
      localStorage.setItem(`ji-story-book:${child.id}`, next.id);
      setTopic('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the story.');
    } finally {
      creating.current = false;
      setBusy(false);
    }
  }
  function progress(next: Progress) {
    const active = current.current;
    if (!active) return;
    const optimistic = { ...active, progress: next };
    current.current = optimistic;
    setBook(optimistic);
    setSaveState(bn ? 'সেভ হচ্ছে…' : 'Saving…');
    // Serialize writes so quick navigation cannot overwrite a later bookmark with an older response.
    saveChain.current = saveChain.current.then(async () => {
      const revision = revisions.current.get(active.id) ?? active.revision;
      try {
        const saved = await api<StoryDoc>(
          'updateStory',
          { storyId: active.id },
          { revision, progress: next },
        );
        revisions.current.set(saved.id, saved.revision);
        if (current.current?.id === saved.id) {
          current.current = { ...current.current, revision: saved.revision };
          setBook((prev) => (prev?.id === saved.id ? { ...prev, revision: saved.revision } : prev));
          setSaveState(bn ? 'পাতা মনে রাখা আছে' : 'Your place is saved');
        }
      } catch (e) {
        setSaveState(
          bn
            ? 'সেভ হয়নি—পাতা বদলানোর আগে আবার চেষ্টা করো।'
            : 'Not saved—retry before leaving this page.',
        );
        setError(e instanceof Error ? e.message : 'Could not save the bookmark.');
      }
    });
  }
  const onFinish = () => {
    const active = current.current;
    if (!active?.manuscript) return;
    if (choiceResponse) return;
    const { scene, beat } = active.progress,
      page = active.manuscript.scenes[scene]!;
    if (auto && beat + 1 < page.beats.length) {
      progress({ ...active.progress, beat: beat + 1 });
      void narration.read(active, scene, beat + 1);
    }
  };
  useEffect(() => {
    commands.current = {
      topic: (value) => {
        setTopic(value);
        void create(value);
      },
      finished: onFinish,
    };
  });
  const scene = book?.manuscript?.scenes[book.progress.scene],
    beat = scene?.beats[book?.progress.beat ?? 0];
  const choice =
    scene && book?.progress.choices[scene.id]
      ? scene.choices.find((c) => c.id === book.progress.choices[scene.id])
      : undefined;
  const making = book && ['queued', 'writing', 'illustrating'].includes(book.status);
  const readyImages = book
    ? Object.values(book.images).filter((i) => i.status === 'ready').length
    : 0;
  function open(next: StoryDoc) {
    if (child) localStorage.setItem(`ji-story-book:${child.id}`, next.id);
    narration.pause();
    setChoiceResponse('');
    setChoiceAction('');
    setDiscovered(false);
    current.current = next;
    setBook(next);
    setError('');
  }
  function changeScene(index: number) {
    if (!book?.manuscript) return;
    narration.pause();
    setChoiceResponse('');
    setChoiceAction('');
    setDiscovered(false);
    progress({ ...book.progress, scene: index, beat: 0, completed: false });
  }
  return (
    <main className="story-room">
      <header className="story-room-header">
        <Link href="/learn">← {bn ? 'শেখার জগত' : 'Learning worlds'}</Link>
        <h1>{book?.manuscript?.title ?? (bn ? 'কথার গল্পঘর' : 'Katha’s story room')}</h1>
        <button
          type="button"
          onClick={() => {
            narration.pause();
            setBook(undefined);
            current.current = undefined;
            request.current = undefined;
            if (child) localStorage.removeItem(`ji-story-book:${child.id}`);
            setChoiceResponse('');
            setError('');
            void load();
          }}
        >
          {bn ? 'নতুন গল্প' : 'New story'}
        </button>
      </header>
      {error && (
        <p className="story-room-error" role="alert">
          {error}
          <button type="button" onClick={() => setError('')}>
            {bn ? 'বন্ধ' : 'Dismiss'}
          </button>
        </p>
      )}
      {!book ? (
        <>
          <section className="story-invitation">
            <div className="story-invitation-copy">
              <h2>{bn ? 'তোমার ভাবনা।\nআমাদের গল্প।' : 'Your idea.\nOur next adventure.'}</h2>
              <p>
                {bn
                  ? 'কে থাকবে? কোথায় যাব? তুমি বলো, কথার গল্পে দেখা যাক।'
                  : 'Who will we meet? Where shall we go? Tell Katha what you imagine.'}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void create();
                }}
              >
                <label htmlFor="story-topic">
                  {bn ? 'কী নিয়ে গল্প শুনবে?' : 'What shall our story be about?'}
                </label>
                <textarea
                  id="story-topic"
                  rows={3}
                  maxLength={600}
                  minLength={3}
                  required
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    request.current = undefined;
                  }}
                  placeholder={bn ? 'যা খুশি ভাবো…' : 'Anything you imagine…'}
                />
                <div className="story-room-actions">
                  <button className="story-room-primary" disabled={busy || topic.trim().length < 3}>
                    {busy
                      ? bn
                        ? 'তৈরি হচ্ছে…'
                        : 'Starting…'
                      : bn
                        ? 'আমার গল্প বানাও'
                        : 'Make my story'}
                  </button>
                  <button type="button" onClick={() => void narration.ask()}>
                    {bn ? 'কথাকে বলো' : 'Tell Katha aloud'}
                  </button>
                </div>
              </form>
              <p className="story-room-note">
                {bn
                  ? 'তোমার বিষয়। তোমার সিদ্ধান্ত। নতুন ছবি আর শেখার আবিষ্কার নিয়ে গল্প।'
                  : 'Your topic and choices, with new illustrations and discoveries along the way.'}
              </p>
            </div>
            <div className="story-invitation-friend">
              <Katha action={narration.state === 'listening' ? 'listen' : 'idle'} />
              <p>{bn ? 'আমি কথা। চলো, গল্পে যাই।' : 'I’m Katha. Let’s open a little wonder.'}</p>
            </div>
          </section>
          {books.length > 0 && (
            <section className="story-library">
              <h2>{bn ? 'তোমার গল্পের তাক' : 'Your story shelf'}</h2>
              <div>
                {books.map((saved) => (
                  <button key={saved.id} type="button" onClick={() => open(saved)}>
                    {Object.values(saved.images).find((i) => i.status === 'ready')?.url ? (
                      <img
                        src={Object.values(saved.images).find((i) => i.status === 'ready')!.url}
                        alt=""
                      />
                    ) : (
                      <Katha />
                    )}
                    <strong>{saved.manuscript?.title ?? saved.topic}</strong>
                    <span>
                      {saved.manuscript
                        ? `${saved.progress.scene + 1} / ${saved.manuscript.scenes.length} · ${saved.progress.completed ? (bn ? 'শেষ' : 'Read together') : bn ? 'আবার খোলো' : 'Open your bookmark'}`
                        : bn
                          ? 'গল্প তৈরি হচ্ছে'
                          : 'In the story workshop'}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      ) : !scene ? (
        <section className="story-workshop">
          <Katha action="wave" />
          <h2>{bn ? 'তোমার ভাবনা দিয়ে গল্প বুনছি…' : 'We’re weaving your idea into a story…'}</h2>
          <p>{book.topic}</p>
          <p role="status">
            {book.status === 'failed'
              ? book.error
              : book.status === 'queued'
                ? bn
                  ? 'গল্পের কর্মশালায় অপেক্ষা'
                  : 'Your idea is in the workshop queue'
                : bn
                  ? 'চরিত্র, আবিষ্কার আর গল্পের পথ লিখছি'
                  : `Writing the characters, discoveries and choices · ${book.writtenScenes} / ${book.preferences.length === 'long' ? 6 : 3} scenes`}
          </p>
          {book.status === 'failed' && book.canRetry && (
            <button
              type="button"
              className="story-room-primary"
              onClick={() =>
                void api<StoryDoc>('retryStory', { storyId: book.id })
                  .then(open)
                  .catch((e) => setError(e.message))
              }
            >
              {bn ? 'আবার চেষ্টা' : 'Try the workshop again'}
            </button>
          )}
        </section>
      ) : (
        <>
          <div className="narrative-spread">
            <section
              className="narrative-stage"
              data-atmosphere={scene.atmosphere}
              data-action={choiceAction || beat?.action}
              data-reading={narration.state === 'reading'}
              aria-label={scene.title}
              key={scene.id}
            >
              {book.images[scene.id]?.url ? (
                <img
                  className="narrative-plate"
                  src={book.images[scene.id]!.url}
                  alt={scene.title}
                />
              ) : (
                <div className="narrative-unpainted">
                  <Katha action="listen" />
                  <p>
                    {bn
                      ? 'ছবি আসছে। গল্প এখনই পড়তে পারো।'
                      : 'The illustration is on its way. Your story is ready to read.'}
                  </p>
                </div>
              )}
              <div className="narrative-light" aria-hidden="true" />
              <div className="narrative-ripple" aria-hidden="true" />
              <div className="narrative-focus" key={`${book.progress.beat}:${choiceAction}`}>
                <span>{beat?.focus}</span>
              </div>
              <button
                type="button"
                className="narrative-discovery"
                aria-expanded={discovered}
                onClick={() => setDiscovered((v) => !v)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="10" cy="10" r="6" />
                  <path d="m15 15 6 6M7 10h6M10 7v6" />
                </svg>
                {scene.discovery.label}
              </button>
              <div className="narrative-guide">
                <Katha
                  action={narration.state === 'reading' ? 'idle' : choice ? 'cheer' : 'listen'}
                />
              </div>
            </section>
            <section className="narrative-script">
              <div className="narrative-page-heading">
                <span>
                  {bn ? 'দৃশ্য' : 'Scene'} {book.progress.scene + 1} /{' '}
                  {book.manuscript!.scenes.length}
                </span>
                <h2>{scene.title}</h2>
                <span role="status">{saveState}</span>
              </div>
              {discovered && (
                <aside className="narrative-finding">
                  <strong>{scene.discovery.label}</strong>
                  <p>{scene.discovery.explanation}</p>
                  <button
                    type="button"
                    onClick={() => {
                      void narration.ask(book).then(() =>
                        getVoice().send({
                          type: 'text',
                          text: `${bn ? 'বোঝাও' : 'Please explain'}: ${scene.discovery.explanation}`,
                        }),
                      );
                    }}
                  >
                    {bn ? 'কথাকে জিজ্ঞেস করো' : 'Ask Katha about this'}
                  </button>
                </aside>
              )}
              <p className="narrative-prose" aria-live="off">
                {choiceResponse || beat?.text}
              </p>
              <div className="story-room-actions">
                <button
                  type="button"
                  className="story-room-primary"
                  disabled={narration.state === 'connecting'}
                  onClick={() => {
                    if (narration.state === 'reading') narration.pause();
                    else
                      void narration.read(
                        book,
                        book.progress.scene,
                        book.progress.beat,
                        choiceResponse ? choice?.id : undefined,
                      );
                  }}
                >
                  {narration.state === 'connecting'
                    ? bn
                      ? 'ডাকছি…'
                      : 'Calling…'
                    : narration.state === 'reading'
                      ? bn
                        ? 'একটু থামো'
                        : 'Pause story'
                      : bn
                        ? 'কথা, পড়ে শোনাও'
                        : 'Katha, read with me'}
                </button>
                <button type="button" onClick={() => void narration.ask(book)}>
                  {bn ? 'একটা প্রশ্ন আছে' : 'I have a question'}
                </button>
                <label className="story-auto">
                  <input
                    type="checkbox"
                    checked={auto}
                    onChange={(e) => setAuto(e.target.checked)}
                  />
                  {bn ? 'একসঙ্গে পড়ে যাও' : 'Read the scene together'}
                </label>
              </div>
              <nav className="narrative-beats" aria-label={bn ? 'গল্পের অংশ' : 'Story passages'}>
                {scene.beats.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-current={i === book.progress.beat ? 'step' : undefined}
                    onClick={() => {
                      narration.pause();
                      setChoiceResponse('');
                      setChoiceAction('');
                      progress({ ...book.progress, beat: i });
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </nav>
              {book.progress.beat === scene.beats.length - 1 && (
                <div className="narrative-choices">
                  <h3>{scene.question}</h3>
                  <div>
                    {scene.choices.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={choice?.id === c.id}
                        onClick={() => {
                          narration.pause();
                          setChoiceResponse(c.response);
                          setChoiceAction(c.nextAction);
                          progress({
                            ...book.progress,
                            choices: { ...book.progress.choices, [scene.id]: c.id },
                          });
                        }}
                      >
                        {c.label}
                        <span aria-hidden="true">→</span>
                      </button>
                    ))}
                  </div>
                  {choice && <p className="narrative-lesson">{scene.lesson}</p>}
                </div>
              )}
              {book.progress.completed && (
                <aside className="story-finale">
                  <Katha action="cheer" />
                  <div>
                    <h3>{bn ? 'একসঙ্গে গল্পটা বানালাম' : 'We made this story together'}</h3>
                    <p>{book.manuscript!.ending}</p>
                    <ul>
                      {book.manuscript!.learningGoals.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  </div>
                </aside>
              )}
              <div className="narrative-turn-page">
                <button
                  type="button"
                  disabled={book.progress.scene === 0}
                  onClick={() => changeScene(book.progress.scene - 1)}
                >
                  ← {bn ? 'আগের দৃশ্য' : 'Previous scene'}
                </button>
                <button
                  type="button"
                  className="story-room-primary"
                  disabled={!choice || book.progress.beat !== scene.beats.length - 1}
                  onClick={() => {
                    if (book.progress.scene + 1 < book.manuscript!.scenes.length)
                      changeScene(book.progress.scene + 1);
                    else {
                      narration.pause();
                      progress({ ...book.progress, completed: true });
                    }
                  }}
                >
                  {book.progress.scene + 1 < book.manuscript!.scenes.length
                    ? bn
                      ? 'পরের দৃশ্য →'
                      : 'Turn the page →'
                    : bn
                      ? 'গল্পের শেষ দেখো'
                      : 'Our story’s ending'}
                </button>
              </div>
              <details className="story-scene-index">
                <summary>{bn ? 'সব দৃশ্য ও শেখার বিষয়' : 'Scenes and discoveries'}</summary>
                <nav>
                  {book.manuscript!.scenes.map((s, i) => (
                    <button key={s.id} type="button" onClick={() => changeScene(i)}>
                      {i + 1}. {s.title}
                    </button>
                  ))}
                </nav>
                <p>{book.manuscript!.learningGoals.join(' · ')}</p>
              </details>
            </section>
          </div>
          {making && (
            <p className="story-generation-note" role="status">
              {bn
                ? 'গল্প পড়তে থাকো। ছবি আঁকা হচ্ছে'
                : 'Keep reading while your illustrations are made'}{' '}
              · {readyImages}/{book.manuscript!.scenes.length}
            </p>
          )}
          {book.status === 'failed' && book.canRetry && (
            <p className="story-generation-note">
              {book.error}
              <button
                type="button"
                onClick={() =>
                  void api<StoryDoc>('retryStory', { storyId: book.id })
                    .then((next) => {
                      setBook(next);
                      current.current = next;
                    })
                    .catch((e) => setError(e.message))
                }
              >
                {bn ? 'ছবি আবার চেষ্টা' : 'Retry missing pictures'}
              </button>
            </p>
          )}
        </>
      )}
      {narration.error && (
        <p className="story-room-error" role="alert">
          {narration.error}
        </p>
      )}
      {(narration.state === 'listening' || narration.state === 'reading') && narration.caption && (
        <details className="story-live-caption">
          <summary>{bn ? 'কথার কথা' : 'Katha’s words'}</summary>
          <p>{narration.caption}</p>
        </details>
      )}
      {narration.state === 'listening' && (
        <p className="story-generation-note" role="status">
          {bn ? 'কথা শুনছে। তুমি বলতে পারো।' : 'Katha is listening. You can speak.'}
          <button type="button" onClick={narration.pause}>
            {bn ? 'কল থামাও' : 'Pause call'}
          </button>
        </p>
      )}
      <footer className="story-room-footer">
        <Link href="/learn">{bn ? 'অন্য জগতে খেলি' : 'Play in learning worlds'}</Link>
        <span>
          {bn
            ? 'তোমার শেখার লক্ষ্য অভিভাবক ঠিক করতে পারেন'
            : 'Parents can shape learning goals in Settings'}
        </span>
        <CompanionMenu inline />
      </footer>
    </main>
  );
}
