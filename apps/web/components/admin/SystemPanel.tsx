'use client';
import { useState } from 'react';
import type { AdminSystemStatus } from '@just-imagine/protocol';
import { adminApi, useAdminResource } from './adminApi';
import { formatWhen } from './format';
import { LoadError, PageHeading, ReasonField, Skeleton, Status, reasonReady } from './parts';

const loadSystem = () => adminApi<AdminSystemStatus>('system');

export function SystemPanel() {
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
          ? 'Generation is paused. Voice sessions and world builds now refuse new work.'
          : 'Generation is running again.',
      );
      setReason('');
      await reload();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'The kill switch did not change. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title="System"
        detail="The runtime kill switch, service health, model ids and versions."
        onRefresh={() => void reload()}
        busy={loading}
      />
      <LoadError message={error} />
      {!data ? (
        loading && <Skeleton rows={6} />
      ) : (
        <>
          <section
            className={`adm-section adm-switch ${data.killSwitch.on ? 'is-on' : ''}`}
            aria-labelledby="kill"
          >
            <h2 id="kill">Kill switch</h2>
            <p className="adm-sentence">
              {data.killSwitch.on ? (
                <Status tone="bad">Generation paused</Status>
              ) : (
                <Status tone="good">Generation running</Status>
              )}
            </p>
            <p className="adm-detail">
              {data.killSwitch.updatedAt
                ? `Last changed ${formatWhen(data.killSwitch.updatedAt)}${data.killSwitch.updatedBy ? ` by ${data.killSwitch.updatedBy}` : ''}${data.killSwitch.reason ? `: “${data.killSwitch.reason}”` : ''}.`
                : 'Never changed from the console.'}
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
                  Resume generation
                </button>
              ) : (
                <button
                  type="button"
                  className="adm-button adm-destructive"
                  disabled={!reasonReady(reason) || busy}
                  onClick={() => void toggle(true)}
                >
                  Pause all generation
                </button>
              )}
            </div>
            <p className="adm-live" role="status">
              {notice}
            </p>
            {failure && (
              <p className="adm-alert" role="alert">
                {failure}
              </p>
            )}
          </section>

          <section className="adm-section" aria-labelledby="services">
            <h2 id="services">Services</h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">Service</th>
                    <th scope="col">Health</th>
                    <th scope="col">Version</th>
                    <th scope="col">Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {data.services.map((s) => (
                    <tr key={s.name}>
                      <th scope="row">{s.name}</th>
                      <td>
                        {s.status === 'ok' ? (
                          <Status tone="good">Healthy</Status>
                        ) : s.status === 'down' ? (
                          <Status tone="bad">Not answering</Status>
                        ) : (
                          <Status tone="quiet">Not configured</Status>
                        )}
                      </td>
                      <td>{s.version ?? 'Not reported'}</td>
                      <td className="adm-when">{formatWhen(s.checkedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="adm-note">
              The api probes the services listed in its <code>ADMIN_HEALTH_TARGETS</code> setting.
            </p>
          </section>

          <section className="adm-section" aria-labelledby="models">
            <h2 id="models">Models in use</h2>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th scope="col">Role</th>
                    <th scope="col">Model id</th>
                  </tr>
                </thead>
                <tbody>
                  {data.models.map((m) => (
                    <tr key={m.role}>
                      <th scope="row">{m.role}</th>
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
            <h2 id="versions">Deployed versions</h2>
            <dl className="adm-facts">
              <div>
                <dt>api</dt>
                <dd>{data.versions.api}</dd>
              </div>
              <div>
                <dt>Cloud Run revision</dt>
                <dd>{data.versions.revision ?? 'Local build'}</dd>
              </div>
              <div>
                <dt>Commit</dt>
                <dd>{data.versions.commit ?? 'Not recorded'}</dd>
              </div>
            </dl>
          </section>
        </>
      )}
    </>
  );
}
