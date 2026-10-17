'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
import { useState } from 'react';
import type { AdminSystemStatus } from '@just-imagine/protocol';
import { adminApi, useAdminResource } from './adminApi';
import { formatWhen } from './format';
import { KILL_SWITCH_EVENT } from './nav';
import { LoadError, PageHeading, ReasonField, Skeleton, Status, reasonReady } from './parts';

const loadSystem = () => adminApi<AdminSystemStatus>('system');

export function SystemPanel() {
  useLanguage();
  const { data, error, loading, reload } = useAdminResource(loadSystem);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');

  async function toggle(on: boolean) {
    setBusy(true);
    setNotice('');
    setFailure('');
    try {
      await adminApi('killSwitch', { body: { on, reason: reason.trim() } });
      setNotice(
        on
          ? uiText('Generation is paused. Voice sessions and world builds now refuse new work.')
          : uiText('Generation is running again.'),
      );
      setReason('');
      window.dispatchEvent(new Event(KILL_SWITCH_EVENT));
      await reload();
    } catch (e) {
      setFailure(
        e instanceof Error ? uiError(e) : uiText('The kill switch did not change. Try again.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title={uiText('System')}
        detail={uiText('The runtime kill switch, service health, model ids and versions.')}
        onRefresh={() => void reload()}
        busy={loading}
      />
      <LoadError message={error} onRetry={() => void reload()} />
      {!data ? (
        loading && <Skeleton rows={6} />
      ) : (
        <>
          <section
            className={`adm-section adm-switch ${data.killSwitch.on ? 'is-on' : ''}`}
            aria-labelledby="kill"
          >
            <h2 id="kill">{uiText('Kill switch')}</h2>
            <p className="adm-sentence">
              {data.killSwitch.on ? (
                <Status tone="bad">{uiText('Generation paused')}</Status>
              ) : (
                <Status tone="good">{uiText('Generation running')}</Status>
              )}
            </p>
            <p className="adm-detail">
              {data.killSwitch.updatedAt
                ? uiText('Last changed {v0}{v1}{v2}.', {
                    v0: formatWhen(data.killSwitch.updatedAt),
                    v1: data.killSwitch.updatedBy
                      ? uiText(' by {v0}', { v0: data.killSwitch.updatedBy })
                      : '',
                    v2: data.killSwitch.reason ? `: “${data.killSwitch.reason}”` : '',
                  })
                : uiText('Never changed from the console.')}
            </p>
            <div className="adm-toolbar">
              <ReasonField id="kill-reason" value={reason} onChange={setReason} />
              {data.killSwitch.on ? (
                <button
                  type="button"
                  className="adm-button adm-primary"
                  disabled={!reasonReady(reason) || busy}
                  onClick={() => void toggle(false)}
                >
                  {uiText('Resume generation')}
                </button>
              ) : (
                <button
                  type="button"
                  className="adm-button adm-destructive"
                  disabled={!reasonReady(reason) || busy}
                  onClick={() => void toggle(true)}
                >
                  {uiText('Pause all generation')}
                </button>
              )}
            </div>
            <p className="adm-live" role="status">
              {uiText(notice)}
            </p>
            {failure && (
              <p className="adm-alert" role="alert">
                {uiText(failure)}
              </p>
            )}
          </section>

          <section className="adm-section" aria-labelledby="services">
            <h2 id="services">{uiText('Services')}</h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">{uiText('Service')}</th>
                    <th scope="col">{uiText('Health')}</th>
                    <th scope="col">{uiText('Version')}</th>
                    <th scope="col">{uiText('Checked')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.services.map((s) => (
                    <tr key={s.name}>
                      <th scope="row">{uiText(s.name)}</th>
                      <td>
                        {s.status === 'ok' ? (
                          <Status tone="good">{uiText('Healthy')}</Status>
                        ) : s.status === 'down' ? (
                          <Status tone="bad">{uiText('Not answering')}</Status>
                        ) : (
                          <Status tone="quiet">{uiText('Not configured')}</Status>
                        )}
                      </td>
                      <td>{s.version ?? uiText('Not reported')}</td>
                      <td className="adm-when">{formatWhen(s.checkedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="adm-note">
              {uiText('The api probes the services listed in its')}{' '}
              <code>ADMIN_HEALTH_TARGETS</code> {uiText('setting.')}
            </p>
          </section>

          <section className="adm-section" aria-labelledby="models">
            <h2 id="models">{uiText('Models in use')}</h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">{uiText('Role')}</th>
                    <th scope="col">{uiText('Model id')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.models.map((m) => (
                    <tr key={m.role}>
                      <th scope="row">{uiText(m.role)}</th>
                      <td>
                        <code>{m.id}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="adm-section" aria-labelledby="versions">
            <h2 id="versions">{uiText('Deployed versions')}</h2>
            <dl className="adm-facts">
              <div>
                <dt>{uiText('api')}</dt>
                <dd>{uiText(data.versions.api)}</dd>
              </div>
              <div>
                <dt>{uiText('Cloud Run revision')}</dt>
                <dd>{uiText(data.versions.revision ?? uiText('Local build'))}</dd>
              </div>
              <div>
                <dt>{uiText('Commit')}</dt>
                <dd>{uiText(data.versions.commit ?? uiText('Not recorded'))}</dd>
              </div>
            </dl>
          </section>
        </>
      )}
    </>
  );
}
