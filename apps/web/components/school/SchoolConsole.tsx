'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { toDataURL } from 'qrcode';
import {
  AvatarSchema,
  STUDENT_USERNAME_PATTERN,
  type AttemptDoc,
  type QuizItem,
} from '@just-imagine/protocol';
import { previewRosterCsv } from '../../lib/school/csv';
import { firstTryResult, groupResultLessons, quizProgress } from '../../lib/school/results';
import {
  classNameIssue,
  filterStudents,
  usernameIssue,
  type UsernameIssue,
} from '../../lib/school/console';
import { schoolHref, schoolRequest, useSchoolResource } from '../../lib/school/api';
import type {
  ActivityRow,
  Lesson,
  PinCard,
  RosterStudent,
  SchoolClass,
  SchoolMe,
  Student,
} from '../../lib/school/types';
import { useConsoleCopy, type ConsoleString } from '../../lib/school/console-copy';
import { useSchoolSession } from './SchoolShell';
import { ActionNotice, EmptyState, ErrorNotice, Field, Loading, useSchoolAction } from './shared';
import { UiIcon, type UiIconName } from '../UiIcon';
import { Leaderboard } from '../study/Leaderboard';

type View = 'home' | 'classes' | 'students' | 'results' | 'leaderboard';
type Copy = ReturnType<typeof useConsoleCopy>;

export function ConsoleHeader({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <header className="sch-page-head">
      <div>
        <h1>{title}</h1>
        {lead && <p className="sch-lead">{lead}</p>}
      </div>
      {children && <div className="sch-page-actions">{children}</div>}
    </header>
  );
}

function StatusChip({ state, children }: { state: string; children: ReactNode }) {
  return (
    <span className="sch-status" data-state={state}>
      {children}
    </span>
  );
}

const relative = (language: 'en' | 'bn', at: number) => {
  const format = new Intl.RelativeTimeFormat(language === 'bn' ? 'bn-BD' : 'en', {
    numeric: 'auto',
  });
  const minutes = Math.round((at - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return format.format(hours, 'hour');
  return format.format(Math.round(hours / 24), 'day');
};

// ---------- results ----------

export function ClassResults({
  classId,
  lessonId,
  lesson,
}: {
  classId: string;
  lessonId: string;
  lesson?: Pick<Lesson, 'id' | 'revision' | 'steps'>;
}) {
  const { s, text, c, n } = useConsoleCopy();
  const results = useSchoolResource<{
    lesson: Pick<Lesson, 'id' | 'title' | 'revision'> & { quizItemIds: string[] };
    students: { student: Student; attempt: AttemptDoc | null }[];
  }>(
    `school/results?classId=${encodeURIComponent(classId)}&lessonId=${encodeURIComponent(lessonId)}`,
  );
  if (results.error) return <ErrorNotice error={results.error} retry={results.reload} />;
  if (results.loading) return <Loading rows={5} />;
  if (!results.data) return null;
  const data = results.data;
  if (!data.students.length)
    return (
      <EmptyState
        title={s('noResults')}
        action={
          <Link className="sch-action-link" href={schoolHref('/school/students')}>
            {c('addStudentsCta')}
          </Link>
        }
      />
    );
  const questions = new Map<
    string,
    { label: 'quizQuestion' | 'practiceQuestion'; number: number; prompt: QuizItem['prompt'] }
  >();
  if (lesson?.id === data.lesson.id && lesson.revision === data.lesson.revision) {
    let quizNumber = 0;
    let practiceNumber = 0;
    for (const step of lesson.steps) {
      if (step.kind === 'check')
        questions.set(step.item.id, {
          label: 'practiceQuestion',
          number: ++practiceNumber,
          prompt: step.item.prompt,
        });
      if (step.kind === 'quiz')
        for (const item of step.items)
          questions.set(item.id, {
            label: 'quizQuestion',
            number: ++quizNumber,
            prompt: item.prompt,
          });
    }
  }
  const rows = filterStudents(
    data.students.map((row) => ({ ...row.student, row })),
    {},
  ).map((s) => s.row);
  const progress = rows.map(({ attempt }) => quizProgress(data.lesson.quizItemIds, attempt));
  const submitted = progress.filter((p) => p.status === 'submitted').length;
  return (
    <section className="sch-results">
      <div className="sch-table-wrap">
        <table className="sch-results-table">
          <caption>
            <strong>{text(data.lesson.title)}</strong> ·{' '}
            {c('summarySubmitted', { count: submitted, total: rows.length })}
          </caption>
          <thead>
            <tr>
              <th scope="col">{s('students')}</th>
              <th scope="col">{c('status')}</th>
              <th scope="col" className="sch-number">
                {c('score')}
              </th>
              <th scope="col" className="sch-number">
                {s('points')}
              </th>
              <th scope="col" className="sch-number">
                {s('firstTry')}
              </th>
              <th scope="col">{c('questions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ student, attempt }, index) => {
              const firstTry = firstTryResult(data.lesson.quizItemIds, attempt);
              const state = progress[index]!;
              const items = attempt ? Object.entries(attempt.items) : [];
              return (
                <tr key={student.id}>
                  <th scope="row">{student.firstName}</th>
                  <td data-label={c('status')}>
                    <StatusChip state={state.status}>{c(state.status)}</StatusChip>
                    {attempt?.completedAt && (
                      <small className="sch-cell-note">{c('completedAll')}</small>
                    )}
                  </td>
                  <td className="sch-number" data-label={c('score')}>
                    {state.score ? `${n(state.score.correct)}/${n(state.score.total)}` : '—'}
                  </td>
                  <td className="sch-number" data-label={s('points')}>
                    {n(attempt?.pointsAwarded ?? 0)}
                  </td>
                  <td
                    className="sch-number"
                    data-label={s('firstTry')}
                    title={attempt && !firstTry ? s('firstTryUnavailable') : undefined}
                  >
                    {firstTry
                      ? `${n(firstTry.correct)}/${n(firstTry.total)}`
                      : attempt && !firstTry
                        ? s('historyUnavailable')
                        : '—'}
                  </td>
                  <td className="sch-result-items" data-label={c('questions')}>
                    {items.length ? (
                      <ul>
                        {items.map(([id, r], i) => {
                          const question = questions.get(id);
                          const quizIndex = data.lesson.quizItemIds.indexOf(id);
                          const label =
                            question?.label ?? (quizIndex >= 0 ? 'quizQuestion' : 'question');
                          const ordinal =
                            question?.number ?? (quizIndex >= 0 ? quizIndex + 1 : i + 1);
                          return (
                            <li key={id} data-correct={r.correct ? 'true' : 'false'}>
                              <span className="sch-result-mark" aria-hidden="true">
                                {r.correct ? <UiIcon name="check" /> : <UiIcon name="restart" />}
                              </span>
                              <span>
                                <strong>
                                  {s(label)} {n(ordinal)}
                                </strong>
                                {question && <> · {text(question.prompt)}</>}
                                <br />
                                {r.correct ? c('correct') : c('incorrect')} ·{' '}
                                {r.tries === 1 ? c('oneTry') : c('tries', { count: r.tries })}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <span className="sch-muted">{c('noAnswers')}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- PIN cards ----------

export function PinDialog({
  cards,
  code,
  onClose,
}: {
  cards: PinCard[];
  code: string;
  onClose: () => void;
}) {
  const { s, c } = useConsoleCopy();
  const ref = useRef<HTMLDialogElement>(null);
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState<'idle' | 'done' | 'failed'>('idle');
  const url = typeof window === 'undefined' ? '' : window.location.origin + '/study/sign-in';
  useEffect(() => {
    void toDataURL(window.location.origin + '/study/sign-in', { margin: 1, width: 160 }).then(
      setQr,
    );
  }, []);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    dialog?.querySelector<HTMLElement>('h2')?.focus();
  }, []);
  const one = cards.length === 1 ? cards[0] : undefined;
  const text = cards
    .map(
      ({ student, pin }) =>
        `${student.firstName} — ${s('username')}: ${student.username} — PIN: ${pin}`,
    )
    .concat(`${s('schoolCode')}: ${code}`, `${c('signInAt')}: ${url}`)
    .join('\n');
  return (
    <dialog
      ref={ref}
      className="sch-dialog sch-pin-print"
      aria-labelledby="pin-dialog-title"
      onCancel={(event) => {
        // Escape must not discard a one-time secret without the explicit close button.
        event.preventDefault();
      }}
    >
      <div className="sch-dialog-head">
        <h2 id="pin-dialog-title" tabIndex={-1}>
          {one
            ? c('pinTitleOne', { name: one.student.firstName })
            : c('pinTitleMany', { count: cards.length })}
        </h2>
      </div>
      <p className="sch-once" role="note">
        <UiIcon name="timer" />
        <span>{one ? c('pinOnce') : c('pinsOnceMany')}</span>
      </p>
      <div className="sch-pin-grid">
        {cards.map(({ student, pin }) => (
          <article className="sch-pin" key={student.id}>
            {qr && <Image src={qr} width={100} height={100} unoptimized alt="" />}
            <strong>{student.firstName}</strong>
            <dl>
              <dt>{s('schoolCode')}</dt>
              <dd>{code}</dd>
              <dt>{s('username')}</dt>
              <dd>{student.username}</dd>
              <dt>PIN</dt>
              <dd>
                <code>{pin}</code>
              </dd>
            </dl>
            <small>{url}</small>
          </article>
        ))}
      </div>
      <div className="sch-dialog-actions">
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard
              .writeText(text)
              .then(() => setCopied('done'))
              .catch(() => setCopied('failed'))
          }
        >
          <UiIcon name={copied === 'done' ? 'check' : 'write'} />
          {copied === 'done' ? c('copiedPins') : one ? c('copyPin') : c('copyPins')}
        </button>
        <button type="button" onClick={() => window.print()}>
          <UiIcon name="gallery" />
          {c('print')}
        </button>
        <button
          type="button"
          className="sch-primary"
          onClick={() => {
            ref.current?.close();
            onClose();
          }}
        >
          {c('done')}
        </button>
      </div>
      {copied === 'failed' && (
        <p role="alert" className="sch-field-error">
          {c('copyFailed')}
        </p>
      )}
      <p className="sch-muted">{s('printHelp')}</p>
    </dialog>
  );
}

// ---------- overview ----------

function Overview({ me }: { me: SchoolMe }) {
  const copy = useConsoleCopy();
  const { c, n, s, text, language } = copy;
  const classes = useSchoolResource<{ classes: SchoolClass[] }>('school/classes'),
    students = useSchoolResource<{ students: RosterStudent[] }>('school/students'),
    lessons = useSchoolResource<{ lessons: Lesson[] }>('school/lessons'),
    shared = useSchoolResource<{ lessons: Lesson[] }>('school/lessons?scope=global'),
    activity = useSchoolResource<{ activity: ActivityRow[] }>('school/activity');
  const roster = students.data?.students ?? [];
  const schoolLessons = lessons.data?.lessons ?? [];
  const sharedCount = shared.data?.lessons.length;
  const drafts = schoolLessons
    .filter((l) => l.status === 'draft')
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const attention = roster.filter((st) => st.status === 'suspended' || st.signIn?.locked);
  const className = (id: string) => classes.data?.classes.find((x) => x.id === id)?.name ?? '';
  const stats: {
    key: ConsoleString;
    href: string;
    icon: UiIconName;
    value?: number;
    detail?: string;
  }[] = [
    {
      key: 'studentsCount',
      href: '/school/students',
      icon: 'learn',
      value: students.data ? roster.length : undefined,
      detail: c('seatsOf', { total: me.school.seats }),
    },
    {
      key: 'classesCount',
      href: '/school/classes',
      icon: 'gallery',
      value: classes.data?.classes.length,
      detail: classes.data
        ? ([9, 10] as const)
            .map((grade) => ({
              grade,
              count: classes.data!.classes.filter((x) => x.grade === grade).length,
            }))
            .filter((g) => g.count)
            .map((g) => c('classesInGrade', { grade: g.grade, count: g.count }))
            .join(' · ')
        : undefined,
    },
    {
      key: 'lessonsCount',
      href: '/school/lessons',
      icon: 'book',
      value:
        lessons.data && sharedCount !== undefined ? schoolLessons.length + sharedCount : undefined,
      detail:
        lessons.data && sharedCount !== undefined
          ? c('lessonsDetail', { school: schoolLessons.length, shared: sharedCount })
          : undefined,
    },
  ];
  const actions: [ConsoleString, string, UiIconName][] = [
    ['actionAddStudent', '/school/students#add-student', 'learn'],
    ['actionNewClass', '/school/classes#new-class', 'gallery'],
    ['actionNewLesson', '/school/lessons/new', 'write'],
    ['actionResults', '/school/results', 'check'],
  ];
  return (
    <>
      <ConsoleHeader
        title={language === 'bn' ? me.school.nameBn : me.school.name}
        lead={c('overviewLead')}
      >
        <span className="sch-code-chip">
          <span>{c('schoolCodeLabel')}</span>
          <code>{me.school.code}</code>
        </span>
      </ConsoleHeader>
      <ErrorNotice
        error={classes.error || students.error || lessons.error || shared.error}
        retry={() => {
          classes.reload();
          students.reload();
          lessons.reload();
          shared.reload();
        }}
      />
      <dl className="sch-stats">
        {stats.map((stat) => (
          <Link key={stat.key} href={schoolHref(stat.href)} className="sch-stat">
            <dt>
              <UiIcon name={stat.icon} />
              {c(stat.key)}
            </dt>
            <dd>
              <span className="sch-stat-value">
                {stat.value === undefined ? (
                  <span className="sch-skeleton sch-skeleton-num" />
                ) : (
                  n(stat.value)
                )}
              </span>
              {stat.detail && <span className="sch-stat-detail">{stat.detail}</span>}
            </dd>
          </Link>
        ))}
      </dl>
      <nav className="sch-quick" aria-label={c('quickActions')}>
        {actions.map(([key, href, icon]) => (
          <Link key={key} href={schoolHref(href)} className="sch-quick-action">
            <UiIcon name={icon} />
            <span>{c(key)}</span>
          </Link>
        ))}
      </nav>
      <div className="sch-overview-grid">
        <section className="sch-panel-card" aria-labelledby="ov-activity">
          <div className="sch-card-head">
            <h2 id="ov-activity">{c('recentResults')}</h2>
            <Link href={schoolHref('/school/results')}>{c('viewAll')}</Link>
          </div>
          <ErrorNotice error={activity.error} retry={activity.reload} />
          {activity.loading ? (
            <Loading rows={3} />
          ) : activity.data?.activity.length ? (
            <ul className="sch-feed">
              {activity.data.activity.map((row) => (
                <li key={row.studentId + row.lessonId}>
                  <div>
                    <strong>{row.firstName}</strong>
                    <span className="sch-muted"> · {className(row.classId)}</span>
                    <p>{text(row.lessonTitle)}</p>
                  </div>
                  <div className="sch-feed-end">
                    <StatusChip state={row.status}>{c(row.status)}</StatusChip>
                    {row.score && (
                      <span className="sch-feed-score">
                        {n(row.score.correct)}/{n(row.score.total)}
                      </span>
                    )}
                    <small>{relative(language, row.updatedAt)}</small>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sch-muted sch-card-empty">{c('recentEmpty')}</p>
          )}
        </section>
        <div className="sch-overview-side">
          <section className="sch-panel-card" aria-labelledby="ov-drafts">
            <div className="sch-card-head">
              <h2 id="ov-drafts">{c('pendingDrafts')}</h2>
              <Link href={schoolHref('/school/lessons')}>{c('viewAll')}</Link>
            </div>
            {lessons.loading ? (
              <Loading rows={2} />
            ) : drafts.length ? (
              <ul className="sch-feed">
                {drafts.slice(0, 4).map((l) => (
                  <li key={l.id}>
                    <div>
                      <Link href={schoolHref('/school/lessons/' + l.id)}>
                        <strong>{text(l.title) || c('untitled')}</strong>
                      </Link>
                      <p className="sch-muted">
                        {s(l.subject)} · {c('gradeN', { grade: l.grade })}
                      </p>
                    </div>
                    <div className="sch-feed-end">
                      <span className="sch-approvals">
                        {(['en', 'bn'] as const).map((lang) => (
                          <StatusChip key={lang} state={l.approved[lang] ? 'approved' : 'draft'}>
                            {l.approved[lang] && <UiIcon name="check" />}
                            {lang === 'en' ? 'EN' : 'বাং'}
                          </StatusChip>
                        ))}
                      </span>
                      <small>{c('updated', { when: relative(language, l.updatedAt) })}</small>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sch-muted sch-card-empty">{c('pendingEmpty')}</p>
            )}
          </section>
          {attention.length > 0 && (
            <section className="sch-panel-card" aria-labelledby="ov-attention">
              <div className="sch-card-head">
                <h2 id="ov-attention">{c('needsAttention')}</h2>
                <Link href={schoolHref('/school/students')}>{c('openStudents')}</Link>
              </div>
              <ul className="sch-feed">
                {attention.slice(0, 5).map((st) => (
                  <li key={st.id}>
                    <div>
                      <strong>{st.firstName}</strong>
                      <span className="sch-muted"> · {className(st.classId)}</span>
                    </div>
                    <StatusChip state={st.status === 'suspended' ? 'suspended' : 'locked'}>
                      {st.status === 'suspended' ? c('attentionSuspended') : c('attentionLocked')}
                    </StatusChip>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

// ---------- classes ----------

function ClassesView({ copy }: { copy: Copy }) {
  const { c, s, n } = copy;
  const action = useSchoolAction();
  const classes = useSchoolResource<{ classes: SchoolClass[] }>('school/classes'),
    students = useSchoolResource<{ students: RosterStudent[] }>('school/students');
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const list = [...(classes.data?.classes ?? [])].sort(
    (a, b) => a.grade - b.grade || a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
  const issueText = (issue: ReturnType<typeof classNameIssue>) =>
    issue === 'empty'
      ? c('classNameEmpty')
      : issue === 'tooLong'
        ? c('classNameLong')
        : issue === 'duplicate'
          ? c('classNameDuplicate')
          : '';
  const createIssue = classNameIssue(name, list);
  async function reload() {
    classes.reload();
    students.reload();
  }
  return (
    <>
      <ConsoleHeader title={s('classes')} lead={c('classesLead')} />
      <ActionNotice action={action} toast />
      <ErrorNotice error={classes.error || students.error} retry={() => void reload()} />
      <form
        id="new-class"
        className="sch-inline-form sch-panel-card"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (createIssue) {
            event.currentTarget.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
            return;
          }
          const form = new FormData(event.currentTarget);
          const target = event.currentTarget;
          void action
            .run(async () => {
              await schoolRequest('school/classes', {
                name: name.trim(),
                grade: Number(form.get('grade')),
                section: String(form.get('section')).trim(),
                boardsVisible: true,
              });
              await reload();
            }, c('classCreated'))
            .then((ok) => {
              if (ok) {
                setName('');
                setTouched(false);
                target.reset();
              }
            });
        }}
      >
        <Field
          label={c('className')}
          hint={c('classNameHint')}
          error={touched ? issueText(createIssue) : ''}
          hintId="new-class-hint"
        >
          <input
            name="name"
            value={name}
            maxLength={40}
            required
            aria-invalid={touched && !!createIssue}
            aria-describedby="new-class-hint"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name && setTouched(true)}
          />
        </Field>
        <Field label={s('grade')}>
          <select name="grade" defaultValue="9">
            <option value="9">{n(9)}</option>
            <option value="10">{n(10)}</option>
          </select>
        </Field>
        <Field label={s('section')}>
          <input name="section" required maxLength={8} />
        </Field>
        <button className="sch-primary" disabled={action.busy}>
          {s('newClass')}
        </button>
      </form>
      {classes.loading ? (
        <Loading rows={3} />
      ) : !list.length ? (
        <EmptyState title={c('classEmpty')} body={c('classEmptyBody')} />
      ) : (
        <div className="sch-class-list">
          {list.map((cls) => {
            const members = filterStudents(
              (students.data?.students ?? []).filter((st) => st.classId === cls.id),
              {},
            );
            const blocked = members.length > 0;
            return (
              <form
                key={cls.id}
                className="sch-class-row"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const nextName = String(form.get('name'));
                  const issue = classNameIssue(nextName, list, cls.id);
                  if (issue) {
                    setRowErrors((e) => ({ ...e, [cls.id]: issueText(issue) }));
                    event.currentTarget
                      .querySelector<HTMLInputElement>('input[name="name"]')
                      ?.focus();
                    return;
                  }
                  setRowErrors((e) => ({ ...e, [cls.id]: '' }));
                  void action.run(async () => {
                    await schoolRequest(
                      'school/classes/' + cls.id,
                      {
                        name: nextName.trim(),
                        grade: cls.grade,
                        section: cls.section,
                        boardsVisible: form.get('boardsVisible') === 'on',
                      },
                      'PATCH',
                    );
                    await reload();
                  }, s('saved'));
                }}
              >
                <div className="sch-class-main">
                  <Field
                    label={c('className')}
                    error={rowErrors[cls.id]}
                    hintId={'cls-err-' + cls.id}
                  >
                    <input
                      name="name"
                      defaultValue={cls.name}
                      required
                      maxLength={40}
                      aria-invalid={!!rowErrors[cls.id]}
                      aria-describedby={rowErrors[cls.id] ? 'cls-err-' + cls.id : undefined}
                    />
                  </Field>
                  <p className="sch-class-meta">
                    {c('gradeN', { grade: cls.grade })} · {c('sectionN', { section: cls.section })}{' '}
                    · {n(members.length)} {s('students')}
                  </p>
                  <p className="sch-class-roster">
                    <span className="sr-only">{c('roster')}: </span>
                    {members.length ? (
                      <>
                        {members
                          .slice(0, 8)
                          .map((m) => m.firstName)
                          .join(', ')}
                        {members.length > 8 && ' · ' + c('andMore', { count: members.length - 8 })}
                      </>
                    ) : (
                      <span className="sch-muted">{c('noStudentsInClass')}</span>
                    )}
                  </p>
                  <label className="sch-option">
                    <input
                      name="boardsVisible"
                      type="checkbox"
                      defaultChecked={cls.boardsVisible}
                    />
                    {c('showLeaderboard')}
                  </label>
                </div>
                <div className="sch-class-actions">
                  <button disabled={action.busy}>{s('save')}</button>
                  <button
                    type="button"
                    className="sch-danger"
                    disabled={action.busy || blocked}
                    aria-describedby={blocked ? 'cls-block-' + cls.id : undefined}
                    onClick={() => {
                      if (window.confirm(c('classRemoveConfirm', { name: cls.name })))
                        void action.run(async () => {
                          await schoolRequest('school/classes/' + cls.id, {}, 'DELETE');
                          await reload();
                        }, c('classRemoved'));
                    }}
                  >
                    {s('delete')}
                  </button>
                  {blocked && (
                    <small id={'cls-block-' + cls.id} className="sch-muted">
                      {c('classRemoveBlocked', { count: members.length })}
                    </small>
                  )}
                </div>
              </form>
            );
          })}
        </div>
      )}
    </>
  );
}

// ---------- students ----------

const AVATAR_COPY: Record<(typeof AvatarSchema.options)[number], ConsoleString> = {
  fox: 'avatarFox',
  owl: 'avatarOwl',
  panda: 'avatarPanda',
  bunny: 'avatarBunny',
  whale: 'avatarWhale',
  robot: 'avatarRobot',
};

function StudentsView({ me, copy }: { me: SchoolMe; copy: Copy }) {
  const { c, s } = copy;
  const action = useSchoolAction();
  const classes = useSchoolResource<{ classes: SchoolClass[] }>('school/classes'),
    students = useSchoolResource<{ students: RosterStudent[] }>('school/students');
  const roster = students.data?.students ?? [];
  const [editing, setEditing] = useState<RosterStudent>();
  const [pins, setPins] = useState<PinCard[]>([]);
  const [csv, setCsv] = useState(''),
    [preview, setPreview] = useState(false);
  const [query, setQuery] = useState(''),
    [classFilter, setClassFilter] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const classList = classes.data?.classes ?? [];
  const className = (id: string) => classList.find((x) => x.id === id)?.name ?? '—';
  const shown = filterStudents(roster, { query, classId: classFilter });
  const nameIssue = usernameIssue(username, roster, editing?.id);
  const usernameError = (issue: UsernameIssue | null) =>
    issue === 'required'
      ? c('usernameRequired')
      : issue === 'format'
        ? c('usernameFormat')
        : issue === 'taken'
          ? c('usernameTaken')
          : '';
  const csvPreview = previewRosterCsv(
    csv,
    classList.map((x) => x.id),
    me.school.seats - roster.length,
  );
  function startEdit(student: RosterStudent | undefined) {
    setEditing(student);
    setUsername(student?.username ?? '');
    setUsernameTouched(false);
  }
  useEffect(() => {
    if (!editing) return;
    const form = formRef.current;
    form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    form
      ?.querySelector<HTMLInputElement>('input[name="firstName"]')
      ?.focus({ preventScroll: true });
  }, [editing]);
  useEffect(() => {
    if (window.location.hash === '#add-student')
      formRef.current?.querySelector<HTMLInputElement>('input[name="firstName"]')?.focus();
  }, []);
  async function reload() {
    students.reload();
    classes.reload();
  }
  function rowAction(fn: () => Promise<void>, notice: string) {
    return action.run(async () => {
      await fn();
      await reload();
    }, notice);
  }
  return (
    <>
      <ConsoleHeader title={s('students')} lead={c('studentsLead')}>
        <span className="sch-seat-meter">
          {c('seatsLine', { used: roster.length, total: me.school.seats })}
        </span>
      </ConsoleHeader>
      <ActionNotice action={action} toast />
      <ErrorNotice error={classes.error || students.error} retry={() => void reload()} />
      {pins.length > 0 && (
        <PinDialog cards={pins} code={me.school.code} onClose={() => setPins([])} />
      )}
      <form
        id="add-student"
        ref={formRef}
        key={editing?.id ?? 'new'}
        className="sch-form sch-panel-card"
        data-editing={editing ? 'true' : undefined}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const f = new FormData(event.currentTarget);
          setUsernameTouched(true);
          const firstName = String(f.get('firstName')).trim();
          const classId = String(f.get('classId'));
          const invalid = !firstName
            ? 'firstName'
            : nameIssue
              ? 'username'
              : !classId
                ? 'classId'
                : '';
          if (invalid) {
            action.setError(
              invalid === 'firstName'
                ? c('firstNameRequired')
                : invalid === 'classId'
                  ? c('classRequired')
                  : usernameError(nameIssue),
            );
            event.currentTarget.querySelector<HTMLElement>(`[name="${invalid}"]`)?.focus();
            return;
          }
          const body = {
            firstName,
            username: username.trim().toLowerCase(),
            classId,
            avatar: String(f.get('avatar')),
            language: String(f.get('language')),
          };
          const target = event.currentTarget;
          void action
            .run(
              async () => {
                if (editing) {
                  await schoolRequest('school/students/' + editing.id, body, 'PATCH');
                  startEdit(undefined);
                } else {
                  const r = await schoolRequest<PinCard>('school/students', body);
                  setPins([r]);
                }
                await reload();
              },
              editing
                ? c('studentSaved', { name: firstName })
                : c('studentAdded', { name: firstName }),
            )
            .then((ok) => {
              if (ok && !editing) {
                target.reset();
                setUsername('');
                setUsernameTouched(false);
              }
            });
        }}
      >
        <h2>{editing ? c('editStudent', { name: editing.firstName }) : c('addStudent')}</h2>
        <div className="sch-grid sch-grid-3">
          <Field label={s('firstName')}>
            <input name="firstName" required maxLength={40} defaultValue={editing?.firstName} />
          </Field>
          <Field
            label={s('username')}
            hint={c('usernameHint')}
            error={usernameTouched ? usernameError(nameIssue) : ''}
            hintId="username-hint"
          >
            <input
              name="username"
              required
              maxLength={32}
              pattern={STUDENT_USERNAME_PATTERN}
              value={username}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={usernameTouched && !!nameIssue}
              aria-describedby="username-hint"
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              onBlur={() => username && setUsernameTouched(true)}
            />
          </Field>
          <Field label={c('classLabel')}>
            <select name="classId" required defaultValue={editing?.classId ?? ''}>
              <option value="">{s('selectClass')}</option>
              {classList.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={s('language')}>
            <select name="language" defaultValue={editing?.language ?? 'bn'}>
              <option value="bn">বাংলা</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label={c('avatar')}>
            <select name="avatar" defaultValue={editing?.avatar ?? 'fox'}>
              {AvatarSchema.options.map((v) => (
                <option key={v} value={v}>
                  {c(AVATAR_COPY[v])}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="sch-toolbar">
          <button disabled={action.busy} className="sch-primary">
            {editing ? s('save') : s('newStudent')}
          </button>
          {editing && (
            <button type="button" onClick={() => startEdit(undefined)}>
              {s('cancel')}
            </button>
          )}
        </div>
      </form>
      <details className="sch-panel-card sch-import">
        <summary>{s('importCsv')}</summary>
        <p>{s('csvHelp')}</p>
        <ul className="sch-class-codes">
          {classList.map((x) => (
            <li key={x.id}>
              {x.name}: <code>{x.id}</code>
            </li>
          ))}
        </ul>
        <Field label="CSV">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void file.text().then((v) => {
                  setCsv(v);
                  setPreview(false);
                });
            }}
          />
          <textarea
            value={csv}
            onChange={(e) => {
              setCsv(e.target.value);
              setPreview(false);
            }}
            rows={5}
          />
        </Field>
        <button type="button" onClick={() => setPreview(true)} disabled={!csv.trim()}>
          {s('preview')}
        </button>
        {preview && (
          <>
            <div className="sch-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{s('firstName')}</th>
                    <th>{s('username')}</th>
                    <th>{s('classes')}</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.rows.map((row, i) => (
                    <tr key={i}>
                      <td>{row.firstName}</td>
                      <td>{row.username}</td>
                      <td>{classList.find((x) => x.id === row.classId)?.name ?? row.classId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {csvPreview.issues.map((issue, i) => (
              <p role="alert" className="sch-field-error" key={i}>
                {issue.row}: {s(issue.code)}
              </p>
            ))}
            <button
              type="button"
              className="sch-primary"
              disabled={action.busy || csvPreview.issues.length > 0 || !csvPreview.rows.length}
              onClick={() =>
                void action.run(async () => {
                  const r = await schoolRequest<{ students: PinCard[] }>('school/students/import', {
                    csv,
                  });
                  setPins(r.students);
                  setCsv('');
                  setPreview(false);
                  await reload();
                })
              }
            >
              {s('importCsv')}
            </button>
          </>
        )}
      </details>
      <div className="sch-filter-bar sch-roster-filters" role="search">
        <Field label={c('search')}>
          <input
            type="search"
            value={query}
            placeholder={c('searchPlaceholder')}
            onChange={(e) => setQuery(e.target.value)}
          />
        </Field>
        <Field label={c('classLabel')}>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">{c('allClasses')}</option>
            {classList.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        {roster.length > 0 && (
          <p className="sch-muted sch-filter-count" aria-live="polite">
            {c('shownOf', { shown: shown.length, total: roster.length })}
          </p>
        )}
      </div>
      {students.loading && !students.data ? (
        <Loading rows={5} />
      ) : !roster.length ? (
        <EmptyState title={c('studentEmpty')} body={c('studentEmptyBody')} />
      ) : !shown.length ? (
        <EmptyState
          title={c('noMatches')}
          action={
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setClassFilter('');
              }}
            >
              {c('clearFilters')}
            </button>
          }
        />
      ) : (
        <div className="sch-table-wrap">
          <table className="sch-roster-table">
            <thead>
              <tr>
                <th scope="col">{s('students')}</th>
                <th scope="col">{s('username')}</th>
                <th scope="col">{c('classLabel')}</th>
                <th scope="col">{c('status')}</th>
                <th scope="col">
                  <span className="sr-only">{c('actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {shown.map((st) => {
                const suspended = st.status === 'suspended';
                const locked = st.signIn?.locked ?? false;
                const failures = st.signIn?.failures ?? 0;
                return (
                  <tr key={st.id} data-state={suspended ? 'suspended' : undefined}>
                    <th scope="row">{st.firstName}</th>
                    <td data-label={s('username')}>
                      <code className="sch-username">{st.username}</code>
                    </td>
                    <td data-label={c('classLabel')}>{className(st.classId)}</td>
                    <td data-label={c('status')}>
                      <span className="sch-chip-row">
                        <StatusChip state={suspended ? 'suspended' : 'active'}>
                          {suspended ? c('suspended') : c('active')}
                        </StatusChip>
                        {locked ? (
                          <StatusChip state="locked">{c('locked')}</StatusChip>
                        ) : failures > 0 ? (
                          <small className="sch-muted">{c('wrongPins', { count: failures })}</small>
                        ) : null}
                      </span>
                    </td>
                    <td className="sch-row-actions">
                      <button type="button" onClick={() => startEdit(st)}>
                        {s('edit')}
                      </button>
                      <button
                        type="button"
                        disabled={action.busy || suspended}
                        onClick={() =>
                          void action.run(async () => {
                            const r = await schoolRequest<{ pin: string }>(
                              'school/students/' + st.id + '/reset-pin',
                              {},
                            );
                            setPins([{ student: st, pin: r.pin }]);
                            await reload();
                          })
                        }
                      >
                        {s('resetPin')}
                      </button>
                      {(locked || failures > 0) && (
                        <button
                          type="button"
                          disabled={action.busy}
                          onClick={() =>
                            void rowAction(
                              () => schoolRequest('school/students/' + st.id + '/unlock', {}),
                              c('unlockedNotice', { name: st.firstName }),
                            )
                          }
                        >
                          {c('unlock')}
                        </button>
                      )}
                      <details className="sch-menu">
                        <summary aria-label={c('moreActions', { name: st.firstName })}>
                          <UiIcon name="chevron" />
                        </summary>
                        <div className="sch-menu-items">
                          <button
                            type="button"
                            disabled={action.busy}
                            onClick={(event) => {
                              event.currentTarget.closest('details')?.removeAttribute('open');
                              if (
                                suspended ||
                                window.confirm(c('suspendConfirm', { name: st.firstName }))
                              )
                                void rowAction(
                                  () =>
                                    schoolRequest(
                                      'school/students/' + st.id + '/status',
                                      { status: suspended ? 'active' : 'suspended' },
                                      'PATCH',
                                    ),
                                  suspended
                                    ? c('restoredNotice', { name: st.firstName })
                                    : c('suspendedNotice', { name: st.firstName }),
                                );
                            }}
                          >
                            {suspended ? c('restore') : c('suspend')}
                          </button>
                          <button
                            type="button"
                            className="sch-danger"
                            disabled={action.busy}
                            onClick={(event) => {
                              event.currentTarget.closest('details')?.removeAttribute('open');
                              if (window.confirm(c('removeConfirm', { name: st.firstName })))
                                void rowAction(
                                  async () => {
                                    await schoolRequest('school/students/' + st.id, {}, 'DELETE');
                                    if (editing?.id === st.id) startEdit(undefined);
                                  },
                                  c('removedNotice', { name: st.firstName }),
                                );
                            }}
                          >
                            {s('delete')}
                          </button>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ---------- results view ----------

function ResultsView({ copy }: { copy: Copy }) {
  const { c, s, text, language } = copy;
  const classes = useSchoolResource<{ classes: SchoolClass[] }>('school/classes'),
    lessons = useSchoolResource<{ lessons: Lesson[] }>('school/lessons'),
    globalLessons = useSchoolResource<{ lessons: Lesson[] }>('school/lessons?scope=global');
  const [classId, setClassId] = useState(''),
    [lessonId, setLessonId] = useState('');
  const groups = groupResultLessons(
    lessons.data?.lessons ?? [],
    globalLessons.data?.lessons ?? [],
    language,
  );
  const all = [...groups.school, ...groups.shared];
  const option = (l: Lesson) => (
    <option key={l.id} value={l.id}>
      {text(l.title) || c('untitled')}
      {l.status !== 'published' ? ` · ${s(l.status)}` : ''}
    </option>
  );
  return (
    <>
      <ConsoleHeader title={s('results')} lead={c('resultsLead')} />
      <div className="sch-filter-bar sch-results-filters">
        <Field label={c('classLabel')}>
          <select
            value={classId}
            disabled={classes.loading || Boolean(classes.error)}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">{s('selectClass')}</option>
            {classes.data?.classes.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={c('lessonLabel')}>
          <select
            value={lessonId}
            disabled={
              lessons.loading ||
              globalLessons.loading ||
              Boolean(lessons.error || globalLessons.error)
            }
            onChange={(e) => setLessonId(e.target.value)}
          >
            <option value="">{s('selectLesson')}</option>
            {groups.school.length > 0 && (
              <optgroup label={c('schoolGroup')}>{groups.school.map(option)}</optgroup>
            )}
            {groups.shared.length > 0 && (
              <optgroup label={c('sharedGroup')}>{groups.shared.map(option)}</optgroup>
            )}
          </select>
        </Field>
      </div>
      <ErrorNotice error={classes.error} retry={classes.reload} />
      <ErrorNotice
        error={lessons.error || globalLessons.error}
        retry={() => {
          lessons.reload();
          globalLessons.reload();
        }}
      />
      {classId && lessonId ? (
        <ClassResults
          key={`${classId}:${lessonId}`}
          classId={classId}
          lessonId={lessonId}
          lesson={all.find((candidate) => candidate.id === lessonId)}
        />
      ) : (
        <EmptyState title={s('chooseResultsFilters')} body={c('resultsEmptyBody')} />
      )}
    </>
  );
}

function LeaderboardView({ copy }: { copy: Copy }) {
  const { s } = copy;
  const classes = useSchoolResource<{ classes: SchoolClass[] }>('school/classes');
  const [classId, setClassId] = useState('');
  return (
    <>
      <ConsoleHeader title={s('leaderboard')} />
      <ErrorNotice error={classes.error} retry={classes.reload} />
      <Leaderboard
        teacher
        classId={classId}
        scopeLabel={classes.data?.classes.find((x) => x.id === classId)?.name ?? s('wholeSchool')}
        scopeControl={
          <Field label={s('leaderboardScope')}>
            <select
              value={classId}
              disabled={classes.loading || Boolean(classes.error)}
              onChange={(e) => setClassId(e.target.value)}
            >
              <option value="">{s('wholeSchool')}</option>
              <optgroup label={s('classes')}>
                {classes.data?.classes.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
        }
      />
    </>
  );
}

export function SchoolConsole({ view }: { view: View }) {
  const copy = useConsoleCopy();
  const me = useSchoolSession() as SchoolMe | null;
  if (!me) return null;
  if (view === 'leaderboard') return <LeaderboardView copy={copy} />;
  if (view === 'results') return <ResultsView copy={copy} />;
  if (view === 'classes') return <ClassesView copy={copy} />;
  if (view === 'students') return <StudentsView me={me} copy={copy} />;
  return <Overview me={me} />;
}
