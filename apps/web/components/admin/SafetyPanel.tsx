'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
import { useMemo, useState } from 'react';
import type { AdminSafetyResponse, AdminSafetyWorld } from '@just-imagine/protocol';
import { adminApi, useAdminResource } from './adminApi';
import { formatWhen } from './format';
import { Empty, LoadError, PageHeading, ReasonField, Skeleton, Status, reasonReady } from './parts';

const loadSafety = () => adminApi<AdminSafetyResponse>('safety');

function issues(world: AdminSafetyWorld, failed: Set<string>) {
  const list: string[] = [];
  if (failed.has(world.worldId)) list.push(uiText('Build failed'));
  if (world.failedAssets) list.push(uiText('{v0} images rejected', { v0: world.failedAssets }));
  return list.join(' · ') || uiText('Held for review');
}

export function SafetyPanel() {
  useLanguage();
  const { data, error, loading, reload } = useAdminResource(loadSafety);
  const [selected, setSelected] = useState<string>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const worlds = useMemo(() => {
    if (!data) return [];
    const byId = new Map<string, AdminSafetyWorld>();
    for (const w of [...data.hiddenWorlds, ...data.failedWorlds, ...data.imageRejections])
      byId.set(w.worldId, w);
    return [...byId.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [data]);
  const failed = useMemo(() => new Set(data?.failedWorlds.map((w) => w.worldId)), [data]);
  const current = worlds.find((w) => w.worldId === selected);

  async function setHidden(hidden: boolean) {
    if (!current) return;
    setBusy(true);
    setNotice('');
    setFailure('');
    try {
      await adminApi('setWorldVisibility', {
        params: { worldId: current.worldId },
        body: { hidden, reason: reason.trim() },
      });
      setNotice(
        uiText(
          hidden
            ? '“{v0}” is hidden from its family. Recorded in the audit log.'
            : '“{v0}” is visible to its family again. Recorded in the audit log.',
          { v0: current.title },
        ),
      );
      setReason('');
      await reload();
    } catch (e) {
      setFailure(
        e instanceof Error ? uiError(e) : uiText('That change did not go through. Try again.'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title={uiText('Safety')}
        detail={uiText(
          'Moderation outcomes and worlds that need a look. Transcripts are never stored or shown.',
        )}
        onRefresh={() => void reload()}
        busy={loading}
      />
      <LoadError message={error} onRetry={() => void reload()} />
      {!data ? (
        loading && <Skeleton rows={8} />
      ) : (
        <>
          <section className="adm-section" aria-labelledby="moderation">
            <h2 id="moderation">{uiText('Moderation log')}</h2>
            {data.moderation.length === 0 ? (
              <Empty title={uiText('No moderation events recorded.')}>
                {uiText(
                  'Blocked or redirected moments appear here with their category and session id, never the words.',
                )}
              </Empty>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">{uiText('When')}</th>
                      <th scope="col">{uiText('Outcome')}</th>
                      <th scope="col">{uiText('Source')}</th>
                      <th scope="col">{uiText('Session')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.moderation.map((entry) => (
                      <tr key={entry.id}>
                        <td className="adm-when">{formatWhen(entry.at)}</td>
                        <td>
                          {entry.category === 'block' ? (
                            <Status tone="bad">{uiText('Blocked')}</Status>
                          ) : (
                            <Status tone="warn">{uiText('Redirected')}</Status>
                          )}
                        </td>
                        <td>
                          {entry.source === 'session'
                            ? uiText('Session ended by moderation')
                            : entry.source === 'image'
                              ? uiText('Image check')
                              : uiText('Transcript check')}
                        </td>
                        <td className="adm-id">{uiText(entry.sessionId)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="adm-section" aria-labelledby="worlds-review">
            <h2 id="worlds-review">{uiText('Worlds to review')}</h2>
            {worlds.length === 0 ? (
              <Empty title={uiText('No failed, rejected or hidden worlds.')}>
                {uiText(
                  'Worlds whose build failed validation, whose images failed the safety check, or that you hid from a family appear here.',
                )}
              </Empty>
            ) : (
              <>
                <div className="adm-toolbar">
                  <ReasonField id="world-reason" value={reason} onChange={setReason} />
                  <button
                    type="button"
                    className="adm-button"
                    disabled={!current || current.hidden || !reasonReady(reason) || busy}
                    onClick={() => void setHidden(true)}
                  >
                    {uiText('Hide from family')}
                  </button>
                  <button
                    type="button"
                    className="adm-button"
                    disabled={!current || !current.hidden || !reasonReady(reason) || busy}
                    onClick={() => void setHidden(false)}
                  >
                    {uiText('Show to family')}
                  </button>
                </div>
                <p className="adm-detail">
                  {current
                    ? uiText('Selected: “{v0}”.', { v0: String(current.title) })
                    : uiText('Select a world, write a reason, then hide or show it.')}
                </p>
                <p className="adm-live" role="status">
                  {uiText(notice)}
                </p>
                {failure && (
                  <p className="adm-alert" role="alert">
                    {uiText(failure)}
                  </p>
                )}
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">
                          <span className="adm-visually-hidden">{uiText('Select')}</span>
                        </th>
                        <th scope="col">{uiText('World title')}</th>
                        <th scope="col">{uiText('Issue')}</th>
                        <th scope="col">{uiText('Family')}</th>
                        <th scope="col">{uiText('Visibility')}</th>
                        <th scope="col">{uiText('Updated')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {worlds.map((w) => (
                        <tr key={w.worldId} aria-selected={w.worldId === selected}>
                          <td className="adm-pick">
                            <label>
                              <input
                                type="radio"
                                name="world"
                                checked={w.worldId === selected}
                                onChange={() => setSelected(w.worldId)}
                              />
                              <span className="adm-visually-hidden">
                                {uiText('Select')}
                                {uiText(w.title)}
                              </span>
                            </label>
                          </td>
                          <th scope="row">{uiText(w.title || uiText('Untitled world'))}</th>
                          <td>{uiText(issues(w, failed))}</td>
                          <td className="adm-id">{uiText(w.ownerUid)}</td>
                          <td>
                            {w.hidden ? (
                              <Status tone="warn">{uiText('Hidden')}</Status>
                            ) : (
                              <Status tone="quiet">{uiText('Visible')}</Status>
                            )}
                          </td>
                          <td className="adm-when">{formatWhen(w.updatedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
