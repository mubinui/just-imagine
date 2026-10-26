'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CHAPTERS, REAGENTS } from '@just-imagine/stem-content';
import { SIMS, SIM_IDS, type SimId } from '@just-imagine/stem-sims';
import { defaultTaskArgs } from '../../lib/stem/task-args';
import {
  lessonPublicationChecks,
  type LessonStep,
  type QuizItem,
  type QuizKey,
} from '@just-imagine/protocol';
import { schoolRequest, useSchoolResource, schoolHref } from '../../lib/school/api';
import type { Lesson, LessonKeys, SchoolMe, SchoolClass } from '../../lib/school/types';
import { useConsoleCopy, type ConsoleString } from '../../lib/school/console-copy';
import {
  chapterGroups,
  copiedLessonIds,
  lessonDraftIssues,
  parseJsonDraft,
  publishBlockers,
  rememberNotice,
  takeNotice,
  type DraftIssue,
} from '../../lib/school/console';
import {
  LAB_PREDICATES,
  argLabel,
  paramLabel,
  predicateLabel,
  simLabel,
} from '../../lib/school/authoring-labels';
import { useSchoolSession } from './SchoolShell';
import {
  Field,
  ErrorNotice,
  Loading,
  EmptyState,
  useSchoolAction,
  ActionNotice,
  SchoolAudienceProvider,
} from './shared';
import { SimView, SIM_DEFAULTS, PARAMS } from '../stem/SimView';
import {
  LessonTextAssist,
  LessonTextAssistProvider,
  lessonTextAssistCopy,
} from './LessonTextAssist';
import { invalidateTextApprovals, type LessonTextField } from '../../lib/school/text-assist';
import { acceptLabProposal } from '../../lib/school/lab-generation';
import { LabGenerator } from './LabGenerator';
import assistStyles from './LessonTextAssist.module.css';
import { LessonQuality } from './LessonQuality';
import { UiIcon } from '../UiIcon';
import '../../app/school.css';

type Text = { en: string; bn: string };
type Lang = 'en' | 'bn';
const empty = (): Text => ({ en: '', bn: '' });
const LANGUAGE_NAME: Record<Lang, string> = { en: 'English', bn: 'বাংলা' };
const chapterOf = (id: string) => CHAPTERS.find((c) => c.id === id);
const simsOf = (chapterId: string): SimId[] =>
  (chapterOf(chapterId)?.sims ?? []).filter((id): id is SimId => SIM_IDS.includes(id as SimId));
const firstPredicate = (simId: string) => Object.keys(SIMS[simId as SimId].predicates)[0]!;

function newItem(kind: QuizItem['kind'] = 'mcq', simId: SimId = 'newton-cart'): QuizItem {
  const base = { id: 'i_' + Math.random().toString(36).slice(2, 10), prompt: empty(), points: 2 };
  if (kind === 'numeric') return { ...base, kind, unit: '' };
  if (kind === 'simTask')
    return {
      ...base,
      kind,
      simId,
      startParams: { ...SIM_DEFAULTS[simId] },
      editableParams: [PARAMS[simId][0]!.id],
    };
  if (kind === 'labTask') return { ...base, kind, reagentIds: ['hcl', 'naoh', 'phenolphthalein'] };
  return { ...base, kind: 'mcq', options: [empty(), empty(), empty()] };
}
function newKey(item: Pick<QuizItem, 'kind'> & { simId?: string }): QuizKey {
  if (item.kind === 'numeric')
    return { kind: 'numeric', value: 0, tolerance: { mode: 'abs', amount: 0.1 } };
  if (item.kind === 'simTask') {
    const simId = item.simId ?? 'newton-cart';
    const predicate = firstPredicate(simId);
    return { kind: 'simTask', predicate, args: defaultTaskArgs(simId, predicate) };
  }
  if (item.kind === 'labTask')
    return { kind: 'labTask', task: { predicate: 'pHBetween', min: 6, max: 8 } };
  return { kind: 'mcq', answer: 0 };
}
function newStep(kind: LessonStep['kind'], chapterId: string): LessonStep {
  const sim = simsOf(chapterId)[0] ?? 'newton-cart';
  if (kind === 'intro') return { kind, body: empty() };
  if (kind === 'explore')
    return {
      kind,
      simId: sim,
      params: { ...SIM_DEFAULTS[sim] },
      lockedParams: [],
      prompts: [empty()],
    };
  if (kind === 'lab')
    return { kind, reagentIds: ['hcl', 'naoh', 'phenolphthalein'], goal: empty() };
  if (kind === 'check') return { kind, item: newItem() };
  return { kind: 'quiz', items: [newItem()] };
}
const fieldId = (field: string) => 'lesson-field-' + field;

/** Text areas grow with their content, so nothing a teacher writes is cropped. */
function AutoTextarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string },
) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 2 + 'px';
  }, [props.value]);
  return <textarea ref={ref} rows={2} {...props} />;
}

function TextField({
  label,
  value,
  onChange,
  language,
  assistField,
  context = '',
  singleLine = false,
  id,
}: {
  label: string;
  value: Text;
  onChange: (v: Text) => void;
  language: Lang;
  assistField: LessonTextField;
  context?: string;
  singleLine?: boolean;
  id?: string;
}) {
  const lang = language === 'bn' ? 'bn-BD' : 'en';
  return (
    <div className={assistStyles.field}>
      <Field label={label}>
        {singleLine ? (
          <input
            id={id}
            lang={lang}
            value={value[language]}
            maxLength={4000}
            onChange={(e) => onChange({ ...value, [language]: e.target.value })}
          />
        ) : (
          <AutoTextarea
            id={id}
            lang={lang}
            value={value[language]}
            maxLength={4000}
            onChange={(e) => onChange({ ...value, [language]: e.target.value })}
          />
        )}
      </Field>
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

/** Keeps the typed text (including "-" or "0.") and commits only finite numbers. */
function NumberField({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  id?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const [synced, setSynced] = useState(value);
  // An outside change (AI draft, kind switch) replaces the text unless the teacher is typing.
  if (!focused && value !== synced) {
    setSynced(value);
    setDraft(String(value));
  }
  return (
    <Field label={label}>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={draft}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setDraft(String(value));
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          const next = Number(e.target.value.replace('−', '-'));
          if (e.target.value.trim() && Number.isFinite(next)) {
            setSynced(next);
            onChange(next);
          }
        }}
      />
    </Field>
  );
}

/** Object and list values stay as raw text while typed and are stored once they parse. */
function JsonField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const { c } = useConsoleCopy();
  const serialized = JSON.stringify(value);
  const [draft, setDraft] = useState(serialized);
  const [synced, setSynced] = useState(serialized);
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);
  if (!focused && serialized !== synced) {
    setSynced(serialized);
    setDraft(serialized);
  }
  return (
    <Field label={label} error={invalid ? c('jsonInvalid') : ''}>
      <AutoTextarea
        className="sch-json"
        value={draft}
        spellCheck={false}
        aria-invalid={invalid}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setInvalid(!parseJsonDraft(draft).ok);
        }}
        onChange={(e) => {
          setDraft(e.target.value);
          const parsed = parseJsonDraft(e.target.value);
          if (parsed.ok) {
            setInvalid(false);
            setSynced(JSON.stringify(parsed.value));
            onChange(parsed.value);
          }
        }}
      />
    </Field>
  );
}

function TargetFields({
  value,
  onChange,
  label,
}: {
  value: unknown;
  onChange: (v: Record<string, unknown>) => void;
  label: (key: string) => string;
}) {
  const record =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const entries = Object.entries(record).filter(([key]) => key !== 'predicate');
  if (!entries.length) return null;
  return (
    <div className="sch-grid">
      {entries.map(([key, v]) =>
        typeof v === 'boolean' ? (
          <label className="sch-option" key={key}>
            <input
              type="checkbox"
              checked={v}
              onChange={(e) => onChange({ ...record, [key]: e.target.checked })}
            />
            {label(key)}
          </label>
        ) : typeof v === 'number' ? (
          <NumberField
            key={key}
            label={label(key)}
            value={v}
            onChange={(next) => onChange({ ...record, [key]: next })}
          />
        ) : typeof v === 'object' && v !== null ? (
          <JsonField
            key={key}
            label={label(key)}
            value={v}
            onChange={(next) => onChange({ ...record, [key]: next })}
          />
        ) : (
          <Field key={key} label={label(key)}>
            <input
              value={String(v ?? '')}
              onChange={(e) => onChange({ ...record, [key]: e.target.value })}
            />
          </Field>
        ),
      )}
    </div>
  );
}

function ReagentPicker({
  value,
  onChange,
  legend,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  legend: string;
}) {
  const { language } = useConsoleCopy();
  return (
    <fieldset className="sch-fieldset">
      <legend>{legend}</legend>
      <div className="sch-checks sch-reagents">
        {REAGENTS.map((r) => (
          <label key={r.id}>
            <input
              type="checkbox"
              checked={value.includes(r.id)}
              disabled={!value.includes(r.id) && value.length >= 12}
              onChange={(e) =>
                onChange(e.target.checked ? [...value, r.id] : value.filter((id) => id !== r.id))
              }
            />
            <span>
              {r.name[language]} <small>{r.formula}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SimSelect({
  value,
  chapterId,
  onChange,
  id,
}: {
  value: string;
  chapterId: string;
  onChange: (simId: SimId) => void;
  id?: string;
}) {
  const { c, language } = useConsoleCopy();
  const sims = simsOf(chapterId);
  const options = sims.includes(value as SimId) ? sims : [...sims, value as SimId];
  return (
    <Field
      label={c('simulation')}
      error={
        sims.includes(value as SimId) ? '' : sims.length ? c('issueSimChapter') : c('noChapterSim')
      }
    >
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as SimId)}>
        {options.map((sim) => (
          <option key={sim} value={sim}>
            {simLabel(sim, language)}
          </option>
        ))}
      </select>
    </Field>
  );
}

// ---------- library ----------

export function LessonLibrary({ admin = false }: { admin?: boolean }) {
  const { s, text, c, n } = useConsoleCopy(),
    router = useRouter(),
    [subject, setSubject] = useState(''),
    [grade, setGrade] = useState(''),
    [tab, setTab] = useState<'school' | 'global'>('school'),
    action = useSchoolAction();
  const path = admin ? 'admin/lessons' : 'school/lessons';
  const school = useSchoolResource<{ lessons: Lesson[] }>(path);
  const shared = useSchoolResource<{ lessons: Lesson[] }>(
    admin ? null : 'school/lessons?scope=global',
  );
  const base = admin ? '/admin/lessons' : '/school/lessons';
  const current = tab === 'global' && !admin ? shared : school;
  const copies = copiedLessonIds(school.data?.lessons ?? [], shared.data?.lessons ?? []);
  const lessons = (current.data?.lessons ?? [])
    .filter((l) => (!subject || l.subject === subject) && (!grade || String(l.grade) === grade))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const body = (
    <>
      <header className="sch-page-head">
        <div>
          <h1>{s('lessons')}</h1>
          <p className="sch-lead">{c('lessonsLead')}</p>
        </div>
        <div className="sch-page-actions">
          <Link className="sch-action-link" href={schoolHref(base + '/new')}>
            <UiIcon name="write" />
            {s('newLesson')}
          </Link>
        </div>
      </header>
      {!admin && (
        <div className="sch-tabs" role="group" aria-label={s('lessons')}>
          {(['school', 'global'] as const).map((t) => (
            <button key={t} type="button" aria-pressed={tab === t} onClick={() => setTab(t)}>
              {t === 'school' ? s('schoolLessons') : c('sharedLessonsTab')}
              {(t === 'school' ? school : shared).data && (
                <span className="sch-count">
                  {n((t === 'school' ? school : shared).data!.lessons.length)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      <div className="sch-filter-bar">
        <Field label={s('subject')}>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">{s('all')}</option>
            {(['physics', 'chemistry', 'math'] as const).map((v) => (
              <option key={v} value={v}>
                {s(v)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={s('grade')}>
          <select value={grade} onChange={(e) => setGrade(e.target.value)}>
            <option value="">{s('all')}</option>
            <option value="9">{n(9)}</option>
            <option value="10">{n(10)}</option>
          </select>
        </Field>
      </div>
      <ActionNotice action={action} toast />
      <ErrorNotice error={current.error} retry={current.reload} />
      {current.loading && !current.data ? (
        <Loading rows={4} />
      ) : !current.data?.lessons.length ? (
        tab === 'global' ? (
          <EmptyState title={c('noSharedLessons')} />
        ) : (
          <EmptyState
            title={c('noSchoolLessons')}
            body={c('noSchoolLessonsBody')}
            action={
              <Link className="sch-action-link" href={schoolHref(base + '/new')}>
                {s('newLesson')}
              </Link>
            }
          />
        )
      ) : !lessons.length ? (
        <EmptyState title={c('noFilterMatches')} />
      ) : (
        <ul className="sch-lesson-list">
          {lessons.map((l) => {
            const copyId = copies.get(l.id);
            return (
              <li className="sch-lesson-row" key={l.id}>
                <div>
                  <h2>{text(l.title) || c('untitled')}</h2>
                  <p>
                    {s(l.subject)} · {c('gradeN', { grade: l.grade })} ·{' '}
                    {text(chapterOf(l.chapterId)?.title)}
                  </p>
                  <p className="sch-chip-row">
                    <span className="sch-status" data-state={l.status}>
                      {s(l.status)}
                    </span>
                    {l.scope !== 'global' &&
                      l.status !== 'published' &&
                      (['en', 'bn'] as const).map((lang) => (
                        <span
                          key={lang}
                          className="sch-status"
                          data-state={l.approved[lang] ? 'approved' : 'draft'}
                          title={
                            l.approved[lang]
                              ? c('approvedLanguage', { language: LANGUAGE_NAME[lang] })
                              : c('approveLanguage', { language: LANGUAGE_NAME[lang] })
                          }
                        >
                          {l.approved[lang] && <UiIcon name="check" />}
                          {lang === 'en' ? 'EN' : 'বাং'}
                        </span>
                      ))}
                    {copyId && (
                      <span className="sch-status" data-state="approved">
                        {c('copied')}
                      </span>
                    )}
                  </p>
                </div>
                {l.scope === 'global' && !admin ? (
                  copyId ? (
                    <Link className="sch-button-link" href={schoolHref(base + '/' + copyId)}>
                      {c('openCopy')}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(async () => {
                          const x = await schoolRequest<{ lesson: Lesson }>(
                            `school/lessons/${l.id}/copy`,
                            {},
                          );
                          rememberNotice('lesson:' + x.lesson.id, c('copiedNotice'));
                          school.reload();
                          router.push(schoolHref(base + '/' + x.lesson.id));
                        })
                      }
                    >
                      {s('copyLesson')}
                    </button>
                  )
                ) : (
                  <Link className="sch-button-link" href={schoolHref(base + '/' + l.id)}>
                    {s('edit')}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
  return admin ? (
    <SchoolAudienceProvider audience="teacher">
      <div className="sch sch-panel">{body}</div>
    </SchoolAudienceProvider>
  ) : (
    body
  );
}

// ---------- editor ----------

const BLOCKER_COPY: Record<ReturnType<typeof publishBlockers>[number], ConsoleString> = {
  new: 'blockerNew',
  unsaved: 'blockerUnsaved',
  published: 'blockerPublished',
  archived: 'blockerArchived',
  checks: 'blockerChecks',
  approveEn: 'blockerApproveEn',
  approveBn: 'blockerApproveBn',
};
const ISSUE_COPY: Record<DraftIssue['code'], ConsoleString> = {
  title: 'issueTitle',
  simChapter: 'issueSimChapter',
  labChapter: 'issueLabChapter',
  points: 'issuePoints',
  options: 'issueOptions',
  number: 'issuePoints',
};

export function LessonEditor({ id, admin = false }: { id: string; admin?: boolean }) {
  const { s, language, text, c, n } = useConsoleCopy(),
    router = useRouter(),
    me = useSchoolSession() as SchoolMe | null,
    action = useSchoolAction();
  const path = admin ? 'admin/lessons' : 'school/lessons',
    r = useSchoolResource<{ lesson: Lesson; keys: LessonKeys }>(
      id === 'new' ? null : path + '/' + id,
    ),
    classes = useSchoolResource<{ classes: SchoolClass[] }>(admin ? null : 'school/classes');
  const isNew = id === 'new';
  const [lesson, setLesson] = useState<Lesson>(() => ({
    id: 'new',
    scope: admin ? 'global' : 'school',
    schoolId: me?.schoolId ?? null,
    classIds: [],
    subject: 'physics',
    grade: 9,
    chapterId: 'physics-3',
    title: empty(),
    steps: [
      newStep('intro', 'physics-3'),
      newStep('explore', 'physics-3'),
      newStep('quiz', 'physics-3'),
    ],
    status: 'draft',
    sourceLanguage: 'en',
    approved: { en: false, bn: false },
    authorUid: '',
    revision: 0,
    updatedAt: 0,
  }));
  const [keys, setKeys] = useState<LessonKeys>({ revision: 0, items: {} }),
    [editLang, setEditLang] = useState<Lang>(language),
    [dirty, setDirty] = useState(false),
    [notes, setNotes] = useState(''),
    [reason, setReason] = useState(''),
    [collapsed, setCollapsed] = useState<Set<number>>(new Set()),
    [aiTask, setAiTask] = useState<{ kind: 'draft' | 'translate'; started: number } | null>(null),
    [now, setNow] = useState(0),
    [busyLabel, setBusyLabel] = useState('');
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
  // A confirmation written before router.replace remounted this page.
  useEffect(() => {
    if (isNew) return;
    const flash = takeNotice('lesson:' + id);
    if (flash) action.setNotice(flash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  useEffect(() => {
    if (!aiTask) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [aiTask]);
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
  function focusIssue(issue: DraftIssue) {
    const stepIndex = issue.field.startsWith('step-')
      ? Number(issue.field.slice(5))
      : issue.field.startsWith('item-')
        ? lesson.steps.findIndex((st) =>
            (st.kind === 'quiz' ? st.items : st.kind === 'check' ? [st.item] : []).some(
              (item) => 'item-' + item.id === issue.field,
            ),
          )
        : -1;
    if (stepIndex >= 0)
      setCollapsed((set) => {
        const next = new Set(set);
        next.delete(stepIndex);
        return next;
      });
    requestAnimationFrame(() => {
      const target = document.getElementById(fieldId(issue.field));
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const control = target?.matches('input, select, textarea')
        ? target
        : target?.querySelector<HTMLElement>('input, select, textarea');
      control?.focus({ preventScroll: true });
    });
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
        allItems.map((i) => [i.id, keys.items[i.id] ?? { key: newKey(i), hints: [] }]),
      ),
    };
    const x = await schoolRequest<{ lesson: Lesson; keys: LessonKeys }>(
      path + (isNew ? '' : '/' + id),
      {
        lesson: body,
        keys: filled,
        ...(admin ? { reason } : {}),
        ...(isNew ? {} : { expectedRevision: lesson.revision }),
      },
      isNew ? 'POST' : 'PATCH',
    );
    setLesson(x.lesson);
    setKeys(x.keys);
    setDirty(false);
    if (isNew) {
      rememberNotice('lesson:' + x.lesson.id, c('createdLesson'));
      router.replace(schoolHref((admin ? '/admin/lessons/' : '/school/lessons/') + x.lesson.id));
    }
  }
  function requestSave() {
    const issues = lessonDraftIssues(lesson);
    if (issues.length) {
      action.setError(c(ISSUE_COPY[issues[0]!.code]));
      focusIssue(issues[0]!);
      return;
    }
    if (lesson.status === 'published' && !window.confirm(c('unpublishConfirm'))) return;
    setBusyLabel(c('saving'));
    void action.run(save, isNew ? '' : c('savedLesson')).finally(() => setBusyLabel(''));
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
  function runAi(kind: 'draft' | 'translate') {
    setAiTask({ kind, started: Date.now() });
    setNow(Date.now());
    void action
      .run(
        () =>
          kind === 'draft'
            ? remote('draft', { notes, sourceLanguage: lesson.sourceLanguage })
            : remote('translate', { targetLanguage: editLang === 'en' ? 'bn' : 'en' }),
        s('reviewDraft'),
      )
      .finally(() => setAiTask(null));
  }
  if (!isNew && r.loading && !r.data) return <Loading rows={6} />;
  const aiCopy = lessonTextAssistCopy(language);
  const chapter = chapterOf(lesson.chapterId);
  const chapterSims = simsOf(lesson.chapterId);
  const blockers = publishBlockers({ lesson, keys, dirty, isNew });
  const checkErrors = lessonPublicationChecks(lesson, keys).issues.filter(
    (issue) => issue.severity === 'error',
  ).length;
  const canPublish = blockers.length === 0;
  const allCollapsed = lesson.steps.length > 0 && collapsed.size === lesson.steps.length;
  const itemNumbers = new Map<string, number>();
  {
    let count = 0;
    for (const st of lesson.steps)
      for (const item of st.kind === 'quiz' ? st.items : st.kind === 'check' ? [st.item] : [])
        itemNumbers.set(item.id, ++count);
  }
  const stepKinds = (['intro', 'explore', 'check', 'quiz', 'lab'] as const).filter(
    (kind) => (kind !== 'explore' || chapterSims.length > 0) && (kind !== 'lab' || chapter?.lab),
  );
  const elapsed = aiTask ? Math.max(0, Math.round((now - aiTask.started) / 1000)) : 0;
  const editor = (
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
      <header className="sch-editor-head">
        <Link className="sch-back" href={schoolHref(admin ? '/admin/lessons' : '/school/lessons')}>
          <UiIcon name="back" />
          {c('backToLessons')}
        </Link>
        <div className="sch-editor-title">
          <h1>{isNew ? s('newLesson') : text(lesson.title) || c('untitled')}</h1>
          <span className="sch-chip-row">
            <span className="sch-status" data-state={lesson.status}>
              {s(lesson.status)}
            </span>
            <span className="sch-save-state" data-dirty={dirty || isNew ? 'true' : undefined}>
              {busyLabel || (dirty || isNew ? c('unsaved') : c('allSaved'))}
            </span>
          </span>
        </div>
        <div className="sch-editor-bar">
          <div className="sch-segments" role="group" aria-label={c('editingIn')}>
            {(['en', 'bn'] as const).map((lang) => (
              <button
                key={lang}
                type="button"
                aria-pressed={editLang === lang}
                onClick={() => setEditLang(lang)}
              >
                {LANGUAGE_NAME[lang]}
                {lesson.approved[lang] && <UiIcon name="check" />}
              </button>
            ))}
          </div>
          <div className="sch-editor-actions">
            <button
              type="button"
              className={dirty || isNew ? 'sch-primary' : undefined}
              disabled={action.busy}
              onClick={requestSave}
            >
              {s('save')}
            </button>
            {!isNew &&
              (['en', 'bn'] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  disabled={action.busy || dirty || lesson.approved[lang]}
                  onClick={() => {
                    setBusyLabel(c('approving'));
                    void action
                      .run(
                        () =>
                          remote('approve', { language: lang, expectedRevision: lesson.revision }),
                        c('approvedLanguage', { language: LANGUAGE_NAME[lang] }),
                      )
                      .finally(() => setBusyLabel(''));
                  }}
                >
                  {lesson.approved[lang] && <UiIcon name="check" />}
                  {lesson.approved[lang]
                    ? c('approvedLanguage', { language: LANGUAGE_NAME[lang] })
                    : c('approveLanguage', { language: LANGUAGE_NAME[lang] })}
                </button>
              ))}
            {!isNew && (
              <button
                type="button"
                className={canPublish ? 'sch-primary' : undefined}
                disabled={!canPublish || action.busy}
                aria-describedby="publish-readiness"
                onClick={() => {
                  setBusyLabel(c('publishing'));
                  void action
                    .run(
                      () => remote('publish', { expectedRevision: lesson.revision }),
                      c('publishedNotice'),
                    )
                    .finally(() => setBusyLabel(''));
                }}
              >
                {s('publish')}
              </button>
            )}
          </div>
        </div>
        <div id="publish-readiness" className="sch-readiness" aria-live="polite">
          {lesson.status === 'published' && !dirty ? (
            <p data-state="ready">
              <UiIcon name="check" />
              {c('publishedLive')}
            </p>
          ) : canPublish ? (
            <p data-state="ready">
              <UiIcon name="check" />
              {c('readyToPublish')}
            </p>
          ) : (
            <p>
              <strong>{c('whyNotPublish')}:</strong>{' '}
              {blockers
                .filter((b) => b !== 'published')
                .map((b) => c(BLOCKER_COPY[b], { count: checkErrors }))
                .join(' ')}
            </p>
          )}
          {lesson.status === 'published' && dirty && (
            <p data-state="warning" role="note">
              {c('unpublishWarning')}
            </p>
          )}
        </div>
      </header>
      <ErrorNotice error={r.error} retry={r.reload} />
      <ActionNotice action={action} toast />
      {aiTask && (
        <div className="sch-progress" role="status">
          <span className="sch-progress-bar" aria-hidden="true" />
          <p>
            {aiTask.kind === 'draft' ? c('aiWorking') : c('aiTranslating')}{' '}
            <span className="sch-muted">{c('aiElapsed', { seconds: elapsed })}</span>
          </p>
        </div>
      )}
      <LessonQuality lesson={lesson} keys={keys} />
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
      <section className="sch-panel-card sch-lesson-details" aria-label={s('title')}>
        <TextField
          id={fieldId('title')}
          singleLine
          assistField="title"
          label={`${s('title')} · ${LANGUAGE_NAME[editLang]}`}
          value={lesson.title}
          onChange={(title) => change({ ...lesson, title })}
          language={editLang}
        />
        <div className="sch-grid sch-lesson-meta">
          <Field label={s('subject')}>
            <select
              value={lesson.subject}
              onChange={(e) => {
                const subject = e.target.value as Lesson['subject'];
                change({
                  ...lesson,
                  subject,
                  chapterId: CHAPTERS.find((ch) => ch.subject === subject)!.id,
                });
              }}
            >
              {(['physics', 'chemistry', 'math'] as const).map((v) => (
                <option key={v} value={v}>
                  {s(v)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={s('grade')}>
            <select
              value={lesson.grade}
              onChange={(e) => change({ ...lesson, grade: Number(e.target.value) as 9 | 10 })}
            >
              <option value={9}>{n(9)}</option>
              <option value={10}>{n(10)}</option>
            </select>
          </Field>
          <Field label={s('sourceLanguage')}>
            <select
              value={lesson.sourceLanguage}
              onChange={(e) => change({ ...lesson, sourceLanguage: e.target.value as Lang })}
            >
              <option value="en">English</option>
              <option value="bn">বাংলা</option>
            </select>
          </Field>
          <Field label={s('chapter')} className="sch-lesson-chapter">
            <select
              value={lesson.chapterId}
              onChange={(e) => change({ ...lesson, chapterId: e.target.value })}
            >
              {chapterGroups(lesson.subject).map(({ book, chapters }, _, groups) => {
                const options = chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    {n(ch.number)}. {text(ch.title)}
                  </option>
                ));
                return groups.length > 1 ? (
                  <optgroup
                    key={book}
                    label={c(book === 'higher-math' ? 'book-higher-math' : 'book-general-math')}
                  >
                    {options}
                  </optgroup>
                ) : (
                  options
                );
              })}
            </select>
          </Field>
        </div>
        {!admin && (
          <div className="sch-scope">
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
                {classes.data?.classes
                  .filter((cls) => cls.grade === lesson.grade)
                  .map((cls) => (
                    <label key={cls.id}>
                      <input
                        type="checkbox"
                        checked={lesson.classIds.includes(cls.id)}
                        onChange={(e) =>
                          change({
                            ...lesson,
                            classIds: e.target.checked
                              ? [...lesson.classIds, cls.id]
                              : lesson.classIds.filter((v) => v !== cls.id),
                          })
                        }
                      />
                      {cls.name}
                    </label>
                  ))}
              </div>
            )}
          </div>
        )}
      </section>
      <details className={assistStyles.wholeTools}>
        <summary>{aiCopy.wholeTitle}</summary>
        <p>{aiCopy.wholeHelp}</p>
        <Field label={s('notes')}>
          <AutoTextarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {(isNew || dirty) && <p>{aiCopy.wholeSave}</p>}
        <div className="sch-toolbar">
          <button
            type="button"
            disabled={isNew || action.busy || dirty}
            onClick={() => runAi('draft')}
          >
            {aiTask?.kind === 'draft' ? c('aiElapsed', { seconds: elapsed }) : s('draftAi')}
          </button>
          <button
            type="button"
            disabled={isNew || action.busy || dirty}
            onClick={() => runAi('translate')}
          >
            {aiTask?.kind === 'translate' ? c('aiElapsed', { seconds: elapsed }) : s('translate')}
          </button>
        </div>
      </details>
      <div className="sch-steps-head">
        <h2>{s('steps')}</h2>
        <button
          type="button"
          onClick={() =>
            setCollapsed(allCollapsed ? new Set() : new Set(lesson.steps.map((_, i) => i)))
          }
        >
          {allCollapsed ? c('expandAll') : c('collapseAll')}
        </button>
      </div>
      <ol className="sch-step-list">
        {lesson.steps.map((step, index) => (
          <li key={index}>
            <details
              id={fieldId('step-' + index)}
              className="sch-step"
              open={!collapsed.has(index)}
              onToggle={(e) => {
                const open = (e.currentTarget as HTMLDetailsElement).open;
                setCollapsed((set) => {
                  const next = new Set(set);
                  if (open) next.delete(index);
                  else next.add(index);
                  return next.size === set.size && open === !set.has(index) ? set : next;
                });
              }}
            >
              <summary>
                <span className="sch-step-number">{n(index + 1)}</span>
                <span className="sch-step-kind">{s(step.kind)}</span>
                <span className="sch-step-preview">
                  {step.kind === 'intro'
                    ? step.body[editLang]
                    : step.kind === 'explore'
                      ? simLabel(step.simId, language)
                      : step.kind === 'quiz'
                        ? step.items.length === 1
                          ? c('oneQuestion')
                          : c('questionsCount', { count: step.items.length })
                        : step.kind === 'check'
                          ? step.item.prompt[editLang]
                          : (step.goal?.[editLang] ?? '')}
                </span>
                <UiIcon name="chevron" className="sch-step-caret" />
              </summary>
              <div className="sch-step-body">
                <div className="sch-step-tools">
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`${s('moveUp')} · ${c('stepN', { n: index + 1 })}`}
                    onClick={() => {
                      const steps = [...lesson.steps];
                      [steps[index - 1], steps[index]] = [steps[index]!, steps[index - 1]!];
                      change({ ...lesson, steps });
                    }}
                  >
                    <UiIcon name="arrowDown" className="sch-flip" />
                    {s('moveUp')}
                  </button>
                  <button
                    type="button"
                    disabled={index === lesson.steps.length - 1}
                    aria-label={`${s('moveDown')} · ${c('stepN', { n: index + 1 })}`}
                    onClick={() => {
                      const steps = [...lesson.steps];
                      [steps[index], steps[index + 1]] = [steps[index + 1]!, steps[index]!];
                      change({ ...lesson, steps });
                    }}
                  >
                    <UiIcon name="arrowDown" />
                    {s('moveDown')}
                  </button>
                  <button
                    type="button"
                    className="sch-danger"
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
                    <SimSelect
                      value={step.simId}
                      chapterId={lesson.chapterId}
                      onChange={(simId) =>
                        updateStep(index, {
                          ...step,
                          simId,
                          params: { ...SIM_DEFAULTS[simId] },
                          lockedParams: [],
                        })
                      }
                    />
                    {SIM_IDS.includes(step.simId as SimId) && (
                      <>
                        <SimView
                          id={step.simId as SimId}
                          value={step.params}
                          onChange={(params) => updateStep(index, { ...step, params })}
                        />
                        <fieldset className="sch-fieldset">
                          <legend>{c('lockedControls')}</legend>
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
                                {paramLabel(step.simId, key, language)}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      </>
                    )}
                    {step.prompts.map((prompt, i) => (
                      <TextField
                        key={i}
                        assistField="instruction"
                        context={JSON.stringify({ stepIndex: index, promptIndex: i, step })}
                        label={c('promptN', { n: i + 1 })}
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
                      type="button"
                      disabled={step.prompts.length >= 6}
                      onClick={() =>
                        updateStep(index, { ...step, prompts: [...step.prompts, empty()] })
                      }
                    >
                      + {c('promptN', { n: step.prompts.length + 1 })}
                    </button>
                  </>
                ) : step.kind === 'lab' ? (
                  <>
                    {!chapter?.lab && <p className="sch-field-error">{c('noChapterLab')}</p>}
                    <TextField
                      assistField="goal"
                      context={JSON.stringify({ stepIndex: index, step })}
                      label={s('body')}
                      value={step.goal ?? empty()}
                      onChange={(goal) => updateStep(index, { ...step, goal })}
                      language={editLang}
                    />
                    <ReagentPicker
                      legend={c('reagents')}
                      value={step.reagentIds}
                      onChange={(reagentIds) => updateStep(index, { ...step, reagentIds })}
                    />
                  </>
                ) : (
                  <>
                    {(step.kind === 'check' ? [step.item] : step.items).map((item, i) => (
                      <QuestionEditor
                        key={item.id}
                        number={itemNumbers.get(item.id) ?? i + 1}
                        chapterId={lesson.chapterId}
                        item={item}
                        itemKey={keys.items[item.id]?.key ?? newKey(item)}
                        hints={keys.items[item.id]?.hints ?? []}
                        language={editLang}
                        canRemove={step.kind === 'quiz' && step.items.length > 1}
                        onRemove={() =>
                          updateStep(index, {
                            ...step,
                            items: (step.kind === 'quiz' ? step.items : []).filter(
                              (_, j) => j !== i,
                            ),
                          } as LessonStep)
                        }
                        onItem={(next) => {
                          if (
                            next.kind !== item.kind ||
                            ('simId' in next && 'simId' in item && next.simId !== item.simId)
                          )
                            updateItemKey(next, newKey(next));
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
                              [item.id]: { key: k.items[item.id]?.key ?? newKey(item), hints },
                            },
                          }));
                          setDirty(true);
                        }}
                      />
                    ))}
                    {step.kind === 'quiz' && (
                      <button
                        type="button"
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
              </div>
            </details>
          </li>
        ))}
      </ol>
      <div className="sch-add-steps" role="group" aria-label={c('addStepLabel')}>
        <span>{c('addStepLabel')}</span>
        {stepKinds.map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={lesson.steps.length >= 20}
            onClick={() =>
              change({ ...lesson, steps: [...lesson.steps, newStep(kind, lesson.chapterId)] })
            }
          >
            + {s(kind)}
          </button>
        ))}
      </div>
      <LabGenerator
        lesson={lesson}
        chapterSims={chapterSims.length}
        admin={admin}
        reason={reason}
        editLanguage={editLang}
        onAccept={(proposal) => {
          const next = acceptLabProposal(lesson, keys, proposal);
          change(next.lesson);
          setKeys(next.keys);
        }}
      />
      {!isNew && (
        <div className="sch-editor-footer">
          {!dirty && (
            <Link
              className="sch-button-link"
              href={schoolHref(`${admin ? '/admin' : '/school'}/lessons/${id}/materials`)}
            >
              <UiIcon name="book" />
              {c('materials')}
            </Link>
          )}
          <button
            type="button"
            disabled={dirty || action.busy || lesson.status === 'archived'}
            onClick={() => {
              if (window.confirm(c('archiveConfirm')))
                void action.run(
                  () => remote('archive', { expectedRevision: lesson.revision }),
                  s('archived'),
                );
            }}
          >
            {s('archiveLesson')}
          </button>
        </div>
      )}
    </LessonTextAssistProvider>
  );
  return (
    <SchoolAudienceProvider audience="teacher">
      <div className={admin ? 'sch sch-panel sch-lesson-editor' : 'sch-lesson-editor'}>
        {editor}
      </div>
    </SchoolAudienceProvider>
  );
}

function QuestionEditor({
  number,
  chapterId,
  item,
  itemKey,
  hints,
  language,
  canRemove,
  onRemove,
  onItem,
  onKey,
  onHints,
}: {
  number: number;
  chapterId: string;
  item: QuizItem;
  itemKey: QuizKey;
  hints: Text[];
  language: Lang;
  canRemove: boolean;
  onRemove: () => void;
  onItem: (v: QuizItem) => void;
  onKey: (v: QuizKey) => void;
  onHints: (v: Text[]) => void;
}) {
  const { s, c, language: uiLanguage } = useConsoleCopy();
  const chapter = chapterOf(chapterId);
  const sims = simsOf(chapterId);
  const kinds = (['mcq', 'numeric', 'simTask', 'labTask'] as const).filter(
    (k) =>
      k === item.kind ||
      ((k !== 'simTask' || sims.length > 0) && (k !== 'labTask' || chapter?.lab)),
  );
  const predicate = itemKey.kind === 'simTask' ? itemKey.predicate : '';
  return (
    <section className="sch-question" id={fieldId('item-' + item.id)}>
      <div className="sch-question-head">
        <h3>{c('questionN', { n: number })}</h3>
        {canRemove && (
          <button type="button" className="sch-danger" onClick={onRemove}>
            {s('delete')}
          </button>
        )}
      </div>
      <div className="sch-grid">
        <Field label={c('questionType')}>
          <select
            value={item.kind}
            onChange={(e) =>
              onItem({
                ...newItem(e.target.value as QuizItem['kind'], sims[0] ?? 'newton-cart'),
                id: item.id,
                prompt: item.prompt,
                points: item.points,
              })
            }
          >
            {kinds.map((k) => (
              <option value={k} key={k}>
                {s(k)}
              </option>
            ))}
          </select>
        </Field>
        <NumberField
          label={s('points')}
          value={item.points}
          min={1}
          max={10}
          onChange={(points) => onItem({ ...item, points })}
        />
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
        <fieldset className="sch-fieldset">
          <legend>
            {s('options')} · {c('correctAnswer')}
          </legend>
          {item.options.map((option, i) => (
            <div className={'sch-option ' + assistStyles.choice} key={i}>
              <label className="sch-answer-pick">
                <input
                  type="radio"
                  name={'answer-' + item.id}
                  aria-label={`${c('correctAnswer')}: ${c('optionN', { n: i + 1 })}`}
                  checked={itemKey.answer === i}
                  onChange={() => onKey({ kind: 'mcq', answer: i })}
                />
              </label>
              <TextField
                singleLine
                assistField="option"
                label={
                  c('optionN', { n: i + 1 }) +
                  (itemKey.answer === i ? ` · ${c('correctAnswer')}` : '')
                }
                value={option}
                language={language}
                context={JSON.stringify({ item, itemKey, optionIndex: i })}
                onChange={(next) =>
                  onItem({ ...item, options: item.options.map((v, j) => (i === j ? next : v)) })
                }
              />
              <button
                type="button"
                aria-label={`${s('delete')} · ${c('optionN', { n: i + 1 })}`}
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
                <UiIcon name="close" />
              </button>
            </div>
          ))}
          <button
            type="button"
            disabled={item.options.length >= 5}
            onClick={() => onItem({ ...item, options: [...item.options, empty()] })}
          >
            + {c('optionN', { n: item.options.length + 1 })}
          </button>
        </fieldset>
      )}
      {item.kind === 'numeric' && itemKey.kind === 'numeric' && (
        <div className="sch-grid sch-grid-3">
          <Field label={s('unit')}>
            <input
              value={item.unit}
              maxLength={16}
              onChange={(e) => onItem({ ...item, unit: e.target.value })}
            />
          </Field>
          <NumberField
            label={c('correctAnswer')}
            value={itemKey.value}
            onChange={(value) => onKey({ ...itemKey, value })}
          />
          <div className="sch-tolerance">
            <NumberField
              label={s('tolerance')}
              min={0}
              value={
                itemKey.tolerance.mode === 'rel'
                  ? itemKey.tolerance.amount * 100
                  : itemKey.tolerance.amount
              }
              onChange={(amount) =>
                onKey({
                  ...itemKey,
                  tolerance: {
                    ...itemKey.tolerance,
                    amount: Math.max(0, amount) / (itemKey.tolerance.mode === 'rel' ? 100 : 1),
                  },
                })
              }
            />
            <select
              aria-label={s('tolerance')}
              value={itemKey.tolerance.mode}
              onChange={(e) =>
                onKey({
                  ...itemKey,
                  tolerance: {
                    mode: e.target.value as 'abs' | 'rel',
                    amount:
                      (itemKey.tolerance.amount * (itemKey.tolerance.mode === 'rel' ? 100 : 1)) /
                      (e.target.value === 'rel' ? 100 : 1),
                  },
                })
              }
            >
              <option value="abs">± {item.unit || ''}</option>
              <option value="rel">%</option>
            </select>
          </div>
        </div>
      )}
      {item.kind === 'simTask' && itemKey.kind === 'simTask' && (
        <>
          <SimSelect
            value={item.simId}
            chapterId={chapterId}
            onChange={(simId) => {
              onItem({
                ...item,
                simId,
                startParams: { ...SIM_DEFAULTS[simId] },
                editableParams: PARAMS[simId].map((p) => p.id),
              });
            }}
          />
          {SIM_IDS.includes(item.simId as SimId) && (
            <>
              <SimView
                id={item.simId as SimId}
                value={item.startParams}
                onChange={(startParams) => onItem({ ...item, startParams })}
              />
              <fieldset className="sch-fieldset">
                <legend>{c('editableControls')}</legend>
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
                      {paramLabel(item.simId, key, uiLanguage)}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label={s('predicate')}>
                <select
                  value={predicate}
                  onChange={(e) =>
                    onKey({
                      ...itemKey,
                      predicate: e.target.value,
                      args: defaultTaskArgs(item.simId, e.target.value),
                    })
                  }
                >
                  {Object.keys(SIMS[item.simId as SimId].predicates).map((p) => (
                    <option key={p} value={p}>
                      {predicateLabel(p, uiLanguage)}
                    </option>
                  ))}
                </select>
              </Field>
              <TargetFields
                value={itemKey.args}
                label={(key) => argLabel(predicate, key, uiLanguage)}
                onChange={(args) => onKey({ ...itemKey, args })}
              />
              <fieldset className="sch-fieldset">
                <legend>
                  {uiLanguage === 'bn'
                    ? 'নমুনা সমাধান (শুধু পরিবর্তনযোগ্য মান)'
                    : 'Example solution (changeable controls only)'}
                </legend>
                <TargetFields
                  value={
                    itemKey.exampleAnswer ??
                    Object.fromEntries(
                      item.editableParams.map((key) => [key, item.startParams[key]]),
                    )
                  }
                  label={(key) => paramLabel(item.simId, key, uiLanguage)}
                  onChange={(exampleAnswer) => onKey({ ...itemKey, exampleAnswer })}
                />
              </fieldset>
            </>
          )}
        </>
      )}
      {item.kind === 'labTask' && itemKey.kind === 'labTask' && (
        <>
          {!chapter?.lab && <p className="sch-field-error">{c('noChapterLab')}</p>}
          <ReagentPicker
            legend={c('reagents')}
            value={item.reagentIds}
            onChange={(reagentIds) => onItem({ ...item, reagentIds })}
          />
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
              {LAB_PREDICATES.map((v) => (
                <option key={v} value={v}>
                  {predicateLabel(v, uiLanguage)}
                </option>
              ))}
            </select>
          </Field>
          <TargetFields
            value={itemKey.task}
            label={(key) =>
              argLabel(
                String((itemKey.task as Record<string, unknown>)?.predicate ?? ''),
                key,
                uiLanguage,
              )
            }
            onChange={(task) =>
              onKey({
                ...itemKey,
                task: { predicate: (itemKey.task as Record<string, unknown>)?.predicate, ...task },
              })
            }
          />
          <fieldset className="sch-fieldset">
            <legend>
              {uiLanguage === 'bn' ? 'সমাধানের নমুনা মিশ্রণ' : 'Example solution mixture'}
            </legend>
            <TargetFields
              value={itemKey.exampleAnswer ?? { reagentIds: [], heat: false, amounts: {} }}
              label={(key) => argLabel('', key, uiLanguage)}
              onChange={(exampleAnswer) => onKey({ ...itemKey, exampleAnswer })}
            />
          </fieldset>
        </>
      )}
      {hints.map((h, i) => (
        <TextField
          assistField="hint"
          context={JSON.stringify({ item, itemKey, hintIndex: i })}
          label={c('hintN', { n: i + 1 })}
          key={i}
          value={h}
          language={language}
          onChange={(next) => onHints(hints.map((v, j) => (i === j ? next : v)))}
        />
      ))}
      <button
        type="button"
        disabled={hints.length >= 2}
        onClick={() => onHints([...hints, empty()])}
      >
        + {c('hintN', { n: hints.length + 1 })}
      </button>
    </section>
  );
}
