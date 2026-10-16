'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deletionConfirmationFor,
  type AdminFamilyDetail,
  type AdminWriteResponse,
} from '@just-imagine/protocol';
import { adminApi, useAdminResource } from './adminApi';
import { ageBandSummary, canConfirmDeletion, formatWhen, planLabel } from './format';
import { LoadError, ReasonField, Skeleton, Status, reasonReady } from './parts';

function Meter({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
}) {
  return (
    <div className="adm-meter">
      <div>
        <span>{label}</span>
        <span className="num">
          {used} of {limit} {unit}
        </span>
      </div>
      <progress
        max={limit || 1}
        value={Math.min(used, limit)}
        aria-label={`${label}: ${used} of ${limit} ${unit}`}
      />
    </div>
  );
}

export function FamilyDrawer({
  uid,
  onClose,
  onChanged,
  onDeleted,
}: {
  uid: string;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const load = useCallback(() => adminApi<AdminFamilyDetail>('family', { params: { uid } }), [uid]);
  const { data, error, loading, reload } = useAdminResource(load);
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  useEffect(() => {
    const el = dialog.current;
    if (el && !el.open) el.showModal();
  }, []);

  async function act(
    label: string,
    run: () => Promise<AdminWriteResponse>,
    after: () => void = () => {
      void reload();
      onChanged();
    },
  ) {
    setBusy(true);
    setFailure('');
    setNotice('');
    try {
      await run();
      setNotice(`${label}. Recorded in the audit log.`);
      setReason('');
      after();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'That change did not go through. Try again.');
    } finally {
      setBusy(false);
    }
  }
  const ready = reasonReady(reason) && !busy;
  const body = { reason: reason.trim() };
  return (
    <dialog
      ref={dialog}
      className="adm-drawer"
      aria-labelledby="family-title"
      onClose={onClose}
      onCancel={onClose}
    >
      <div className="adm-drawer-head">
        <h2 id="family-title">{data?.email ?? 'Family'}</h2>
        <button type="button" className="adm-button" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </div>
      <LoadError message={error} />
      {!data ? (
        loading && <Skeleton rows={6} />
      ) : (
        <>
          <dl className="adm-facts">
            <div>
              <dt>Plan</dt>
              <dd>{planLabel(data)}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>
                {data.deletionPending ? (
                  <Status tone="bad">Deletion in progress</Status>
                ) : data.suspended ? (
                  <Status tone="bad">Suspended</Status>
                ) : (
                  <Status tone="good">Active</Status>
                )}
                {data.suspendedReason && (
                  <span className="adm-detail"> {data.suspendedReason}</span>
                )}
              </dd>
            </div>
            <div>
              <dt>Explorers</dt>
              <dd>{ageBandSummary(data.children)}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatWhen(data.createdAt)}</dd>
            </div>
            <div>
              <dt>Billing</dt>
              <dd>
                {data.subscriptionStatus
                  ? `Stripe subscription ${data.subscriptionStatus.replace('_', ' ')}`
                  : data.hasBillingAccount
                    ? 'Stripe customer, no subscription'
                    : 'No payment account'}
              </dd>
            </div>
            <div>
              <dt>Saved worlds · sessions in 30 days</dt>
              <dd className="num">
                {data.worlds} · {data.sessions30}
              </dd>
            </div>
          </dl>

          <section className="adm-drawer-section" aria-labelledby="usage-today">
            <h3 id="usage-today">Today against limits</h3>
            <Meter
              label="Voice"
              used={Math.round(data.usageToday.voiceSeconds / 60)}
              limit={Math.round(data.limits.voiceSecondsPerDay / 60)}
              unit="min"
            />
            <Meter
              label="Worlds"
              used={data.usageToday.worlds}
              limit={data.limits.worldsPerDay}
              unit="worlds"
            />
            <p className="adm-detail">
              Last 7 days: {Math.round(data.usage7.voiceSeconds / 60)} voice min,{' '}
              {data.usage7.worlds} worlds, {data.usage7.images} images.
            </p>
          </section>

          <section className="adm-drawer-section adm-actions" aria-labelledby="family-actions">
            <h3 id="family-actions">Actions</h3>
            <ReasonField id="family-reason" value={reason} onChange={setReason} />
            <div className="adm-action-row">
              <button
                type="button"
                className="adm-button"
                disabled={!ready || data.deletionPending}
                onClick={() =>
                  void act(data.compPlan ? 'Comp ended' : 'Family plan comped', () =>
                    adminApi('setPlan', {
                      params: { uid },
                      body: { ...body, plan: data.compPlan ? 'free' : 'family' },
                    }),
                  )
                }
              >
                {data.compPlan ? 'End Family comp' : 'Comp Family plan'}
              </button>
              <button
                type="button"
                className="adm-button"
                disabled={!ready || data.deletionPending}
                onClick={() =>
                  void act("Today's quota reset", () =>
                    adminApi('resetQuota', { params: { uid }, body }),
                  )
                }
              >
                Reset today&apos;s quota
              </button>
              <button
                type="button"
                className="adm-button"
                disabled={!ready || data.deletionPending}
                onClick={() =>
                  void act(data.suspended ? 'Account reinstated' : 'Account suspended', () =>
                    adminApi('setSuspension', {
                      params: { uid },
                      body: { ...body, suspended: !data.suspended },
                    }),
                  )
                }
              >
                {data.suspended ? 'Reinstate account' : 'Suspend account'}
              </button>
            </div>
            {!reasonReady(reason) && (
              <p className="adm-detail">Write a reason first; every change is audited.</p>
            )}
            <p className="adm-live" role="status">
              {notice}
            </p>
            {failure && (
              <p className="adm-alert" role="alert">
                {failure}
              </p>
            )}
          </section>

          <section className="adm-drawer-section adm-danger" aria-labelledby="family-delete">
            <h3 id="family-delete">Delete this family</h3>
            <p>
              Removes the parent account, explorer profiles, worlds, sessions and usage, and cancels
              billing. This cannot be undone. Type{' '}
              <strong className="adm-phrase">{deletionConfirmationFor(data.email)}</strong> to
              confirm. The reason above is recorded with the request.
            </p>
            <label htmlFor="family-confirm" className="adm-reason">
              Confirmation
              <input
                id="family-confirm"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </label>
            <button
              type="button"
              className="adm-button adm-destructive"
              disabled={!ready || !canConfirmDeletion(typed, data.email) || data.deletionPending}
              onClick={() =>
                void act(
                  'Deletion requested',
                  () =>
                    adminApi('deleteFamily', {
                      params: { uid },
                      body: { ...body, confirmation: typed.trim() },
                    }),
                  onDeleted,
                )
              }
            >
              Delete family data
            </button>
          </section>
        </>
      )}
    </dialog>
  );
}
