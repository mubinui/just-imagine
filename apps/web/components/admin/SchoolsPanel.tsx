'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError, uiNumber } from '../../lib/i18n/ui';
import { useCallback, useState } from 'react';
import type { School } from '../../lib/school/types';
import { adminRequest, useAdminResource } from './adminApi';
import { formatWhen } from './format';
import {
  CopyButton,
  Drawer,
  Empty,
  Field,
  FormResult,
  LoadError,
  PageHeading,
  ReasonField,
  Skeleton,
  Status,
  reasonReady,
} from './parts';

type Invite = { id: string; email: string; expiresAt: number };
type SchoolDetail = { school: School; invites?: Invite[] };
type Draft = {
  name: string;
  nameBn: string;
  seats: string;
  voiceMinutes: string;
  status: School['status'];
  reason: string;
};

const loadSchools = () => adminRequest<{ schools: School[] }>('schools');
const blank: Draft = {
  name: '',
  nameBn: '',
  seats: '60',
  voiceMinutes: '60',
  status: 'active',
  reason: '',
};
const draftOf = (school: School): Draft => ({
  name: school.name,
  nameBn: school.nameBn,
  seats: String(school.seats),
  voiceMinutes: String(Math.round(school.voiceSecondsPerDay / 60)),
  status: school.status,
  reason: '',
});
const failureText = (e: unknown) =>
  e instanceof Error ? uiError(e) : uiText('That change did not go through. Try again.');

export function SchoolsPanel() {
  const { language } = useLanguage();
  const { data, error, loading, reload } = useAdminResource(loadSchools);
  // undefined: closed; null: adding a school; a school: editing it.
  const [open, setOpen] = useState<School | null>();
  const display = (s: School) => (language === 'bn' && s.nameBn ? s.nameBn : s.name);
  return (
    <>
      <PageHeading
        title={uiText('Schools')}
        detail={uiText(
          'School accounts, seats, daily voice time and teacher invitations. Every change is recorded in the audit log.',
        )}
        onRefresh={() => void reload()}
        busy={loading}
      />
      <LoadError message={error} onRetry={() => void reload()} />
      <section className="adm-section" aria-labelledby="school-list">
        <div className="adm-section-head">
          <h2 id="school-list">{uiText('All schools')}</h2>
          <button type="button" className="adm-button adm-primary" onClick={() => setOpen(null)}>
            {uiText('Add a school')}
          </button>
        </div>
        {!data ? (
          loading && <Skeleton rows={4} />
        ) : data.schools.length === 0 ? (
          <Empty title={uiText('No schools yet.')}>
            {uiText('Add a school to give it a sign-in code and invite its first teacher.')}
          </Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-cards">
              <thead>
                <tr>
                  <th scope="col">{uiText('School')}</th>
                  <th scope="col">{uiText('School code')}</th>
                  <th scope="col" className="num">
                    {uiText('Students / seats')}
                  </th>
                  <th scope="col" className="num">
                    {uiText('Teachers')}
                  </th>
                  <th scope="col" className="num">
                    {uiText('Daily voice')}
                  </th>
                  <th scope="col">{uiText('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {data.schools.map((school) => (
                  <tr key={school.id}>
                    <th scope="row" data-label={uiText('School')}>
                      <button
                        type="button"
                        className="adm-row-open"
                        aria-haspopup="dialog"
                        onClick={() => setOpen(school)}
                      >
                        {display(school)}
                      </button>
                    </th>
                    <td data-label={uiText('School code')}>
                      <code translate="no">{school.code}</code>
                    </td>
                    <td className="num" data-label={uiText('Students / seats')}>
                      {`${uiNumber(school.studentCount ?? school.students ?? 0)} / ${uiNumber(school.seats)}`}
                    </td>
                    <td className="num" data-label={uiText('Teachers')}>
                      {uiNumber(school.teacherCount ?? school.teachers ?? 0)}
                    </td>
                    <td className="num" data-label={uiText('Daily voice')}>
                      {uiText('{v0} min', { v0: Math.round(school.voiceSecondsPerDay / 60) })}
                    </td>
                    <td data-label={uiText('Status')}>
                      {school.status === 'active' ? (
                        <Status tone="good">{uiText('Active')}</Status>
                      ) : (
                        <Status tone="bad">{uiText('Paused')}</Status>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {open !== undefined && (
        <SchoolDrawer
          key={open?.id ?? 'new'}
          school={open}
          onClose={() => setOpen(undefined)}
          onSaved={() => void reload()}
        />
      )}
    </>
  );
}

function SchoolDrawer({
  school: initial,
  onClose,
  onSaved,
}: {
  school: School | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  useLanguage();
  const [school, setSchool] = useState(initial);
  const [draft, setDraft] = useState<Draft>(initial ? draftOf(initial) : blank);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const seats = Number(draft.seats);
  const minutes = Number(draft.voiceMinutes);
  const valid =
    draft.name.trim() &&
    draft.nameBn.trim() &&
    Number.isInteger(seats) &&
    seats >= 1 &&
    Number.isFinite(minutes) &&
    minutes >= 0 &&
    reasonReady(draft.reason);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setNotice('');
    setFailure('');
    const body = {
      name: draft.name.trim(),
      nameBn: draft.nameBn.trim(),
      seats,
      voiceSecondsPerDay: Math.round(minutes * 60),
      reason: draft.reason.trim(),
    };
    try {
      const response = school
        ? await adminRequest<{ school: School }>('schools/' + school.id, 'PATCH', {
            ...body,
            status: draft.status,
          })
        : await adminRequest<{ school: School }>('schools', 'POST', body);
      // Keep the counts the list knows; the write returns the stored document.
      const saved = { ...school, ...response.school };
      setSchool(saved);
      setDraft(draftOf(saved));
      setNotice(
        school
          ? uiText('Changes saved. Recorded in the audit log.')
          : uiText('School created with code {v0}. Invite its first teacher below.', {
              v0: saved.code,
            }),
      );
      onSaved();
    } catch (e) {
      setFailure(failureText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      title={school ? school.name : uiText('Add a school')}
      titleId="school-title"
      onClose={onClose}
    >
      {school && (
        <dl className="adm-facts">
          <div>
            <dt>{uiText('School code')}</dt>
            <dd>
              <code translate="no">{school.code}</code>
            </dd>
          </div>
          <div>
            <dt>{uiText('Created')}</dt>
            <dd>{formatWhen(school.createdAt)}</dd>
          </div>
        </dl>
      )}
      <form className="adm-form adm-drawer-section" onSubmit={(e) => void submit(e)}>
        <h3>{school ? uiText('School details') : uiText('New school')}</h3>
        <div className="adm-form-grid">
          <Field label={uiText('Name in English')}>
            <input
              value={draft.name}
              onChange={(e) => set({ name: e.target.value })}
              required
              maxLength={120}
              autoComplete="off"
            />
          </Field>
          <Field label={uiText('Name in Bangla')}>
            <input
              lang="bn"
              value={draft.nameBn}
              onChange={(e) => set({ nameBn: e.target.value })}
              required
              maxLength={120}
              autoComplete="off"
            />
          </Field>
          <Field label={uiText('Seats')} hint={uiText('Student accounts this school can hold.')}>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={draft.seats}
              onChange={(e) => set({ seats: e.target.value })}
              required
            />
          </Field>
          <Field
            label={uiText('Daily voice minutes')}
            hint={uiText('Shared by every student in the school.')}
          >
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.voiceMinutes}
              onChange={(e) => set({ voiceMinutes: e.target.value })}
              required
            />
          </Field>
          {school && (
            <Field label={uiText('Status')}>
              <select
                value={draft.status}
                onChange={(e) =>
                  set({ status: e.target.value === 'suspended' ? 'suspended' : 'active' })
                }
              >
                <option value="active">{uiText('Active')}</option>
                <option value="suspended">{uiText('Paused')}</option>
              </select>
            </Field>
          )}
        </div>
        <ReasonField
          id="school-reason"
          value={draft.reason}
          onChange={(reason) => set({ reason })}
        />
        <div className="adm-toolbar">
          <button type="submit" className="adm-button adm-primary" disabled={!valid || busy}>
            {busy ? uiText('Saving…') : school ? uiText('Save changes') : uiText('Create school')}
          </button>
        </div>
        {!reasonReady(draft.reason) && (
          <p className="adm-detail">{uiText('Write a reason first; every change is audited.')}</p>
        )}
        <FormResult notice={notice} failure={failure} />
      </form>
      {school && <Invites school={school} />}
    </Drawer>
  );
}

function Invites({ school }: { school: School }) {
  useLanguage();
  const load = useCallback(() => adminRequest<SchoolDetail>('schools/' + school.id), [school.id]);
  const detail = useAdminResource(load);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [link, setLink] = useState('');
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');

  async function run(work: () => Promise<void>, success: string) {
    setBusy(true);
    setNotice('');
    setFailure('');
    try {
      await work();
      setNotice(success);
      void detail.reload();
      return true;
    } catch (e) {
      setFailure(failureText(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const invites = detail.data?.invites ?? [];
  return (
    <section className="adm-drawer-section" aria-labelledby="school-invites">
      <h3 id="school-invites">{uiText('Teacher invitations')}</h3>
      <form
        className="adm-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (busy || !email.trim() || !reasonReady(reason)) return;
          void run(async () => {
            const response = await adminRequest<{ inviteUrl: string }>(
              `schools/${school.id}/invites`,
              'POST',
              { email: email.trim(), reason: reason.trim() },
            );
            setLink(response.inviteUrl);
            setEmail('');
            setReason('');
          }, uiText('Invitation created. Recorded in the audit log.'));
        }}
      >
        <div className="adm-form-grid">
          <Field label={uiText('Teacher email')}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          <ReasonField id="invite-reason" value={reason} onChange={setReason} />
        </div>
        <div className="adm-toolbar">
          <button
            type="submit"
            className="adm-button adm-primary"
            disabled={busy || !email.trim() || !reasonReady(reason)}
          >
            {uiText('Send invitation')}
          </button>
        </div>
      </form>
      {link && (
        <div className="adm-once">
          <p>
            {uiText(
              'Copy this link now and send it to the teacher. It is shown only once and works for 7 days.',
            )}
          </p>
          <div className="adm-once-row">
            <input value={link} readOnly aria-label={uiText('Invitation link')} />
            <CopyButton value={link} label={uiText('Copy invitation link')} />
          </div>
        </div>
      )}
      <FormResult notice={notice} failure={failure} />
      <h4 className="adm-subhead">{uiText('Waiting to be accepted')}</h4>
      <LoadError message={detail.error} onRetry={() => void detail.reload()} />
      {!detail.data ? (
        detail.loading && <Skeleton rows={2} />
      ) : invites.length === 0 ? (
        <p className="adm-detail">{uiText('No open invitations.')}</p>
      ) : (
        <ul className="adm-list">
          {invites.map((invite) => (
            <li key={invite.id}>
              <div className="adm-list-row">
                <div>
                  <span className="adm-email">{invite.email}</span>
                  <small>{uiText('Expires {v0}', { v0: formatWhen(invite.expiresAt) })}</small>
                </div>
                {revoking !== invite.id && (
                  <button
                    type="button"
                    className="adm-button adm-quiet"
                    onClick={() => {
                      setRevoking(invite.id);
                      setRevokeReason('');
                    }}
                  >
                    {uiText('Revoke')}
                  </button>
                )}
              </div>
              {revoking === invite.id && (
                <form
                  className="adm-inline-confirm"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (busy || !reasonReady(revokeReason)) return;
                    void run(async () => {
                      await adminRequest(`schools/${school.id}/invites/${invite.id}`, 'DELETE', {
                        reason: revokeReason.trim(),
                      });
                      setRevoking(null);
                    }, uiText('Invitation revoked. Recorded in the audit log.'));
                  }}
                >
                  <ReasonField
                    id={'revoke-' + invite.id}
                    value={revokeReason}
                    onChange={setRevokeReason}
                  />
                  <div className="adm-toolbar">
                    <button
                      type="submit"
                      className="adm-button adm-destructive"
                      disabled={busy || !reasonReady(revokeReason)}
                    >
                      {uiText('Revoke invitation')}
                    </button>
                    <button type="button" className="adm-button" onClick={() => setRevoking(null)}>
                      {uiText('Cancel')}
                    </button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
