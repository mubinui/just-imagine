'use client';
import { useState } from 'react';
import { schoolRequest, useSchoolResource } from '../../lib/school/api';
import type { School } from '../../lib/school/types';
import { useSchoolLanguage } from '../../lib/i18n/study';
import {
  Field,
  Loading,
  ErrorNotice,
  ActionNotice,
  useSchoolAction,
  LanguageSwitch,
} from '../school/shared';
import '../../app/school.css';
export function SchoolsPanel() {
  const { s } = useSchoolLanguage(),
    r = useSchoolResource<{ schools: School[] }>('admin/schools'),
    action = useSchoolAction();
  const [selected, setSelected] = useState<School>(),
    [invite, setInvite] = useState('');
  const detail = useSchoolResource<{
    school: School;
    invites?: { id: string; email: string; expiresAt: number }[];
  }>(selected ? 'admin/schools/' + selected.id : null);
  return (
    <div className="sch sch-panel">
      <div className="sch-toolbar">
        <h1>{s('schools')}</h1>
        <LanguageSwitch />
        <button onClick={r.reload}>{s('refresh')}</button>
      </div>
      <ActionNotice action={action} />
      <ErrorNotice error={r.error} retry={r.reload} />
      <form
        className="sch-form sch-section"
        action={(f) =>
          void action.run(async () => {
            const x = await schoolRequest<{ school: School }>('admin/schools', {
              name: String(f.get('name')),
              nameBn: String(f.get('nameBn')),
              seats: Number(f.get('seats')),
              voiceSecondsPerDay: Number(f.get('voiceSecondsPerDay')),
              reason: String(f.get('reason')),
            });
            setSelected(x.school);
            r.reload();
          }, s('saved'))
        }
      >
        <div className="sch-grid">
          <Field label={s('nameEn')}>
            <input name="name" required maxLength={120} />
          </Field>
          <Field label={s('nameBn')}>
            <input name="nameBn" required maxLength={120} />
          </Field>
          <Field label={s('capacity')}>
            <input name="seats" type="number" min="1" defaultValue="60" required />
          </Field>
          <Field label={s('voiceQuota')}>
            <input name="voiceSecondsPerDay" type="number" min="0" defaultValue="3600" required />
          </Field>
        </div>
        <Field label={s('reason')}>
          <input name="reason" minLength={3} required />
        </Field>
        <button className="sch-primary" disabled={action.busy}>
          {s('create')}
        </button>
      </form>
      {r.loading ? (
        <Loading />
      ) : (
        <div className="sch-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{s('school')}</th>
                <th>{s('schoolCode')}</th>
                <th>{s('capacity')}</th>
                <th>{s('teacher')}</th>
                <th>{s('active')}</th>
              </tr>
            </thead>
            <tbody>
              {r.data?.schools.map((sc) => (
                <tr key={sc.id}>
                  <td>
                    <button
                      onClick={() => {
                        setSelected(sc);
                        setInvite('');
                      }}
                    >
                      {sc.name}
                    </button>
                  </td>
                  <td>{sc.code}</td>
                  <td>
                    {sc.seatsUsed ?? sc.studentCount ?? sc.students ?? '—'} / {sc.seats}
                  </td>
                  <td>{sc.teacherCount ?? sc.teachers ?? '—'}</td>
                  <td>
                    <span className="sch-status" data-state={sc.status}>
                      {s(sc.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && (
        <section className="sch-drawer">
          <header>
            <h2>{selected.name}</h2>
            <button
              onClick={() => {
                setSelected(undefined);
                setInvite('');
              }}
            >
              {s('close')}
            </button>
          </header>
          <ErrorNotice error={detail.error} retry={detail.reload} />
          <form
            className="sch-form"
            key={selected.id}
            action={(f) =>
              void action.run(async () => {
                await schoolRequest(
                  'admin/schools/' + selected.id,
                  {
                    name: String(f.get('name')),
                    nameBn: String(f.get('nameBn')),
                    seats: Number(f.get('seats')),
                    voiceSecondsPerDay: Number(f.get('voiceSecondsPerDay')),
                    status: String(f.get('status')),
                    reason: String(f.get('reason')),
                  },
                  'PATCH',
                );
                r.reload();
                detail.reload();
              }, s('saved'))
            }
          >
            <div className="sch-grid">
              <Field label={s('nameEn')}>
                <input name="name" required defaultValue={selected.name} />
              </Field>
              <Field label={s('nameBn')}>
                <input name="nameBn" required defaultValue={selected.nameBn} />
              </Field>
              <Field label={s('capacity')}>
                <input name="seats" type="number" min="1" required defaultValue={selected.seats} />
              </Field>
              <Field label={s('voiceQuota')}>
                <input
                  name="voiceSecondsPerDay"
                  type="number"
                  min="0"
                  required
                  defaultValue={selected.voiceSecondsPerDay}
                />
              </Field>
              <Field label={s('active')}>
                <select name="status" defaultValue={selected.status}>
                  <option value="active">{s('active')}</option>
                  <option value="suspended">{s('suspended')}</option>
                </select>
              </Field>
              <Field label={s('reason')}>
                <input name="reason" required minLength={3} />
              </Field>
            </div>
            <button disabled={action.busy}>{s('save')}</button>
          </form>
          <h3>{s('invite')}</h3>
          <form
            className="sch-inline-form"
            action={(f) =>
              void action.run(async () => {
                const x = await schoolRequest<{ inviteUrl: string }>(
                  'admin/schools/' + selected.id + '/invites',
                  { email: String(f.get('email')), reason: String(f.get('reason')) },
                );
                setInvite(x.inviteUrl);
                detail.reload();
              })
            }
          >
            <Field label={s('email')}>
              <input type="email" name="email" required />
            </Field>
            <Field label={s('reason')}>
              <input name="reason" required minLength={3} />
            </Field>
            <button disabled={action.busy}>{s('invite')}</button>
          </form>
          {invite && (
            <div className="sch-notice">
              <p>{s('inviteOnce')}</p>
              <input value={invite} readOnly aria-label={s('invite')} />
              <button onClick={() => void navigator.clipboard.writeText(invite)}>
                {s('copy')}
              </button>
            </div>
          )}
          {detail.data?.invites?.map((i) => (
            <form
              className="sch-list-row"
              key={i.id}
              action={(f) =>
                void action.run(async () => {
                  await schoolRequest(
                    `admin/schools/${selected.id}/invites/${i.id}`,
                    { reason: String(f.get('reason')) },
                    'DELETE',
                  );
                  detail.reload();
                })
              }
            >
              <div>
                {i.email}
                <br />
                <small>{new Date(i.expiresAt).toLocaleDateString()}</small>
              </div>
              <input
                name="reason"
                aria-label={s('reason')}
                placeholder={s('reason')}
                minLength={3}
                required
              />
              <button disabled={action.busy}>{s('revoke')}</button>
            </form>
          ))}
        </section>
      )}
    </div>
  );
}
