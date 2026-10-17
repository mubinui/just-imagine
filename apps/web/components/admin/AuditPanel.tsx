'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
import { useCallback, useEffect, useState } from 'react';
import type { AdminAuditEntry, AdminAuditResponse } from '@just-imagine/protocol';
import { adminApi } from './adminApi';
import { actionLabel, describeChange, formatWhen } from './format';
import { Empty, LoadError, PageHeading, Skeleton } from './parts';

export function AuditPanel() {
  useLanguage();
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
      setError(e instanceof Error ? uiError(e) : uiText('The audit log did not load. Try again.'));
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
        title={uiText('Audit log')}
        detail={uiText('Every admin change, newest first. The log is read-only.')}
        onRefresh={() => void load()}
        busy={loading}
      />
      <LoadError message={error} />
      {!entries ? (
        loading && <Skeleton rows={8} />
      ) : entries.length === 0 ? (
        <Empty title={uiText('No admin changes yet.')}>
          {uiText(
            'Plan comps, quota resets, suspensions, deletions, hidden worlds and kill switch changes are recorded here with who made them and why.',
          )}
        </Empty>
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table adm-audit">
              <thead>
                <tr>
                  <th scope="col">{uiText('When')}</th>
                  <th scope="col">{uiText('Admin')}</th>
                  <th scope="col">{uiText('Action')}</th>
                  <th scope="col">{uiText('Target')}</th>
                  <th scope="col">{uiText('Change')}</th>
                  <th scope="col">{uiText('Reason')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="adm-when">{formatWhen(e.at)}</td>
                    <td>{uiText(e.actorEmail ?? e.actorUid)}</td>
                    <th scope="row">{uiText(actionLabel(e.action))}</th>
                    <td className="adm-id">
                      {uiText(e.target.kind)} {uiText(e.target.id)}
                    </td>
                    <td>{uiText(describeChange(e.before, e.after))}</td>
                    <td>{uiText(e.reason)}</td>
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
                {loading ? uiText('Loading…') : uiText('Older entries')}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
