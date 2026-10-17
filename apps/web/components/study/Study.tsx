'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { CHAPTERS } from '@just-imagine/stem-content';
import type { QuizItem, AttemptDoc } from '@just-imagine/protocol';
import { assessmentAnswer, applyTutorSuggestion } from '../../lib/school/answers';
import type { SimId, Observable } from '@just-imagine/stem-sims';
import { schoolRequest, useSchoolResource } from '../../lib/school/api';
import type { Lesson, StudyMe, GradeResponse, BoardResponse } from '../../lib/school/types';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { useSchoolSession } from '../school/SchoolShell';
import { Field, ErrorNotice, Loading, ActionNotice, useSchoolAction } from '../school/shared';
import { SimView } from '../stem/SimView';
import { ChemLab } from '../stem/ChemLab';
import { TutorDock } from './TutorDock';
import { Leaderboard } from './Leaderboard';
export function StudyHome() {
  const { s, text } = useSchoolLanguage(),
    session = useSchoolSession() as StudyMe | null,
    profile = useSchoolResource<StudyMe>('study/me'),
    board = useSchoolResource<BoardResponse>('study/boards?scope=class&period=week'),
    r = useSchoolResource<{ lessons: Lesson[]; attemptsByLesson?: Record<string, AttemptDoc> }>(
      'study/lessons',
    );
  const me = profile.data ?? session;
  const weekPoints = board.data?.own?.points;
  const [subject, setSubject] = useState(''),
    [grade, setGrade] = useState(''),
    [chapter, setChapter] = useState('');
  return (
    <>
      <h1>
        {me?.student?.firstName ? me.student.firstName + ', ' : ''}
        {s('study')}
      </h1>
      <p className="sch-summary">{s('studentAccess')}</p>
      <p>
        {s('week')}: {weekPoints ?? '—'} · {s('rank')}: {board.data?.own?.rank ?? '—'} ·{' '}
        {s('allTime')}: {me?.student?.pointsAll ?? 0} {s('points')}
      </p>
      <div className="sch-tabs">
        {['physics', 'chemistry', 'math'].map((v) => (
          <button
            key={v}
            aria-pressed={subject === v}
            onClick={() => {
              setSubject(v);
              setChapter('');
            }}
          >
            {s(v as 'physics')}
          </button>
        ))}
      </div>
      {subject && (
        <div className="sch-toolbar">
          <Field label={s('grade')}>
            <select value={grade} onChange={(e) => setGrade(e.target.value)}>
              <option value="">{s('all')}</option>
              <option>9</option>
              <option>10</option>
            </select>
          </Field>
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
          {subject === 'chemistry' && (
            <Link className="sch-action-link" href="/study/lab">
              {s('lab')}
            </Link>
          )}
        </div>
      )}
      <ErrorNotice error={r.error} retry={r.reload} />
      {r.loading ? (
        <Loading />
      ) : (
        <div className="sch-list">
          {r.data?.lessons
            .filter(
              (l) =>
                (!subject || l.subject === subject) &&
                (!grade || String(l.grade) === grade) &&
                (!chapter || l.chapterId === chapter),
            )
            .map((l) => (
              <Link className="sch-subject" key={l.id} href={'/study/lessons/' + l.id}>
                <h2>{text(l.title)}</h2>
                <p>
                  {s(l.subject)} · {s('grade')} {l.grade} ·{' '}
                  {text(CHAPTERS.find((c) => c.id === l.chapterId)?.title)}
                </p>
                <p>
                  {s('steps')}: {l.steps.length} ·{' '}
                  {r.data?.attemptsByLesson?.[l.id]?.completedAt
                    ? s('completed')
                    : r.data?.attemptsByLesson?.[l.id]
                      ? s('completion') +
                        ': ' +
                        Object.values(r.data.attemptsByLesson[l.id]!.items).filter((v) => v.correct)
                          .length
                      : s('notStarted')}{' '}
                  · {s('points')}: {r.data?.attemptsByLesson?.[l.id]?.pointsAwarded ?? 0}
                </p>
              </Link>
            ))}
          {!r.data?.lessons.length && <p className="sch-empty">{s('noLessons')}</p>}
        </div>
      )}
    </>
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
      <section className="study-stage">
        <ChemLab />
      </section>
    </>
  );
}
export function QuestionInput({
  item,
  value,
  onChange,
}: {
  item: QuizItem;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const { s, text } = useSchoolLanguage();
  return (
    <>
      <h2>{text(item.prompt)}</h2>
      {item.kind === 'mcq' ? (
        <div>
          {item.options.map((option, i) => (
            <label className="sch-option" key={i}>
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
        <Field label={`${s('answer')} ${item.unit}`}>
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
        <ChemLab offered={item.reagentIds} onAnswer={onChange} />
      )}
    </>
  );
}

export function LessonPlayer({ id }: { id: string }) {
  const { s, text, language } = useSchoolLanguage(),
    r = useSchoolResource<{ lesson: Lesson; attempt?: unknown }>('study/lessons/' + id),
    action = useSchoolAction();
  const [index, setIndex] = useState(0),
    [params, setParams] = useState<Record<string, unknown>>({}),
    [answers, setAnswers] = useState<Record<string, unknown>>({}),
    [grades, setGrades] = useState<GradeResponse>(),
    [hint, setHint] = useState(''),
    [observation, setObservation] = useState<{
      simId: string;
      observable: Record<string, unknown>;
    }>(),
    [highlight, setHighlight] = useState('');
  const observeTime = useRef(0);
  const onObserve = useCallback((simId: string, o: Observable) => {
    if (Date.now() - observeTime.current < 1000) return;
    observeTime.current = Date.now();
    setObservation({ simId, observable: o });
  }, []);
  const lesson = r.data?.lesson,
    step = lesson?.steps[index];
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      if (step?.kind === 'explore') setParams(step.params);
      setGrades(undefined);
      setHint('');
      setHighlight('');
    });
    return () => {
      active = false;
    };
  }, [index, step]);
  async function grade(items: QuizItem[], quiz: boolean) {
    if (!lesson) return;
    const result = await schoolRequest<GradeResponse>(
      `study/lessons/${id}/${quiz ? 'quiz' : 'check'}`,
      quiz
        ? {
            revision: lesson.revision,
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
    setGrades(result);
  }
  if (r.loading) return <Loading />;
  if (!lesson || !step) return <ErrorNotice error={r.error || s('noLessons')} retry={r.reload} />;
  return (
    <>
      <div className="sch-toolbar">
        <Link href="/study">← {s('lessons')}</Link>
        <span className="study-step-progress">
          {index + 1} / {lesson.steps.length}
        </span>
      </div>
      <section className="study-stage study-player">
        <h1>{text(lesson.title)}</h1>
        <nav className="study-step-tabs" aria-label={s('lessonSteps')}>
          {lesson.steps.map((st, i) => (
            <button
              key={i}
              type="button"
              aria-current={index === i ? 'step' : undefined}
              onClick={() => setIndex(i)}
            >
              <span className="study-step-label">
                {i + 1}. {s(st.kind)}
              </span>
            </button>
          ))}
        </nav>
        <ActionNotice action={action} />
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
            <ChemLab offered={step.reagentIds} lessonId={id} stepIndex={index} />
          </>
        ) : (
          <>
            <p>{step.kind === 'check' ? s('ungraded') : s('quiz')}</p>
            {(step.kind === 'check' ? [step.item] : step.items).map((item) => (
              <section className="study-question" key={item.id}>
                <QuestionInput
                  item={item}
                  value={answers[item.id]}
                  onChange={(value) => setAnswers((a) => ({ ...a, [item.id]: value }))}
                />
                {step.kind === 'quiz' && (
                  <p>
                    {item.points} {s('points')}
                  </p>
                )}
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      const x = await schoolRequest<{ hint: { en: string; bn: string } }>(
                        `study/lessons/${id}/hint`,
                        { itemId: item.id, hintIndex: 0, revision: lesson.revision },
                      );
                      setHint(text(x.hint));
                    })
                  }
                >
                  {s('hint')}
                </button>
                {grades?.results
                  .filter((g) => g.itemId === item.id)
                  .map((g) => (
                    <p key={g.itemId} className={g.correct ? 'sch-result-good' : ''}>
                      {s(g.correct ? 'correct' : 'tryAgain')} {text(g.explanation)}
                    </p>
                  ))}
              </section>
            ))}
            {hint && <p role="status">{hint}</p>}
            <button
              className="sch-primary"
              disabled={action.busy}
              onClick={() =>
                void action.run(() =>
                  grade(step.kind === 'check' ? [step.item] : step.items, step.kind === 'quiz'),
                )
              }
            >
              {s(step.kind === 'quiz' ? 'submitQuiz' : 'submit')}
            </button>
            {grades && (
              <p role="status">
                {s('earned')}: {grades.pointsAwarded ?? 0}
              </p>
            )}
          </>
        )}
        <div className="study-step-nav">
          <button disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            {s('previous')}
          </button>
          {index < lesson.steps.length - 1 ? (
            <button onClick={() => setIndex((i) => i + 1)}>{s('next')}</button>
          ) : (
            <Link className="sch-action-link" href="/study">
              {s('finish')}
            </Link>
          )}
        </div>
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
      </section>
    </>
  );
}
