'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CHAPTERS } from '@just-imagine/stem-content';
import { currentAttempt, type QuizItem, type AttemptDoc } from '@just-imagine/protocol';
import {
  assessmentAnswer,
  applyTutorSuggestion,
  assessmentRequests,
} from '../../lib/school/answers';
import type { SimId, Observable } from '@just-imagine/stem-sims';
import { schoolRequest, useSchoolResource } from '../../lib/school/api';
import type { Lesson, StudyMe, GradeResponse, BoardResponse } from '../../lib/school/types';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { useSchoolSession } from '../school/SchoolShell';
import { Field, ErrorNotice, Loading, ActionNotice, useSchoolAction } from '../school/shared';
import { UiIcon, type UiIconName } from '../UiIcon';
import { SimView } from '../stem/SimView';
import { ChemLab, type LabAnswer } from '../stem/ChemLab';
import { TutorDock } from './TutorDock';
import { Leaderboard } from './Leaderboard';
import { useStudyCopy } from './copy';
import {
  assessmentItems,
  displayRank,
  lessonProgress,
  quizPoints,
  restoredAnswers,
  storedVerdict,
  unansweredItems,
} from './study-logic';

const SUBJECT_ICON: Record<string, UiIconName> = {
  physics: 'space',
  chemistry: 'flask',
  math: 'write',
};
type GradeResult = GradeResponse & { attempt?: AttemptDoc };

export function StudyHome() {
  const { s, text } = useSchoolLanguage(),
    { t, n } = useStudyCopy(),
    session = useSchoolSession() as StudyMe | null,
    profile = useSchoolResource<StudyMe>('study/me'),
    board = useSchoolResource<BoardResponse>('study/boards?scope=class&period=week'),
    r = useSchoolResource<{ lessons: Lesson[]; attemptsByLesson?: Record<string, AttemptDoc> }>(
      'study/lessons',
    );
  const me = profile.data ?? session;
  const weekPoints = board.data?.own?.points;
  const rank = displayRank(weekPoints, board.data?.own?.rank);
  const [subject, setSubject] = useState(''),
    [grade, setGrade] = useState(''),
    [chapter, setChapter] = useState('');
  const lessons = (r.data?.lessons ?? []).map((lesson) => {
    const stored = r.data?.attemptsByLesson?.[lesson.id];
    const attempt = stored ? currentAttempt(stored, lesson.revision) : undefined;
    return {
      lesson,
      attempt,
      progress: lessonProgress(lesson, attempt),
      points: quizPoints(lesson, stored),
    };
  });
  const visible = lessons.filter(
    ({ lesson: l }) =>
      (!subject || l.subject === subject) &&
      (!grade || String(l.grade) === grade) &&
      (!chapter || l.chapterId === chapter),
  );
  const next =
    visible.find((v) => v.progress.state === 'progress') ??
    visible.find((v) => v.progress.state === 'new');
  const firstName = me?.student?.firstName;
  return (
    <div className="study-home">
      <header className="study-home-head">
        <div>
          <h1>{firstName ? t('welcome', { name: firstName }) : t('welcomeAnon')}</h1>
          <p className="study-home-lead">{s('studentAccess')}</p>
        </div>
        <dl className="study-stats">
          <div>
            <dt>
              <UiIcon name="star" width={22} height={22} />
              {t('weekPoints')}
            </dt>
            <dd>
              {weekPoints === undefined ? '—' : n(weekPoints)} <span>{t('pointsUnit')}</span>
            </dd>
          </div>
          {!board.error && (
            <div>
              <dt>
                <UiIcon name="trophy" width={22} height={22} />
                {t('classRank')}
              </dt>
              <dd>
                {rank ? (
                  n(rank)
                ) : (
                  <span className="study-stat-note" title={t('notRankedHint')}>
                    {t('notRanked')}
                  </span>
                )}
              </dd>
            </div>
          )}
          <div>
            <dt>
              <UiIcon name="timer" width={22} height={22} />
              {t('allTimePoints')}
            </dt>
            <dd>
              {n(me?.student?.pointsAll ?? 0)} <span>{t('pointsUnit')}</span>
            </dd>
          </div>
        </dl>
      </header>
      <div className="study-filters">
        <div className="sch-segments study-subjects" role="group" aria-label={s('subject')}>
          {['', 'physics', 'chemistry', 'math'].map((v) => (
            <button
              key={v || 'all'}
              type="button"
              aria-pressed={subject === v}
              data-subject={v || undefined}
              onClick={() => {
                setSubject(v);
                setChapter('');
              }}
            >
              {v && <UiIcon name={SUBJECT_ICON[v]!} width={20} height={20} />}
              {v ? s(v as 'physics') : t('allSubjects')}
            </button>
          ))}
        </div>
        <div className="study-filter-fields">
          <Field label={s('grade')}>
            <select value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">{s('all')}</option>
              <option value="9">{n(9)}</option>
              <option value="10">{n(10)}</option>
            </select>
          </Field>
          {subject && (
            <Field label={s('chapter')}>
              <select value={chapter} onChange={(e) => setChapter(e.target.value)}>
                <option value="">{s('all')}</option>
                {CHAPTERS.filter((c) => c.subject === subject).map((c) => (
                  <option key={c.id} value={c.id}>
                    {text(c.title)}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>
      </div>
      <ErrorNotice error={r.error} retry={r.reload} />
      {r.loading ? (
        <Loading />
      ) : (
        <>
          {visible.length > 0 && (
            <p className="study-count">{t('lessonCount', { n: visible.length })}</p>
          )}
          <ul className="study-lessons">
            {visible.map(({ lesson: l, progress, points }) => {
              const ratio = progress.total ? progress.correct / progress.total : 0;
              const isNext = next?.lesson.id === l.id;
              return (
                <li key={l.id}>
                  <Link
                    className="study-lesson"
                    data-subject={l.subject}
                    data-state={progress.state}
                    data-next={isNext || undefined}
                    href={'/study/lessons/' + l.id}
                  >
                    <span className="study-lesson-icon" aria-hidden="true">
                      <UiIcon name={SUBJECT_ICON[l.subject] ?? 'book'} width={30} height={30} />
                    </span>
                    <span className="study-lesson-body">
                      <span className="study-lesson-meta">
                        {s(l.subject)} · {s('grade')} {n(l.grade)}
                        {CHAPTERS.find((c) => c.id === l.chapterId) &&
                          ' · ' + text(CHAPTERS.find((c) => c.id === l.chapterId)?.title)}
                      </span>
                      <h2>{text(l.title)}</h2>
                      <span className="study-lesson-progress" aria-hidden="true">
                        <span
                          style={{
                            width: `${(progress.state === 'done' ? 1 : ratio) * 100}%`,
                          }}
                        />
                      </span>
                      <span className="study-lesson-foot">
                        <span className="study-lesson-state">
                          {progress.state === 'done' && (
                            <UiIcon name="check" width={18} height={18} />
                          )}
                          {progress.state === 'done'
                            ? t('stateDone', points)
                            : progress.state === 'progress'
                              ? t('stateProgress', { ...progress, ...points })
                              : t('stateNew', { steps: l.steps.length, max: points.max })}
                        </span>
                        <span className="study-lesson-cta">
                          {isNext && <span className="study-next-label">{t('upNext')}</span>}
                          {progress.state === 'done'
                            ? t('review')
                            : progress.state === 'progress'
                              ? t('continue')
                              : t('start')}
                          <UiIcon name="arrowRight" width={18} height={18} />
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {!visible.length && <p className="sch-empty">{s('noLessons')}</p>}
          {(!subject || subject === 'chemistry') && (
            <Link className="study-lab-link" href="/study/lab">
              <span className="study-lesson-icon" aria-hidden="true">
                <UiIcon name="flask" width={26} height={26} />
              </span>
              <span>
                <strong>{t('openLab')}</strong>
                <small>{t('openLabNote')}</small>
              </span>
              <UiIcon name="arrowRight" width={20} height={20} />
            </Link>
          )}
        </>
      )}
    </div>
  );
}
export function StudyBoard() {
  const { s } = useSchoolLanguage();
  return (
    <>
      <h1>{s('leaderboard')}</h1>
      <Leaderboard />
    </>
  );
}
export function OpenLab() {
  const { s } = useSchoolLanguage();
  return (
    <>
      <h1>{s('lab')}</h1>
      <section className="study-stage study-lab-stage">
        <ChemLab />
      </section>
    </>
  );
}
export function QuestionInput({
  item,
  value,
  onChange,
  headingId,
}: {
  item: QuizItem;
  value: unknown;
  onChange: (v: unknown) => void;
  headingId?: string;
}) {
  const { s, text } = useSchoolLanguage();
  return (
    <>
      <h2 id={headingId}>{text(item.prompt)}</h2>
      {item.kind === 'mcq' ? (
        <div role="radiogroup" aria-labelledby={headingId}>
          {item.options.map((option, i) => (
            <label className="sch-option study-choice" key={i}>
              <input
                type="radio"
                name={item.id}
                checked={value === i}
                onChange={() => onChange(i)}
              />
              {text(option)}
            </label>
          ))}
        </div>
      ) : item.kind === 'numeric' ? (
        <Field label={`${s('answer')} (${item.unit})`}>
          <input
            inputMode="decimal"
            value={
              typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''
            }
            onChange={(e) => onChange(e.target.value)}
          />
        </Field>
      ) : item.kind === 'simTask' ? (
        <SimView
          id={item.simId as SimId}
          value={{
            ...item.startParams,
            ...(typeof value === 'object' && value !== null ? value : {}),
          }}
          locked={Object.keys(item.startParams).filter((k) => !item.editableParams.includes(k))}
          onChange={(params) =>
            onChange(Object.fromEntries(item.editableParams.map((k) => [k, params[k]])))
          }
        />
      ) : (
        <ChemLab
          offered={item.reagentIds}
          onAnswer={onChange}
          initial={value as LabAnswer | undefined}
        />
      )}
    </>
  );
}

function Verdict({
  correct,
  saved,
  explanation,
}: {
  correct: boolean;
  saved?: boolean;
  explanation?: string;
}) {
  const { t } = useStudyCopy();
  return (
    <div
      className="study-verdict"
      data-correct={correct}
      data-saved={saved || undefined}
      role="status"
    >
      <span className="study-verdict-icon" aria-hidden="true">
        <UiIcon name={correct ? 'check' : 'restart'} width={26} height={26} />
      </span>
      <div>
        <strong>
          {saved ? t(correct ? 'savedCorrect' : 'savedWrong') : t(correct ? 'correct' : 'notYet')}
        </strong>
        {correct && explanation ? (
          <p>
            <span className="study-verdict-label">{t('keyIdea')}</span>
            {explanation}
          </p>
        ) : !correct && !saved ? (
          <p>{t('wrongNext')}</p>
        ) : null}
      </div>
    </div>
  );
}

export function LessonPlayer({ id }: { id: string }) {
  return <LessonPlayerContent key={id} id={id} />;
}
function LessonPlayerContent({ id }: { id: string }) {
  const { s, text, language } = useSchoolLanguage(),
    { t, n } = useStudyCopy(),
    r = useSchoolResource<{ lesson: Lesson; attempt?: AttemptDoc | null }>('study/lessons/' + id),
    action = useSchoolAction(),
    hintAction = useSchoolAction();
  const [index, setIndex] = useState(0),
    [params, setParams] = useState<Record<string, unknown>>({}),
    [edits, setEdits] = useState<Record<string, unknown>>({}),
    [savedAttempt, setSavedAttempt] = useState<AttemptDoc>(),
    [missing, setMissing] = useState<string[]>([]),
    [grades, setGrades] = useState<{
      context: string;
      answers: Record<string, unknown>;
      result: GradeResult;
    }>(),
    [hints, setHints] = useState<
      Record<string, { hints: { en: string; bn: string }[]; nextHintIndex: number | null }>
    >({}),
    [observation, setObservation] = useState<{
      simId: string;
      observable: Record<string, unknown>;
    }>(),
    [highlight, setHighlight] = useState('');
  const [requests] = useState(assessmentRequests);
  const observeTime = useRef(0);
  const onObserve = useCallback((simId: string, o: Observable) => {
    if (Date.now() - observeTime.current < 1000) return;
    observeTime.current = Date.now();
    setObservation({ simId, observable: o });
  }, []);
  const lesson = r.data?.lesson,
    step = lesson?.steps[index];
  const loadedAttempt = r.data?.attempt ?? null;
  const attempt = savedAttempt ?? loadedAttempt;
  const restored = useMemo(
    () => (lesson ? restoredAnswers(lesson, loadedAttempt) : {}),
    [lesson, loadedAttempt],
  );
  const answers = useMemo(() => ({ ...restored, ...edits }), [restored, edits]);
  const context = `${id}:${lesson?.revision}:${index}`;
  const feedback =
    grades?.context === context && grades.answers === answers ? grades.result : undefined;
  useEffect(() => {
    requests.invalidate();
    return () => requests.invalidate();
  }, [context, requests]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (step?.kind === 'explore') setParams(step.params);
      setGrades(undefined);
      setMissing([]);
      setObservation(undefined);
      observeTime.current = 0;
      setHighlight('');
    });
    return () => {
      active = false;
    };
  }, [index, step]);
  async function grade(items: QuizItem[], quiz: boolean) {
    if (!lesson) return;
    const isCurrent = requests.capture();
    try {
      const result = await schoolRequest<GradeResult>(
        `study/lessons/${id}/${quiz ? 'quiz' : 'check'}`,
        quiz
          ? {
              revision: lesson.revision,
              stepIndex: index,
              answers: items.map((item) => ({
                itemId: item.id,
                answer: assessmentAnswer(item, answers[item.id]),
              })),
            }
          : {
              revision: lesson.revision,
              itemId: items[0]!.id,
              answer: assessmentAnswer(items[0]!, answers[items[0]!.id]),
            },
      );
      if (isCurrent()) {
        setGrades({ context, answers, result });
        if (result.attempt) setSavedAttempt(result.attempt);
      }
    } catch (error) {
      if (isCurrent()) throw error;
    }
  }
  function submit(items: QuizItem[], quiz: boolean) {
    const open = unansweredItems(items, answers).map((i) => i.id);
    setMissing(open);
    if (open.length) {
      action.setError('');
      requestAnimationFrame(() => {
        const card = document.getElementById(`question-${open[0]}`);
        if (!card) return;
        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        card.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        const field = card.querySelector<HTMLElement>('input:not([disabled]), button, select');
        (field ?? card).focus({ preventScroll: true });
      });
      return;
    }
    void action.run(() => grade(items, quiz));
  }
  function moveTo(next: number) {
    requests.invalidate();
    setGrades(undefined);
    setIndex(next);
    action.setError('');
    document.getElementById('lesson-stage')?.scrollIntoView({ block: 'start' });
  }
  async function showHint(item: QuizItem) {
    if (!lesson) return;
    const key = context + ':' + item.id;
    const hintIndex = hints[key]?.nextHintIndex ?? 0;
    if (hints[key]?.nextHintIndex === null) return;
    const isCurrent = requests.capture();
    try {
      const result = await schoolRequest<{
        hint: { en: string; bn: string };
        hintIndex: number;
        remaining: number;
        nextHintIndex: number | null;
      }>(`study/lessons/${id}/hint`, { itemId: item.id, hintIndex, revision: lesson.revision });
      if (isCurrent())
        setHints((previous) => ({
          ...previous,
          [key]: {
            hints: [...(previous[key]?.hints.slice(0, result.hintIndex) ?? []), result.hint],
            nextHintIndex: result.nextHintIndex,
          },
        }));
    } catch (error) {
      if (isCurrent()) throw error;
    }
  }
  if (r.loading) return <Loading />;
  if (!lesson || !step) {
    const unavailable =
      !r.error || /not available|no longer available|not found|404/i.test(r.error);
    return (
      <section className="study-unavailable">
        <h1>{t('lessonUnavailable')}</h1>
        <ErrorNotice error={r.error || s('noLessons')} />
        <div className="sch-toolbar">
          <Link className="sch-action-link" href="/study">
            <UiIcon name="back" width={20} height={20} />
            {t('backToLessons')}
          </Link>
          {!unavailable && (
            <button type="button" onClick={r.reload}>
              {s('retry')}
            </button>
          )}
        </div>
      </section>
    );
  }
  const items = assessmentItems(step);
  const quiz = step.kind === 'quiz';
  const totals = quizPoints(lesson, attempt);
  const completed = Boolean(attempt?.completedAt);
  const wrong = feedback ? feedback.results.filter((g) => !g.correct).length : 0;
  return (
    <div className="study-player-page">
      <nav className="study-player-bar" aria-label={s('lessons')}>
        <Link className="study-quiet-link" href="/study">
          <UiIcon name="back" width={20} height={20} />
          {t('lessonsLink')}
        </Link>
        <Link className="study-secondary-link" href={`/study/lessons/${id}/materials`}>
          <UiIcon name="book" width={20} height={20} />
          {t('notes')}
        </Link>
      </nav>
      <section className="study-stage study-player" id="lesson-stage">
        <header className="study-player-head">
          <h1>{text(lesson.title)}</h1>
          {completed && (
            <span className="study-complete">
              <UiIcon name="check" width={20} height={20} />
              {s('completed')} · {n(totals.earned)}/{n(totals.max)} {t('pointsUnit')}
            </span>
          )}
        </header>
        <nav className="study-step-tabs" aria-label={s('lessonSteps')}>
          {lesson.steps.map((st, i) => (
            <button
              key={i}
              type="button"
              aria-current={index === i ? 'step' : undefined}
              aria-label={`${t('stepOf', { n: i + 1, total: lesson.steps.length })}: ${s(st.kind)}`}
              onClick={() => moveTo(i)}
            >
              <span className="study-step-num" aria-hidden="true">
                {n(i + 1)}
              </span>
              <span className="study-step-label" aria-hidden="true">
                {s(st.kind)}
              </span>
            </button>
          ))}
        </nav>
        <p className="study-step-caption" aria-hidden="true">
          {t('stepOf', { n: index + 1, total: lesson.steps.length })}: {s(step.kind)}
        </p>
        {step.kind === 'intro' ? (
          <p className="study-step-copy">{text(step.body)}</p>
        ) : step.kind === 'explore' ? (
          <>
            <div className="study-step-copy">
              {step.prompts.map((p, i) => (
                <p key={i}>{text(p)}</p>
              ))}
            </div>
            <SimView
              key={context}
              id={step.simId as SimId}
              value={Object.keys(params).length ? params : step.params}
              onChange={setParams}
              locked={step.lockedParams}
              onObserve={onObserve}
              highlight={highlight}
            />
          </>
        ) : step.kind === 'lab' ? (
          <>
            <p className="study-step-copy">{text(step.goal ?? undefined)}</p>
            <ChemLab key={context} offered={step.reagentIds} lessonId={id} stepIndex={index} />
          </>
        ) : (
          <>
            <p className="study-assess-intro">
              {quiz
                ? t('quizIntro', {
                    n: items.length,
                    max: items.reduce((sum, item) => sum + item.points, 0),
                  })
                : t('practiceIntro')}
            </p>
            {items.map((item, itemIndex) => {
              const hintKey = context + ':' + item.id;
              const shown = hints[hintKey]?.hints ?? [];
              const fresh = feedback?.results.find((g) => g.itemId === item.id);
              const saved = fresh ? undefined : storedVerdict(attempt, item, answers[item.id]);
              const explanation = fresh?.explanation ? text(fresh.explanation) : '';
              const repeatsHint = shown.some((h) => text(h).trim() === explanation.trim());
              const isMissing = missing.includes(item.id);
              return (
                <section
                  className="study-question"
                  key={item.id}
                  id={`question-${item.id}`}
                  tabIndex={-1}
                  data-missing={isMissing || undefined}
                  data-result={
                    fresh ? String(fresh.correct) : saved !== undefined ? String(saved) : undefined
                  }
                  aria-describedby={isMissing ? `missing-${item.id}` : undefined}
                >
                  {quiz && (
                    <p className="study-question-meta">
                      <span>{t('questionOf', { n: itemIndex + 1, total: items.length })}</span>
                      <span>
                        {item.points === 1 ? t('itemPoint') : t('itemPoints', { n: item.points })}
                      </span>
                    </p>
                  )}
                  <QuestionInput
                    key={context + item.id}
                    item={item}
                    headingId={`prompt-${item.id}`}
                    value={answers[item.id]}
                    onChange={(value) => {
                      requests.invalidate();
                      setGrades(undefined);
                      setMissing((m) => m.filter((v) => v !== item.id));
                      setEdits((a) => ({ ...a, [item.id]: value }));
                    }}
                  />
                  {isMissing && (
                    <p className="study-missing" id={`missing-${item.id}`}>
                      {t('answerThis')}
                    </p>
                  )}
                  {shown.length > 0 && (
                    <ol className="study-hints">
                      {shown.map((hint, hintIndex) => (
                        <li key={hintIndex}>
                          <span>{t('hintLabel', { n: hintIndex + 1 })}</span>
                          {text(hint)}
                        </li>
                      ))}
                    </ol>
                  )}
                  {fresh && (
                    <Verdict
                      correct={fresh.correct}
                      explanation={repeatsHint ? undefined : explanation}
                    />
                  )}
                  {saved !== undefined && <Verdict correct={saved} saved />}
                  {hints[hintKey]?.nextHintIndex !== null && !fresh?.correct && !saved && (
                    <button
                      type="button"
                      className="study-hint-button"
                      disabled={hintAction.busy}
                      onClick={() => void hintAction.run(() => showHint(item))}
                    >
                      <UiIcon name="search" width={20} height={20} />
                      {t('showHint', { n: shown.length + 1 })}
                    </button>
                  )}
                </section>
              );
            })}
            <ActionNotice action={hintAction} />
            <div className="study-submit">
              <button
                className="sch-primary"
                disabled={action.busy}
                onClick={() => submit(items, quiz)}
              >
                {action.busy
                  ? t('checking')
                  : quiz && (feedback || completed)
                    ? t('resubmit')
                    : s(quiz ? 'submitQuiz' : 'submit')}
              </button>
              <div className="study-submit-status">
                {missing.length > 0 && (
                  <p className="study-submit-error" role="alert">
                    {missing.length === 1 ? t('answerOne') : t('answerAll', { n: missing.length })}
                  </p>
                )}
                <ActionNotice action={action} />
                {quiz && feedback && (
                  <p role="status" className="study-submit-total">
                    <strong>{t('totalPoints', { earned: totals.earned, max: totals.max })}</strong>
                    <span>{t('pointsNow', { n: feedback.pointsAwarded ?? 0 })}</span>
                    <span>
                      {wrong === 0
                        ? completed
                          ? `${t('quizComplete')}. ${t('allCorrect')}`
                          : t('allCorrect')
                        : wrong === 1
                          ? t('oneWrong')
                          : t('someWrong', { n: wrong })}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </>
        )}
        <div className="study-step-nav">
          <button disabled={index === 0} onClick={() => moveTo(index - 1)}>
            <UiIcon name="back" width={20} height={20} />
            {s('previous')}
          </button>
          {index < lesson.steps.length - 1 ? (
            <button className="study-next" onClick={() => moveTo(index + 1)}>
              {s('next')}
              <UiIcon name="arrowRight" width={20} height={20} />
            </button>
          ) : (
            <Link className="sch-action-link study-next" href="/study">
              {s('finish')}
              <UiIcon name="finish" width={20} height={20} />
            </Link>
          )}
        </div>
      </section>
      <TutorDock
        key={id + language}
        lessonId={id}
        stepIndex={index}
        subject={lesson.subject}
        observation={observation}
        onHighlight={setHighlight}
        onSuggest={(key, value) => {
          if (step.kind === 'explore')
            setParams(
              (p) =>
                applyTutorSuggestion(
                  step.simId,
                  Object.keys(p).length ? p : step.params,
                  key,
                  value,
                  step.lockedParams,
                ) ?? p,
            );
        }}
      />
    </div>
  );
}
