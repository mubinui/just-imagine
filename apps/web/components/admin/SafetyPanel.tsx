'use client';
import { useMemo, useState } from 'react';
import type { AdminSafetyResponse, AdminSafetyWorld } from '@just-imagine/protocol';
import { adminApi, useAdminResource } from './adminApi';
import { formatWhen } from './format';
import { Empty, LoadError, PageHeading, ReasonField, Skeleton, Status, reasonReady } from './parts';

const loadSafety = () => adminApi<AdminSafetyResponse>('safety');

function issues(world: AdminSafetyWorld, failed: Set<string>) {
  const list: string[] = [];
  if (failed.has(world.worldId)) list.push('Build failed');
  if (world.failedAssets)
    list.push(`${world.failedAssets} image${world.failedAssets === 1 ? '' : 's'} rejected`);
  return list.join(' · ') || 'Held for review';
}

export function SafetyPanel() {
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
        `“${current.title}” is ${hidden ? 'hidden from its family' : 'visible to its family again'}. Recorded in the audit log.`,
      );
      setReason('');
      await reload();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : 'That change did not go through. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        title="Safety"
        detail="Moderation outcomes and worlds that need a look. Transcripts are never stored or shown."
        onRefresh={() => void reload()}
        busy={loading}
      />
      <LoadError message={error} />
      {!data ? (
        loading && <Skeleton rows={8} />
      ) : (
        <>
          <section className="adm-section" aria-labelledby="moderation">
            <h2 id="moderation">Moderation log</h2>
            {data.moderation.length === 0 ? (
              <Empty title="No moderation events recorded.">
                Blocked or redirected moments appear here with their category and session id, never
                the words.
              </Empty>
            ) : (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Outcome</th>
                      <th scope="col">Source</th>
                      <th scope="col">Session</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.moderation.map((entry) => (
                      <tr key={entry.id}>
                        <td className="adm-when">{formatWhen(entry.at)}</td>
                        <td>
                          {entry.category === 'block' ? (
                            <Status tone="bad">Blocked</Status>
                          ) : (
                            <Status tone="warn">Redirected</Status>
                          )}
                        </td>
                        <td>
                          {entry.source === 'session'
                            ? 'Session ended by moderation'
                            : entry.source === 'image'
                              ? 'Image check'
                              : 'Transcript check'}
                        </td>
                        <td className="adm-id">{entry.sessionId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="adm-section" aria-labelledby="worlds-review">
            <h2 id="worlds-review">Worlds to review</h2>
            {worlds.length === 0 ? (
              <Empty title="No failed, rejected or hidden worlds.">
                Worlds whose build failed validation, whose images failed the safety check, or that
                you hid from a family appear here.
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
                    Hide from family
                  </button>
                  <button
                    type="button"
                    className="adm-button"
                    disabled={!current || !current.hidden || !reasonReady(reason) || busy}
                    onClick={() => void setHidden(false)}
                  >
                    Show to family
                  </button>
                </div>
                <p className="adm-detail">
                  {current
                    ? `Selected: “${current.title}”.`
                    : 'Select a world, write a reason, then hide or show it.'}
                </p>
                <p className="adm-live" role="status">
                  {notice}
                </p>
                {failure && (
                  <p className="adm-alert" role="alert">
                    {failure}
                  </p>
                )}
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th scope="col">
                          <span className="adm-visually-hidden">Select</span>
                        </th>
                        <th scope="col">World title</th>
                        <th scope="col">Issue</th>
                        <th scope="col">Family</th>
                        <th scope="col">Visibility</th>
                        <th scope="col">Updated</th>
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
                              <span className="adm-visually-hidden">Select {w.title}</span>
                            </label>
                          </td>
                          <th scope="row">{w.title || 'Untitled world'}</th>
                          <td>{issues(w, failed)}</td>
                          <td className="adm-id">{w.ownerUid}</td>
                          <td>
                            {w.hidden ? (
                              <Status tone="warn">Hidden</Status>
                            ) : (
                              <Status tone="quiet">Visible</Status>
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
