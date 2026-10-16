'use client';
import { useCallback, useEffect, useState } from 'react';
import type { AdminAuditEntry, AdminAuditResponse } from '@just-imagine/protocol';
import { adminApi } from './adminApi';
import { actionLabel, describeChange, formatWhen } from './format';
import { Empty, LoadError, PageHeading, Skeleton } from './parts';

export function AuditPanel() {
  const [entries, setEntries] = useState<AdminAuditEntry[]>();
  const [next, setNext] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    try {
      const page = await adminApi<AdminAuditResponse>('audit', { query: { limit: 50, cursor } });
      setEntries((current) => (cursor ? [...(current ?? []), ...page.entries] : page.entries));
      setNext(page.nextCursor);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The audit log did not load. Try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);
  return (
    <>
      <PageHeading
        title="Audit log"
        detail="Every admin change, newest first. The log is read-only."
        onRefresh={() => void load()}
        busy={loading}
      />
      <LoadError message={error} />
      {!entries ? (
        loading && <Skeleton rows={8} />
      ) : entries.length === 0 ? (
        <Empty title="No admin changes yet.">
          Plan comps, quota resets, suspensions, deletions, hidden worlds and kill switch changes
          are recorded here with who made them and why.
        </Empty>
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table adm-audit">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Admin</th>
                  <th scope="col">Action</th>
                  <th scope="col">Target</th>
                  <th scope="col">Change</th>
                  <th scope="col">Reason</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="adm-when">{formatWhen(e.at)}</td>
                    <td>{e.actorEmail ?? e.actorUid}</td>
                    <th scope="row">{actionLabel(e.action)}</th>
                    <td className="adm-id">
                      {e.target.kind} {e.target.id}
                    </td>
                    <td>{describeChange(e.before, e.after)}</td>
                    <td>{e.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {next && (
            <div className="adm-pager">
              <button
                type="button"
                className="adm-button"
                disabled={loading}
                onClick={() => void load(next)}
              >
                {loading ? 'Loading…' : 'Older entries'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
