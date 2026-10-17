'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { previewRosterCsv } from '../../lib/school/csv';
import { firstTryResult } from '../../lib/school/results';
import type { AttemptDoc } from '@just-imagine/protocol';
import { toDataURL } from 'qrcode';
import Image from 'next/image';
import { schoolRequest, useSchoolResource } from '../../lib/school/api';
import type { SchoolMe, SchoolClass, Student, PinCard, Lesson } from '../../lib/school/types';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { useSchoolSession } from './SchoolShell';
import { Field, ErrorNotice, Loading, ActionNotice, useSchoolAction } from './shared';
import { Leaderboard } from '../study/Leaderboard';
export function PinSheet({
  cards,
  code,
  onClose,
}: {
  cards: PinCard[];
  code: string;
  onClose: () => void;
}) {
  const { s } = useSchoolLanguage();
  const [qr, setQr] = useState('');
  useEffect(() => {
    void toDataURL(window.location.origin + '/study/sign-in', { margin: 1, width: 160 }).then(
      setQr,
    );
  }, []);
  return (
    <section className="sch-pin-print sch-drawer">
      <div className="sch-toolbar">
        <h2>{s('printPins')}</h2>
        <button onClick={() => window.print()}>{s('printPins')}</button>
        <button onClick={onClose}>{s('close')}</button>
      </div>
      <p className="sch-notice">{s('pinsOnce')}</p>
      <div className="sch-pin-grid">
        {cards.map(({ student, pin }) => (
          <article className="sch-pin" key={student.id}>
            {qr && <Image src={qr} width={100} height={100} unoptimized alt="Study sign-in QR" />}
            <strong>{student.firstName}</strong>
            <p>
              {s('schoolCode')}: {code}
            </p>
            <p>
              {s('username')}: {student.username}
            </p>
            <p>
              PIN: <code>{pin}</code>
            </p>
            <small>
              {typeof window !== 'undefined' ? window.location.origin : ''}/study/sign-in
            </small>
          </article>
        ))}
      </div>
      <p>{s('printHelp')}</p>
    </section>
  );
}
export function SchoolConsole({
  view,
}: {
  view: 'home' | 'classes' | 'students' | 'results' | 'leaderboard';
}) {
  const { s, text } = useSchoolLanguage(),
    me = useSchoolSession() as SchoolMe | null,
    action = useSchoolAction();
  const classes = useSchoolResource<{ classes: SchoolClass[] }>('school/classes'),
    students = useSchoolResource<{ students: Student[] }>('school/students'),
    lessons = useSchoolResource<{ lessons: Lesson[] }>('school/lessons');
  const [editing, setEditing] = useState<Student>(),
    [pins, setPins] = useState<PinCard[]>([]),
    [csv, setCsv] = useState(''),
    [preview, setPreview] = useState(false),
    [classId, setClassId] = useState(''),
    [lessonId, setLessonId] = useState('');
  const results = useSchoolResource<{
    lesson: Pick<Lesson, 'id' | 'title' | 'revision'> & { quizItemIds: string[] };
    students: {
      student: Student;
      attempt: AttemptDoc | null;
    }[];
  }>(
    view === 'results' && classId && lessonId
      ? `school/results?classId=${encodeURIComponent(classId)}&lessonId=${encodeURIComponent(lessonId)}`
      : null,
  );
  async function mutate(path: string, body?: unknown, method?: string) {
    await schoolRequest(path, body, method);
    classes.reload();
    students.reload();
  }
  const csvPreview = previewRosterCsv(
    csv,
    classes.data?.classes.map((c) => c.id) ?? [],
    (me?.school.seats ?? 0) - (students.data?.students.length ?? 0),
  );
  if (!me) return null;
  if (view === 'leaderboard')
    return (
      <>
        <h1>{s('leaderboard')}</h1>
        <Field label={s('selectClass')}>
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">{s('schoolBoard')}</option>
            {classes.data?.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Leaderboard teacher classId={classId} />
      </>
    );
  if (view === 'results')
    return (
      <>
        <h1>{s('results')}</h1>
        <div className="sch-grid">
          <Field label={s('classes')}>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">{s('selectClass')}</option>
              {classes.data?.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={s('lessons')}>
            <select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">{s('lessons')}</option>
              {lessons.data?.lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {text(l.title)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <ErrorNotice error={results.error} retry={results.reload} />
        {results.data && (
          <div className="sch-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{s('students')}</th>
                  <th>{s('completion')}</th>
                  <th>{s('points')}</th>
                  <th>{s('firstTry')}</th>
                  <th>{s('results')}</th>
                </tr>
              </thead>
              <tbody>
                {results.data.students.map(({ student, attempt }) => {
                  const firstTry = firstTryResult(results.data!.lesson.quizItemIds, attempt);
                  return (
                    <tr key={student.id}>
                      <td>{student.firstName}</td>
                      <td>
                        {attempt
                          ? attempt.completedAt
                            ? s('completed')
                            : `${Object.values(attempt.items).filter((i) => i.correct).length}/${Object.keys(attempt.items).length}`
                          : s('notStarted')}
                      </td>
                      <td>{attempt?.pointsAwarded ?? 0}</td>
                      <td title={attempt && !firstTry ? s('firstTryUnavailable') : undefined}>
                        {firstTry
                          ? `${firstTry.correct}/${firstTry.total}`
                          : attempt
                            ? s('historyUnavailable')
                            : '—'}
                      </td>
                      <td>
                        {attempt &&
                          Object.entries(attempt.items).map(([id, r]) => (
                            <span key={id}>
                              {id}: {r.correct ? s('correct') : s('tryAgain')} ({r.tries})<br />
                            </span>
                          ))}
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
  return (
    <>
      <div className="sch-toolbar">
        <h1>{s(view === 'home' ? 'school' : view)}</h1>
        <button
          onClick={() => {
            classes.reload();
            students.reload();
          }}
        >
          {s('refresh')}
        </button>
      </div>
      <ActionNotice action={action} />
      <ErrorNotice
        error={classes.error || students.error}
        retry={() => {
          classes.reload();
          students.reload();
        }}
      />
      {pins.length > 0 && (
        <PinSheet cards={pins} code={me.school.code} onClose={() => setPins([])} />
      )}
      {view === 'home' ? (
        <>
          <p className="sch-summary">{s('schoolConsole')}</p>
          <p>
            {me.school.name} · {me.school.code}
          </p>
          <div className="sch-list">
            {[
              ['classes', classes.data?.classes.length],
              ['students', students.data?.students.length],
              ['lessons', lessons.data?.lessons.length],
            ].map(([name, count]) => (
              <Link className="sch-subject" href={'/school/' + name} key={name}>
                <h2>{s(name as 'classes')}</h2>
                <p>{count ?? '—'}</p>
              </Link>
            ))}
          </div>
        </>
      ) : view === 'classes' ? (
        <>
          <form
            className="sch-inline-form sch-section"
            action={(form) =>
              void action.run(async () => {
                await mutate('school/classes', {
                  name: String(form.get('name')),
                  grade: Number(form.get('grade')),
                  section: String(form.get('section')),
                });
              }, s('saved'))
            }
          >
            <Field label={s('name')}>
              <input name="name" required maxLength={40} />
            </Field>
            <Field label={s('grade')}>
              <select name="grade">
                <option>9</option>
                <option>10</option>
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
            <Loading />
          ) : (
            <div className="sch-list">
              {classes.data?.classes.map((c) => (
                <form
                  key={c.id}
                  className="sch-list-row"
                  action={(f) =>
                    void action.run(async () => {
                      await mutate(
                        'school/classes/' + c.id,
                        {
                          name: String(f.get('name')),
                          grade: c.grade,
                          section: c.section,
                          boardsVisible: f.get('boardsVisible') === 'on',
                        },
                        'PATCH',
                      );
                    }, s('saved'))
                  }
                >
                  <div>
                    <input aria-label={s('name')} name="name" defaultValue={c.name} required />
                    <p>
                      {s('grade')} {c.grade} · {c.section} ·{' '}
                      {students.data?.students.filter((st) => st.classId === c.id).length ?? 0}{' '}
                      {s('students')}
                    </p>
                    <small>classId: {c.id}</small>
                    <label className="sch-option">
                      <input
                        name="boardsVisible"
                        type="checkbox"
                        defaultChecked={c.boardsVisible}
                      />
                      {s('leaderboard')}
                    </label>
                  </div>
                  <button disabled={action.busy}>{s('save')}</button>
                  <button
                    type="button"
                    className="sch-danger"
                    disabled={
                      action.busy ||
                      Boolean(students.data?.students.some((st) => st.classId === c.id))
                    }
                    onClick={() => {
                      if (window.confirm(s('removeWarning')))
                        void action.run(() => mutate('school/classes/' + c.id, {}, 'DELETE'));
                    }}
                  >
                    {s('delete')}
                  </button>
                </form>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <p>
            {s('seatHelp')}: {students.data?.students.length ?? '—'} / {me.school.seats}
          </p>
          <form
            key={editing?.id ?? 'new'}
            className="sch-form sch-section"
            action={(f) =>
              void action.run(async () => {
                const body = {
                  firstName: String(f.get('firstName')),
                  username: String(f.get('username')),
                  classId: String(f.get('classId')),
                  avatar: String(f.get('avatar')),
                  language: String(f.get('language')),
                };
                if (editing) {
                  await mutate('school/students/' + editing.id, body, 'PATCH');
                  setEditing(undefined);
                } else {
                  const r = await schoolRequest<PinCard>('school/students', body);
                  setPins([r]);
                  students.reload();
                }
              }, s('saved'))
            }
          >
            <h2>{s(editing ? 'edit' : 'newStudent')}</h2>
            <div className="sch-grid">
              <Field label={s('firstName')}>
                <input name="firstName" required maxLength={40} defaultValue={editing?.firstName} />
              </Field>
              <Field label={s('username')}>
                <input
                  name="username"
                  required
                  maxLength={32}
                  defaultValue={editing?.username}
                  autoCapitalize="none"
                />
              </Field>
              <Field label={s('classes')}>
                <select name="classId" required defaultValue={editing?.classId}>
                  <option value="">{s('selectClass')}</option>
                  {classes.data?.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
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
              <Field label="Avatar">
                <select name="avatar" defaultValue={editing?.avatar ?? 'fox'}>
                  {['fox', 'owl', 'panda', 'bunny', 'whale', 'robot'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="sch-toolbar">
              <button disabled={action.busy} className="sch-primary">
                {s(editing ? 'save' : 'newStudent')}
              </button>
              {editing && (
                <button type="button" onClick={() => setEditing(undefined)}>
                  {s('cancel')}
                </button>
              )}
            </div>
          </form>
          <details className="sch-section">
            <summary>{s('importCsv')}</summary>
            <p>{s('csvHelp')}</p>
            <ul>
              {classes.data?.classes.map((c) => (
                <li key={c.id}>
                  {c.name}: <code>{c.id}</code>
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
            <button onClick={() => setPreview(true)} disabled={!csv.trim()}>
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
                          <td>
                            {classes.data?.classes.find((c) => c.id === row.classId)?.name ??
                              row.classId}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {csvPreview.issues.map((issue, i) => (
                  <p role="alert" key={i}>
                    {issue.row}: {s(issue.code)}
                  </p>
                ))}
                <button
                  className="sch-primary"
                  disabled={action.busy || csvPreview.issues.length > 0 || !csvPreview.rows.length}
                  onClick={() =>
                    void action.run(async () => {
                      const r = await schoolRequest<{ students: PinCard[] }>(
                        'school/students/import',
                        { csv },
                      );
                      setPins(r.students);
                      setCsv('');
                      setPreview(false);
                      students.reload();
                    })
                  }
                >
                  {s('importCsv')}
                </button>
              </>
            )}
          </details>
          <div className="sch-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{s('students')}</th>
                  <th>{s('username')}</th>
                  <th>{s('classes')}</th>
                  <th>{s('edit')}</th>
                </tr>
              </thead>
              <tbody>
                {students.data?.students.map((st) => (
                  <tr key={st.id}>
                    <td>{st.firstName}</td>
                    <td>{st.username}</td>
                    <td>
                      {classes.data?.classes.find((c) => c.id === st.classId)?.name ?? st.classId}
                    </td>
                    <td>
                      <div className="sch-toolbar">
                        <button onClick={() => setEditing(st)}>{s('edit')}</button>
                        <button
                          disabled={action.busy}
                          onClick={() =>
                            void action.run(async () => {
                              const r = await schoolRequest<{ pin: string }>(
                                'school/students/' + st.id + '/reset-pin',
                                {},
                              );
                              setPins([{ student: st, pin: r.pin }]);
                            })
                          }
                        >
                          {s('resetPin')}
                        </button>
                        <button
                          className="sch-danger"
                          disabled={action.busy}
                          onClick={() => {
                            if (window.confirm(s('removeWarning')))
                              void action.run(() =>
                                mutate('school/students/' + st.id, {}, 'DELETE'),
                              );
                          }}
                        >
                          {s('delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
