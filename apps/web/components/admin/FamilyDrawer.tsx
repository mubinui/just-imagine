'use client';
import { useLanguage } from '../../lib/i18n';
import { uiNumber } from '../../lib/i18n/ui';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  deletionConfirmationFor,
  type AdminFamilyDetail,
  type AdminWriteResponse,
} from '@just-imagine/protocol';
import { adminApi, useAdminResource } from './adminApi';
import { ageBandSummary, canConfirmDeletion, formatWhen, ofLimit, planLabel } from './format';
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
  useLanguage();
  return (
    <div className="adm-meter">
      <div>
        <span>{uiText(label)}</span>
        <span className="num">{ofLimit(used, limit, unit)}</span>
      </div>
      <progress
        max={limit || 1}
        value={Math.min(used, limit)}
        aria-label={`${uiText(label)}: ${ofLimit(used, limit, unit)}`}
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
  useLanguage();
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
      setNotice(uiText('{v0}. Recorded in the audit log.', { v0: String(label) }));
      setReason('');
      after();
    } catch (e) {
      setFailure(
        e instanceof Error ? uiError(e) : uiText('That change did not go through. Try again.'),
      );
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
        <h2 id="family-title" className="adm-email">
          {data?.email ?? uiText('Family')}
        </h2>
        <button type="button" className="adm-button" onClick={() => dialog.current?.close()}>
          {uiText('Close')}
        </button>
      </div>
      <LoadError message={error} onRetry={() => void reload()} />
      {!data ? (
        loading && <Skeleton rows={6} />
      ) : (
        <>
          <dl className="adm-facts">
            <div>
              <dt>{uiText('Plan')}</dt>
              <dd>{uiText(planLabel(data))}</dd>
            </div>
            <div>
              <dt>{uiText('Account')}</dt>
              <dd>
                {data.deletionPending ? (
                  <Status tone="bad">{uiText('Deletion in progress')}</Status>
                ) : data.suspended ? (
                  <Status tone="bad">{uiText('Suspended')}</Status>
                ) : (
                  <Status tone="good">{uiText('Active')}</Status>
                )}
                {data.suspendedReason && (
                  <span className="adm-detail"> {uiText(data.suspendedReason)}</span>
                )}
              </dd>
            </div>
            <div>
              <dt>{uiText('Explorers')}</dt>
              <dd>{uiText(ageBandSummary(data.children))}</dd>
            </div>
            <div>
              <dt>{uiText('Joined')}</dt>
              <dd>{formatWhen(data.createdAt)}</dd>
            </div>
            <div>
              <dt>{uiText('Billing')}</dt>
              <dd>
                {data.subscriptionStatus
                  ? uiText('Stripe subscription {v0}', {
                      v0: String(data.subscriptionStatus.replace('_', ' ')),
                    })
                  : data.hasBillingAccount
                    ? uiText('Stripe customer, no subscription')
                    : uiText('No payment account')}
              </dd>
            </div>
            <div>
              <dt>{uiText('Saved worlds · sessions in 30 days')}</dt>
              <dd className="num">
                {uiNumber(data.worlds)} · {uiNumber(data.sessions30)}
              </dd>
            </div>
          </dl>

          <section className="adm-drawer-section" aria-labelledby="usage-today">
            <h3 id="usage-today">{uiText('Today against limits')}</h3>
            <Meter
              label={uiText('Voice')}
              used={Math.round(data.usageToday.voiceSeconds / 60)}
              limit={Math.round(data.limits.voiceSecondsPerDay / 60)}
              unit="min"
            />
            <Meter
              label={uiText('Worlds')}
              used={data.usageToday.worlds}
              limit={data.limits.worldsPerDay}
              unit="worlds"
            />
            <p className="adm-detail">
              {uiText('Last 7 days: {v0} voice min, {v1} worlds, {v2} images.', {
                v0: Math.round(data.usage7.voiceSeconds / 60),
                v1: data.usage7.worlds,
                v2: data.usage7.images,
              })}
            </p>
          </section>

          <section className="adm-drawer-section adm-actions" aria-labelledby="family-actions">
            <h3 id="family-actions">{uiText('Actions')}</h3>
            <ReasonField id="family-reason" value={reason} onChange={setReason} />
            <div className="adm-action-row">
              <button
                type="button"
                className="adm-button"
                disabled={!ready || data.deletionPending}
                onClick={() =>
                  void act(
                    data.compPlan ? uiText('Comp ended') : uiText('Family plan comped'),
                    () =>
                      adminApi('setPlan', {
                        params: { uid },
                        body: { ...body, plan: data.compPlan ? 'free' : 'family' },
                      }),
                  )
                }
              >
                {data.compPlan ? uiText('End Family comp') : uiText('Comp Family plan')}
              </button>
              <button
                type="button"
                className="adm-button"
                disabled={!ready || data.deletionPending}
                onClick={() =>
                  void act(uiText("Today's quota reset"), () =>
                    adminApi('resetQuota', { params: { uid }, body }),
                  )
                }
              >
                {uiText("Reset today's quota")}
              </button>
              <button
                type="button"
                className="adm-button"
                disabled={!ready || data.deletionPending}
                onClick={() =>
                  void act(
                    data.suspended ? uiText('Account reinstated') : uiText('Account suspended'),
                    () =>
                      adminApi('setSuspension', {
                        params: { uid },
                        body: { ...body, suspended: !data.suspended },
                      }),
                  )
                }
              >
                {data.suspended ? uiText('Reinstate account') : uiText('Suspend account')}
              </button>
            </div>
            {!reasonReady(reason) && (
              <p className="adm-detail">
                {uiText('Write a reason first; every change is audited.')}
              </p>
            )}
            <p className="adm-live" role="status">
              {uiText(notice)}
            </p>
            {failure && (
              <p className="adm-alert" role="alert">
                {uiText(failure)}
              </p>
            )}
          </section>

          <section className="adm-drawer-section adm-danger" aria-labelledby="family-delete">
            <h3 id="family-delete">{uiText('Delete this family')}</h3>
            <p>
              {uiText(
                'Removes the parent account, explorer profiles, worlds, sessions and usage, and cancels billing. This cannot be undone.',
              )}
            </p>
            <p>
              {uiText('Type this phrase to confirm:')}{' '}
              <strong className="adm-phrase" translate="no">
                {deletionConfirmationFor(data.email)}
              </strong>
            </p>
            <p className="adm-detail">{uiText('The reason above is recorded with the request.')}</p>
            <label htmlFor="family-confirm" className="adm-reason">
              {uiText('Confirmation')}
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
                  uiText('Deletion requested'),
                  () =>
                    adminApi('deleteFamily', {
                      params: { uid },
                      body: { ...body, confirmation: typed.trim() },
                    }),
                  onDeleted,
                )
              }
            >
              {uiText('Delete family data')}
            </button>
          </section>
        </>
      )}
    </dialog>
  );
}
