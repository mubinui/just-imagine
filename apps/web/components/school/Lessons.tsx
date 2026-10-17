'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CHAPTERS } from '@just-imagine/stem-content';
import { SIMS, SIM_IDS, type SimId } from '@just-imagine/stem-sims';
import { type LessonStep, type QuizItem, type QuizKey } from '@just-imagine/protocol';
import { schoolRequest, useSchoolResource, schoolHref } from '../../lib/school/api';
import type { Lesson, LessonKeys, SchoolMe, SchoolClass } from '../../lib/school/types';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { useSchoolSession } from './SchoolShell';
import {
  Field,
  ErrorNotice,
  Loading,
  useSchoolAction,
  ActionNotice,
  LanguageSwitch,
} from './shared';
import { SimView, SIM_DEFAULTS, PARAMS } from '../stem/SimView';
import {
  LessonTextAssist,
  LessonTextAssistProvider,
  lessonTextAssistCopy,
} from './LessonTextAssist';
import { invalidateTextApprovals, type LessonTextField } from '../../lib/school/text-assist';
import assistStyles from './LessonTextAssist.module.css';
import '../../app/school.css';
type Text = { en: string; bn: string };
const empty = (): Text => ({ en: '', bn: '' });
function newItem(kind: QuizItem['kind'] = 'mcq'): QuizItem {
  const base = { id: 'i_' + Math.random().toString(36).slice(2, 10), prompt: empty(), points: 2 };
  if (kind === 'numeric') return { ...base, kind, unit: '' };
  if (kind === 'simTask')
    return {
      ...base,
      kind,
      simId: 'newton-cart',
      startParams: { ...SIM_DEFAULTS['newton-cart'] },
      editableParams: ['force'],
    };
  if (kind === 'labTask') return { ...base, kind, reagentIds: ['hcl', 'naoh', 'phenolphthalein'] };
  return { ...base, kind: 'mcq', options: [empty(), empty(), empty()] };
}
function newKey(kind: QuizItem['kind']): QuizKey {
  if (kind === 'numeric') return { kind, value: 0, tolerance: { mode: 'abs', amount: 0.1 } };
  if (kind === 'simTask') return { kind, predicate: 'justMoves', args: {} };
  if (kind === 'labTask') return { kind, task: { predicate: 'pHBetween', min: 6, max: 8 } };
  return { kind: 'mcq', answer: 0 };
}
function newStep(kind: LessonStep['kind']): LessonStep {
  if (kind === 'intro') return { kind, body: empty() };
  if (kind === 'explore')
    return {
      kind,
      simId: 'newton-cart',
      params: { ...SIM_DEFAULTS['newton-cart'] },
      lockedParams: [],
      prompts: [empty()],
    };
  if (kind === 'lab')
    return { kind, reagentIds: ['hcl', 'naoh', 'phenolphthalein'], goal: empty() };
  if (kind === 'check') return { kind, item: newItem() };
  return { kind: 'quiz', items: [newItem()] };
}
function TextField({
  label,
  value,
  onChange,
  language,
  assistField,
  context = '',
  singleLine = false,
}: {
  label: string;
  value: Text;
  onChange: (v: Text) => void;
  language: 'en' | 'bn';
  assistField: LessonTextField;
  context?: string;
  singleLine?: boolean;
}) {
  return (
    <div className={assistStyles.field}>
      {singleLine ? (
        <input
          aria-label={label}
          lang={language === 'bn' ? 'bn-BD' : 'en'}
          value={value[language]}
          maxLength={4000}
          onChange={(e) => onChange({ ...value, [language]: e.target.value })}
        />
      ) : (
        <Field label={label}>
          <textarea
            lang={language === 'bn' ? 'bn-BD' : 'en'}
            value={value[language]}
            maxLength={4000}
            onChange={(e) => onChange({ ...value, [language]: e.target.value })}
          />
        </Field>
      )}
      <LessonTextAssist
        field={assistField}
        value={value}
        language={language}
        context={context}
        onChange={onChange}
      />
    </div>
  );
}
export function LessonLibrary({ admin = false }: { admin?: boolean }) {
  const { s, text } = useSchoolLanguage(),
    [subject, setSubject] = useState(''),
    [grade, setGrade] = useState(''),
    [tab, setTab] = useState('school'),
    action = useSchoolAction();
  const path = admin ? 'admin/lessons' : 'school/lessons';
  const r = useSchoolResource<{ lessons: Lesson[] }>(
    path + (tab === 'global' && !admin ? '?scope=global' : ''),
  );
  const base = admin ? '/admin/lessons' : '/school/lessons';
  return (
    <div className="sch sch-panel">
      <div className="sch-toolbar">
        <h1>{s('lessons')}</h1>
        <LanguageSwitch />
        <Link className="sch-action-link" href={schoolHref(base + '/new')}>
          {s('newLesson')}
        </Link>
      </div>
      {!admin && (
        <div className="sch-tabs">
          {['school', 'global'].map((t) => (
            <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
              {s(t === 'school' ? 'schoolLessons' : 'globalLessons')}
            </button>
          ))}
        </div>
      )}
      <div className="sch-toolbar">
        <select
          aria-label={s('subject')}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        >
          <option value="">{s('all')}</option>
          {['physics', 'chemistry', 'math'].map((v) => (
            <option key={v} value={v}>
              {s(v as 'physics')}
            </option>
          ))}
        </select>
        <select aria-label={s('grade')} value={grade} onChange={(e) => setGrade(e.target.value)}>
          <option value="">{s('all')}</option>
          <option>9</option>
          <option>10</option>
        </select>
        <button onClick={r.reload}>{s('refresh')}</button>
      </div>
      <ActionNotice action={action} />
      <ErrorNotice error={r.error} retry={r.reload} />
      {r.loading ? (
        <Loading />
      ) : (
        <div className="sch-list">
          {r.data?.lessons
            .filter(
              (l) => (!subject || l.subject === subject) && (!grade || String(l.grade) === grade),
            )
            .map((l) => (
              <article className="sch-list-row" key={l.id}>
                <div>
                  <h2>{text(l.title)}</h2>
                  <p>
                    {s(l.subject)} · {s('grade')} {l.grade} ·{' '}
                    {text(CHAPTERS.find((c) => c.id === l.chapterId)?.title)} ·{' '}
                    <span className="sch-status" data-state={l.status}>
                      {s(l.status)}
                    </span>
                  </p>
                </div>
                {l.scope === 'global' && !admin ? (
                  <button
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        const x = await schoolRequest<{ lesson: Lesson }>(
                          `school/lessons/${l.id}/copy`,
                          {},
                        );
                        window.location.href = schoolHref(base + '/' + x.lesson.id);
                      })
                    }
                  >
                    {s('copyLesson')}
                  </button>
                ) : (
                  <Link className="sch-action-link" href={schoolHref(base + '/' + l.id)}>
                    {s('edit')}
                  </Link>
                )}
              </article>
            ))}
          {r.data?.lessons.length === 0 && <p className="sch-empty">{s('empty')}</p>}
        </div>
      )}
    </div>
  );
}
export function LessonEditor({ id, admin = false }: { id: string; admin?: boolean }) {
  const { s, language, text } = useSchoolLanguage(),
    router = useRouter(),
    me = useSchoolSession() as SchoolMe | null,
    action = useSchoolAction();
  const path = admin ? 'admin/lessons' : 'school/lessons',
    r = useSchoolResource<{ lesson: Lesson; keys: LessonKeys }>(
      id === 'new' ? null : path + '/' + id,
    ),
    classes = useSchoolResource<{ classes: SchoolClass[] }>(admin ? null : 'school/classes');
  const [lesson, setLesson] = useState<Lesson>(() => ({
    id: 'new',
    scope: admin ? 'global' : 'school',
    schoolId: me?.schoolId ?? null,
    classIds: [],
    subject: 'physics',
    grade: 9,
    chapterId: 'physics-3',
    title: empty(),
    steps: [newStep('intro'), newStep('explore'), newStep('quiz')],
    status: 'draft',
    sourceLanguage: 'en',
    approved: { en: false, bn: false },
    authorUid: '',
    revision: 0,
    updatedAt: 0,
  }));
  const [keys, setKeys] = useState<LessonKeys>({ revision: 0, items: {} }),
    [editLang, setEditLang] = useState<'en' | 'bn'>('en'),
    [dirty, setDirty] = useState(false),
    [notes, setNotes] = useState(''),
    [reason, setReason] = useState('');
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active && r.data) {
        setLesson(r.data.lesson);
        setKeys(r.data.keys);
        setDirty(false);
      }
    });
    return () => {
      active = false;
    };
  }, [r.data]);
  function change(next: Lesson) {
    setLesson({ ...next, approved: { en: false, bn: false } });
    setDirty(true);
  }
  function updateStep(i: number, step: LessonStep) {
    change({ ...lesson, steps: lesson.steps.map((v, j) => (i === j ? step : v)) });
  }
  function updateItemKey(item: QuizItem, key: QuizKey) {
    setKeys((k) => ({
      ...k,
      items: { ...k.items, [item.id]: { key, hints: k.items[item.id]?.hints ?? [] } },
    }));
    setDirty(true);
  }
  async function save() {
    const body = {
      scope: lesson.scope,
      schoolId: admin ? null : (me?.schoolId ?? lesson.schoolId),
      classIds: lesson.classIds,
      subject: lesson.subject,
      grade: lesson.grade,
      chapterId: lesson.chapterId,
      title: lesson.title,
      steps: lesson.steps,
      sourceLanguage: lesson.sourceLanguage,
    };
    const allItems = lesson.steps.flatMap((st) =>
      st.kind === 'quiz' ? st.items : st.kind === 'check' ? [st.item] : [],
    );
    const filled = {
      ...keys,
      items: Object.fromEntries(
        allItems.map((i) => [i.id, keys.items[i.id] ?? { key: newKey(i.kind), hints: [] }]),
      ),
    };
    const x = await schoolRequest<{ lesson: Lesson; keys: LessonKeys }>(
      path + (id === 'new' ? '' : '/' + id),
      {
        lesson: body,
        keys: filled,
        ...(admin ? { reason } : {}),
        ...(id === 'new' ? {} : { expectedRevision: lesson.revision }),
      },
      id === 'new' ? 'POST' : 'PATCH',
    );
    setLesson(x.lesson);
    setKeys(x.keys);
    setDirty(false);
    if (id === 'new')
      router.replace(schoolHref((admin ? '/admin/lessons/' : '/school/lessons/') + x.lesson.id));
  }
  async function remote(kind: string, body: unknown) {
    if (dirty) throw new Error(s('saveFirst'));
    const x = await schoolRequest<{
      lesson?: Lesson;
      keys?: LessonKeys;
      draft?: { lesson: Lesson; keys: LessonKeys };
    }>(path + '/' + lesson.id + '/' + kind, {
      ...(typeof body === 'object' ? body : {}),
      ...(admin ? { reason } : {}),
    });
    if (x.draft) {
      setLesson({ ...x.draft.lesson, id: lesson.id });
      setKeys(x.draft.keys);
      setDirty(true);
    } else if (x.lesson) {
      setLesson(x.lesson);
      if (x.keys) setKeys(x.keys);
      setDirty(false);
    }
  }
  if (id !== 'new' && r.loading) return <Loading />;
  const aiCopy = lessonTextAssistCopy(language);
  return (
    <LessonTextAssistProvider
      value={{
        base: {
          subject: lesson.subject,
          grade: lesson.grade,
          chapterId: lesson.chapterId,
          title: lesson.title,
        },
        admin,
        reason,
        onApplied: () => {
          setLesson(invalidateTextApprovals);
          setDirty(true);
        },
      }}
    >
      <div className="sch sch-panel">
        <div className="sch-toolbar">
          <h1>{s(id === 'new' ? 'newLesson' : 'edit')}</h1>
          <Link href={admin ? '/admin/lessons' : '/school/lessons'}>{s('lessons')}</Link>
        </div>
        <ErrorNotice error={r.error} retry={r.reload} />
        <ActionNotice action={action} />
        {admin && (
          <Field label={s('reason')}>
            <input
              value={reason}
              minLength={3}
              required
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
        )}
        <details className={assistStyles.wholeTools}>
          <summary>{aiCopy.wholeTitle}</summary>
          <p>{aiCopy.wholeHelp}</p>
          <Field label={s('notes')}>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {(id === 'new' || dirty) && <p>{aiCopy.wholeSave}</p>}
          <div className="sch-toolbar">
            <button
              type="button"
              disabled={id === 'new' || action.busy || dirty}
              onClick={() =>
                void action.run(
                  () => remote('draft', { notes, sourceLanguage: lesson.sourceLanguage }),
                  s('reviewDraft'),
                )
              }
            >
              {s('draftAi')}
            </button>
            <button
              type="button"
              disabled={id === 'new' || action.busy || dirty}
              onClick={() =>
                void action.run(
                  () => remote('translate', { targetLanguage: editLang === 'en' ? 'bn' : 'en' }),
                  s('reviewDraft'),
                )
              }
            >
              {s('translate')}
            </button>
          </div>
        </details>
        <div className="sch-tabs sch-editor-tabs">
          {(['en', 'bn'] as const).map((lang) => (
            <button key={lang} aria-pressed={editLang === lang} onClick={() => setEditLang(lang)}>
              {lang === 'bn' ? 'বাংলা' : 'English'} {lesson.approved[lang] ? '✓' : ''}
            </button>
          ))}
          <button
            className="sch-primary"
            disabled={action.busy}
            onClick={() => void action.run(save, s('saved'))}
          >
            {s('save')}
            {dirty ? ' *' : ''}
          </button>
        </div>
        <div className="sch-grid">
          <TextField
            assistField="title"
            label={s('title')}
            value={lesson.title}
            onChange={(title) => change({ ...lesson, title })}
            language={editLang}
          />
          <div className="sch-form">
            <Field label={s('subject')}>
              <select
                value={lesson.subject}
                onChange={(e) => {
                  const subject = e.target.value as Lesson['subject'];
                  change({
                    ...lesson,
                    subject,
                    chapterId: CHAPTERS.find((c) => c.subject === subject)!.id,
                  });
                }}
              >
                {['physics', 'chemistry', 'math'].map((v) => (
                  <option key={v} value={v}>
                    {s(v as 'physics')}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={s('grade')}>
              <select
                value={lesson.grade}
                onChange={(e) => change({ ...lesson, grade: Number(e.target.value) as 9 | 10 })}
              >
                <option>9</option>
                <option>10</option>
              </select>
            </Field>
            <Field label={s('chapter')}>
              <select
                value={lesson.chapterId}
                onChange={(e) => change({ ...lesson, chapterId: e.target.value })}
              >
                {CHAPTERS.filter((c) => c.subject === lesson.subject).map((c) => (
                  <option key={c.id} value={c.id}>
                    {text(c.title)} ({c.book})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={s('sourceLanguage')}>
              <select
                value={lesson.sourceLanguage}
                onChange={(e) =>
                  change({ ...lesson, sourceLanguage: e.target.value as 'en' | 'bn' })
                }
              >
                <option value="en">English</option>
                <option value="bn">বাংলা</option>
              </select>
            </Field>
          </div>
        </div>
        <h2>{s('steps')}</h2>
        {lesson.steps.map((step, index) => (
          <section className="sch-step" key={index}>
            <div className="sch-toolbar">
              <h2>
                {index + 1}. {s(step.kind)}
              </h2>
              <button
                disabled={index === 0}
                aria-label={s('moveUp')}
                onClick={() => {
                  const steps = [...lesson.steps];
                  [steps[index - 1], steps[index]] = [steps[index]!, steps[index - 1]!];
                  change({ ...lesson, steps });
                }}
              >
                ↑
              </button>
              <button
                disabled={index === lesson.steps.length - 1}
                aria-label={s('moveDown')}
                onClick={() => {
                  const steps = [...lesson.steps];
                  [steps[index], steps[index + 1]] = [steps[index + 1]!, steps[index]!];
                  change({ ...lesson, steps });
                }}
              >
                ↓
              </button>
              <button
                disabled={lesson.steps.length <= 1}
                onClick={() =>
                  change({ ...lesson, steps: lesson.steps.filter((_, i) => i !== index) })
                }
              >
                {s('delete')}
              </button>
            </div>
            {step.kind === 'intro' ? (
              <TextField
                assistField="explanation"
                context={JSON.stringify({ stepIndex: index, step })}
                label={s('body')}
                value={step.body}
                onChange={(body) => updateStep(index, { ...step, body })}
                language={editLang}
              />
            ) : step.kind === 'explore' ? (
              <>
                <Field label={s('explore')}>
                  <select
                    value={step.simId}
                    onChange={(e) =>
                      updateStep(index, {
                        ...step,
                        simId: e.target.value,
                        params: { ...SIM_DEFAULTS[e.target.value as SimId] },
                        lockedParams: [],
                      })
                    }
                  >
                    {SIM_IDS.map((sim) => (
                      <option key={sim}>{sim}</option>
                    ))}
                  </select>
                </Field>
                <SimView
                  id={step.simId as SimId}
                  value={step.params}
                  onChange={(params) => updateStep(index, { ...step, params })}
                />
                <div className="sch-checks">
                  {[
                    ...PARAMS[step.simId as SimId].map((p) => p.id),
                    ...(step.simId === 'ohms-circuit' ? ['topology', 'resistors'] : []),
                  ].map((key) => (
                    <label key={key}>
                      <input
                        type="checkbox"
                        checked={step.lockedParams.includes(key)}
                        onChange={(e) =>
                          updateStep(index, {
                            ...step,
                            lockedParams: e.target.checked
                              ? [...step.lockedParams, key]
                              : step.lockedParams.filter((k) => k !== key),
                          })
                        }
                      />
                      {s('locked')}: {key}
                    </label>
                  ))}
                </div>
                {step.prompts.map((prompt, i) => (
                  <TextField
                    key={i}
                    assistField="instruction"
                    context={JSON.stringify({ stepIndex: index, promptIndex: i, step })}
                    label={s('prompts')}
                    value={prompt}
                    language={editLang}
                    onChange={(v) =>
                      updateStep(index, {
                        ...step,
                        prompts: step.prompts.map((p, j) => (i === j ? v : p)),
                      })
                    }
                  />
                ))}
                <button
                  disabled={step.prompts.length >= 6}
                  onClick={() =>
                    updateStep(index, { ...step, prompts: [...step.prompts, empty()] })
                  }
                >
                  + {s('prompts')}
                </button>
              </>
            ) : step.kind === 'lab' ? (
              <>
                <TextField
                  assistField="goal"
                  context={JSON.stringify({ stepIndex: index, step })}
                  label={s('body')}
                  value={step.goal ?? empty()}
                  onChange={(goal) => updateStep(index, { ...step, goal })}
                  language={editLang}
                />
                <Field label={s('chooseReagents')}>
                  <input
                    value={step.reagentIds.join(', ')}
                    onChange={(e) =>
                      updateStep(index, {
                        ...step,
                        reagentIds: e.target.value
                          .split(',')
                          .map((v) => v.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </Field>
              </>
            ) : (
              <>
                {(step.kind === 'check' ? [step.item] : step.items).map((item, i) => (
                  <QuestionEditor
                    key={item.id}
                    item={item}
                    itemKey={keys.items[item.id]?.key ?? newKey(item.kind)}
                    hints={keys.items[item.id]?.hints ?? []}
                    language={editLang}
                    onItem={(next) => {
                      if (next.kind !== item.kind) updateItemKey(next, newKey(next.kind));
                      if (step.kind === 'check') updateStep(index, { ...step, item: next });
                      else
                        updateStep(index, {
                          ...step,
                          items: step.items.map((v, j) => (i === j ? next : v)),
                        });
                    }}
                    onKey={(key) => updateItemKey(item, key)}
                    onHints={(hints) => {
                      setKeys((k) => ({
                        ...k,
                        items: {
                          ...k.items,
                          [item.id]: { key: k.items[item.id]?.key ?? newKey(item.kind), hints },
                        },
                      }));
                      setDirty(true);
                    }}
                  />
                ))}
                {step.kind === 'quiz' && (
                  <button
                    disabled={step.items.length >= 10}
                    onClick={() =>
                      updateStep(index, { ...step, items: [...step.items, newItem()] })
                    }
                  >
                    + {s('question')}
                  </button>
                )}
              </>
            )}
          </section>
        ))}
        <div className="sch-toolbar">
          {(['intro', 'explore', 'check', 'quiz', 'lab'] as const).map((kind) => (
            <button
              key={kind}
              disabled={lesson.steps.length >= 20}
              onClick={() => change({ ...lesson, steps: [...lesson.steps, newStep(kind)] })}
            >
              + {s(kind)}
            </button>
          ))}
        </div>
        {id !== 'new' && (
          <>
            <section className="sch-section">
              <div className="sch-toolbar">
                <button
                  disabled={action.busy || dirty || lesson.approved[editLang]}
                  onClick={() =>
                    void action.run(
                      () =>
                        remote('approve', {
                          language: editLang,
                          expectedRevision: lesson.revision,
                        }),
                      s('saved'),
                    )
                  }
                >
                  {s('approve')} · {editLang}
                </button>
              </div>
            </section>
            {!admin && (
              <section className="sch-section">
                <Field label={s('scope')}>
                  <select
                    value={lesson.scope}
                    onChange={(e) =>
                      change({
                        ...lesson,
                        scope: e.target.value as 'school' | 'class',
                        classIds: e.target.value === 'school' ? [] : lesson.classIds,
                      })
                    }
                  >
                    <option value="school">{s('wholeSchool')}</option>
                    <option value="class">{s('chosenClasses')}</option>
                  </select>
                </Field>
                {lesson.scope === 'class' && (
                  <div className="sch-checks">
                    {classes.data?.classes.map((c) => (
                      <label key={c.id}>
                        <input
                          type="checkbox"
                          checked={lesson.classIds.includes(c.id)}
                          onChange={(e) =>
                            change({
                              ...lesson,
                              classIds: e.target.checked
                                ? [...lesson.classIds, c.id]
                                : lesson.classIds.filter((v) => v !== c.id),
                            })
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                )}
              </section>
            )}
            <div className="sch-toolbar">
              <span>
                {s(lesson.approved.en ? 'approved' : 'draft')}: English ·{' '}
                {s(lesson.approved.bn ? 'approved' : 'draft')}: বাংলা
              </span>
              <button
                className="sch-primary"
                disabled={dirty || action.busy || !lesson.approved.en || !lesson.approved.bn}
                onClick={() =>
                  void action.run(
                    () => remote('publish', { expectedRevision: lesson.revision }),
                    s('published'),
                  )
                }
              >
                {s('publish')}
              </button>
              <button
                disabled={dirty || action.busy}
                onClick={() =>
                  void action.run(
                    () => remote('archive', { expectedRevision: lesson.revision }),
                    s('archived'),
                  )
                }
              >
                {s('archiveLesson')}
              </button>
            </div>
          </>
        )}
      </div>
    </LessonTextAssistProvider>
  );
}
function QuestionEditor({
  item,
  itemKey,
  hints,
  language,
  onItem,
  onKey,
  onHints,
}: {
  item: QuizItem;
  itemKey: QuizKey;
  hints: Text[];
  language: 'en' | 'bn';
  onItem: (v: QuizItem) => void;
  onKey: (v: QuizKey) => void;
  onHints: (v: Text[]) => void;
}) {
  const { s } = useSchoolLanguage();
  const predicate = itemKey.kind === 'simTask' ? itemKey.predicate : '';
  return (
    <section className="sch-section">
      <div className="sch-grid">
        <Field label={s('question')}>
          <select
            value={item.kind}
            onChange={(e) =>
              onItem({
                ...newItem(e.target.value as QuizItem['kind']),
                id: item.id,
                prompt: item.prompt,
                points: item.points,
              })
            }
          >
            {(['mcq', 'numeric', 'simTask', 'labTask'] as const).map((k) => (
              <option value={k} key={k}>
                {s(k)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={s('points')}>
          <input
            type="number"
            min="1"
            max="10"
            value={item.points}
            onChange={(e) => onItem({ ...item, points: Number(e.target.value) })}
          />
        </Field>
      </div>
      <TextField
        assistField="question"
        context={JSON.stringify({ item, itemKey })}
        label={s('question')}
        value={item.prompt}
        language={language}
        onChange={(prompt) => onItem({ ...item, prompt })}
      />
      {item.kind === 'mcq' && itemKey.kind === 'mcq' && (
        <>
          {item.options.map((option, i) => (
            <div className={'sch-option ' + assistStyles.choice} key={i}>
              <input
                type="radio"
                aria-label={s('correct') + ' ' + (i + 1)}
                checked={itemKey.answer === i}
                onChange={() => onKey({ kind: 'mcq', answer: i })}
              />
              <TextField
                singleLine
                assistField="option"
                label={s('options') + ' ' + (i + 1)}
                value={option}
                language={language}
                context={JSON.stringify({ item, itemKey, optionIndex: i })}
                onChange={(next) =>
                  onItem({
                    ...item,
                    options: item.options.map((v, j) => (i === j ? next : v)),
                  })
                }
              />
              <button
                disabled={item.options.length <= 2}
                onClick={() => {
                  onItem({ ...item, options: item.options.filter((_, j) => j !== i) });
                  onKey({
                    ...itemKey,
                    answer:
                      itemKey.answer === i
                        ? 0
                        : itemKey.answer > i
                          ? itemKey.answer - 1
                          : itemKey.answer,
                  });
                }}
              >
                {s('delete')}
              </button>
            </div>
          ))}
          <button
            disabled={item.options.length >= 5}
            onClick={() => onItem({ ...item, options: [...item.options, empty()] })}
          >
            + {s('options')}
          </button>
        </>
      )}
      {item.kind === 'numeric' && itemKey.kind === 'numeric' && (
        <div className="sch-grid">
          <Field label={s('unit')}>
            <input value={item.unit} onChange={(e) => onItem({ ...item, unit: e.target.value })} />
          </Field>
          <Field label={s('answer')}>
            <input
              type="number"
              value={itemKey.value}
              onChange={(e) => onKey({ ...itemKey, value: Number(e.target.value) })}
            />
          </Field>
          <Field label={s('tolerance')}>
            <input
              type="number"
              min="0"
              step="any"
              value={itemKey.tolerance.amount}
              onChange={(e) =>
                onKey({
                  ...itemKey,
                  tolerance: { ...itemKey.tolerance, amount: Number(e.target.value) },
                })
              }
            />
            <select
              value={itemKey.tolerance.mode}
              onChange={(e) =>
                onKey({
                  ...itemKey,
                  tolerance: { ...itemKey.tolerance, mode: e.target.value as 'abs' | 'rel' },
                })
              }
            >
              <option value="abs">±</option>
              <option value="rel">%</option>
            </select>
          </Field>
        </div>
      )}
      {item.kind === 'simTask' && itemKey.kind === 'simTask' && (
        <>
          <select
            aria-label={s('explore')}
            value={item.simId}
            onChange={(e) => {
              onItem({
                ...item,
                simId: e.target.value,
                startParams: { ...SIM_DEFAULTS[e.target.value as SimId] },
                editableParams: PARAMS[e.target.value as SimId].map((p) => p.id),
              });
              onKey({
                kind: 'simTask',
                predicate: Object.keys(SIMS[e.target.value as SimId].predicates)[0]!,
                args: defaultArgs(Object.keys(SIMS[e.target.value as SimId].predicates)[0]!),
              });
            }}
          >
            {SIM_IDS.map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
          <SimView
            id={item.simId as SimId}
            value={item.startParams}
            onChange={(startParams) => onItem({ ...item, startParams })}
          />
          <div className="sch-checks">
            {Object.keys(item.startParams).map((key) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={item.editableParams.includes(key)}
                  onChange={(e) =>
                    onItem({
                      ...item,
                      editableParams: e.target.checked
                        ? [...item.editableParams, key]
                        : item.editableParams.filter((v) => v !== key),
                    })
                  }
                />
                {key}
              </label>
            ))}
          </div>
          <Field label={s('predicate')}>
            <select
              value={predicate}
              onChange={(e) =>
                onKey({ ...itemKey, predicate: e.target.value, args: defaultArgs(e.target.value) })
              }
            >
              {Object.keys(SIMS[item.simId as SimId].predicates).map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </Field>
          <JsonTarget value={itemKey.args} onChange={(args) => onKey({ ...itemKey, args })} />
        </>
      )}
      {item.kind === 'labTask' && itemKey.kind === 'labTask' && (
        <>
          <Field label={s('chooseReagents')}>
            <input
              value={item.reagentIds.join(', ')}
              onChange={(e) =>
                onItem({
                  ...item,
                  reagentIds: e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter(Boolean),
                })
              }
            />
          </Field>
          <Field label={s('predicate')}>
            <select
              value={String((itemKey.task as Record<string, unknown>)?.predicate ?? 'pHBetween')}
              onChange={(e) => {
                const task: Record<string, unknown> =
                  e.target.value === 'pHBetween'
                    ? { predicate: 'pHBetween', min: 6, max: 8 }
                    : e.target.value === 'solutionColour'
                      ? { predicate: 'solutionColour', colour: '#e85d9b' }
                      : e.target.value === 'producedGas'
                        ? { predicate: 'producedGas', gas: 'H2' }
                        : { predicate: 'formedPrecipitate', formula: 'AgCl' };
                onKey({ ...itemKey, task });
              }}
            >
              {['pHBetween', 'solutionColour', 'producedGas', 'formedPrecipitate'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <JsonTarget value={itemKey.task} onChange={(task) => onKey({ ...itemKey, task })} />
        </>
      )}
      {hints.map((h, i) => (
        <TextField
          assistField="hint"
          context={JSON.stringify({ item, itemKey, hintIndex: i })}
          label={s('hints')}
          key={i}
          value={h}
          language={language}
          onChange={(next) => onHints(hints.map((v, j) => (i === j ? next : v)))}
        />
      ))}
      <button disabled={hints.length >= 2} onClick={() => onHints([...hints, empty()])}>
        + {s('hints')}
      </button>
    </section>
  );
}
function defaultArgs(predicate: string): Record<string, unknown> {
  const args: Record<string, Record<string, unknown>> = {
    lineThrough: {
      points: [
        { x: 0, y: 0 },
        { x: 1, y: 1 },
      ],
      tol: 0.1,
    },
    stopsAt: { x: 10, tol: 0.1 },
    reachesSpeed: { v: 5, tol: 0.1 },
    displacementEquals: { x: 10, tol: 0.1 },
    justMoves: {},
    accelerationEquals: { a: 1, tol: 0.1 },
    currentEquals: { i: 0.5, tol: 0.01 },
    powerAtLeast: { index: 0, p: 1 },
    slopeEquals: { m: 1, tol: 0.1 },
    interceptEquals: { c: 0, tol: 0.1 },
    angleWithin: { min: 30, max: 60 },
    sinEquals: { v: 0.5, tol: 0.01 },
    cosEquals: { v: 0.5, tol: 0.01 },
  };
  return args[predicate] ?? {};
}
function JsonTarget({ value, onChange }: { value: unknown; onChange: (v: unknown) => void }) {
  const { s } = useSchoolLanguage();
  const record =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  return (
    <div className="sch-grid">
      {Object.entries(record)
        .filter(([key]) => key !== 'predicate')
        .map(([key, v]) => (
          <Field key={key} label={key === 'predicate' ? s('predicate') : key}>
            <input
              type={typeof v === 'number' ? 'number' : 'text'}
              step="any"
              value={typeof v === 'object' ? JSON.stringify(v) : String(v)}
              onChange={(e) => {
                let next: unknown = e.target.value;
                if (typeof v === 'number') next = Number(next);
                else if (typeof v === 'object') {
                  try {
                    next = JSON.parse(String(next));
                  } catch {
                    return;
                  }
                }
                onChange({ ...record, [key]: next });
              }}
            />
          </Field>
        ))}
    </div>
  );
}
