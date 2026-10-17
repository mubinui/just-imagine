'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiError } from '../../lib/i18n/ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  AdminAuditEntry,
  AdminAuditResponse,
  AdminFamilyDetail,
} from '@just-imagine/protocol';
import type { CatalogEntryDocSchema } from '@just-imagine/protocol';
import type { z } from 'zod';
import type { Lesson, School } from '../../lib/school/types';
import { adminApi, adminRequest } from './adminApi';
import {
  auditActionLabel,
  auditChange,
  formatWhen,
  kindLabel,
  shortId,
  targetLabel,
  type TargetNames,
} from './format';
import { CopyButton, Empty, LoadError, PageHeading, Skeleton } from './parts';

type CatalogEntry = z.infer<typeof CatalogEntryDocSchema> & { id: string };

/** Readable names for audit targets, from lists the console can already read. */
function useTargetNames(entries: AdminAuditEntry[] | undefined, language: 'en' | 'bn') {
  const [lists, setLists] = useState<{
    schools?: School[];
    catalog?: CatalogEntry[];
    lessons?: Lesson[];
  }>({});
  const [families, setFamilies] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    void Promise.allSettled([
      adminRequest<{ schools: School[] }>('schools'),
      adminRequest<{ entries: CatalogEntry[] }>('catalog'),
      adminRequest<{ lessons: Lesson[] }>('lessons'),
    ]).then(([schools, catalog, lessons]) =>
      setLists({
        schools: schools.status === 'fulfilled' ? schools.value.schools : undefined,
        catalog: catalog.status === 'fulfilled' ? catalog.value.entries : undefined,
        lessons: lessons.status === 'fulfilled' ? lessons.value.lessons : undefined,
      }),
    );
  }, []);
  const familyIds = useMemo(
    () => [...new Set(entries?.filter((e) => e.target.kind === 'family').map((e) => e.target.id))],
    [entries],
  );
  useEffect(() => {
    const wanted = familyIds.filter((uid) => !families.has(uid)).slice(0, 25);
    if (!wanted.length) return;
    void Promise.allSettled(
      wanted.map((uid) => adminApi<AdminFamilyDetail>('family', { params: { uid } })),
    ).then((results) =>
      setFamilies((current) => {
        const next = new Map(current);
        results.forEach((r, i) => {
          // Deleted families keep their raw id; mark them so they are not fetched again.
          next.set(wanted[i]!, r.status === 'fulfilled' ? r.value.email : '');
        });
        return next;
      }),
    );
  }, [familyIds, families]);
  return useMemo<TargetNames>(
    () => ({
      family: new Map([...families].filter(([, email]) => email)),
      school: new Map(
        lists.schools?.map((s) => [s.id, language === 'bn' && s.nameBn ? s.nameBn : s.name]),
      ),
      catalog: new Map(lists.catalog?.map((c) => [c.id, c.title[language] || c.title.en])),
      lesson: new Map(lists.lessons?.map((l) => [l.id, l.title[language] || l.title.en])),
    }),
    [families, lists, language],
  );
}

export function AuditPanel() {
  const { language } = useLanguage();
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
  const names = useTargetNames(entries, language);
  return (
    <>
      <PageHeading
        title={uiText('Audit log')}
        detail={uiText('Every admin change, newest first. The log is read-only.')}
        onRefresh={() => void load()}
        busy={loading}
      />
      <LoadError message={error} onRetry={() => void load()} />
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
                {entries.map((e) => {
                  const target = targetLabel(e.target, names);
                  const named = target !== `${kindLabel(e.target.kind)} ${shortId(e.target.id)}`;
                  return (
                    <tr key={e.id}>
                      <td className="adm-when" data-label={uiText('When')}>
                        {formatWhen(e.at)}
                      </td>
                      <td data-label={uiText('Admin')}>
                        <span className="adm-email" title={e.actorEmail ?? e.actorUid}>
                          {e.actorEmail ?? e.actorUid}
                        </span>
                      </td>
                      <th scope="row" data-label={uiText('Action')}>
                        {auditActionLabel(e)}
                      </th>
                      <td className="adm-target" data-label={uiText('Target')}>
                        <div>
                          {named && (
                            <span className="adm-target-name" title={target}>
                              {target}
                            </span>
                          )}
                          <span className="adm-target-id">
                            <span className="adm-target-kind">{kindLabel(e.target.kind)}</span>
                            <code title={e.target.id}>{shortId(e.target.id)}</code>
                            {e.target.id.length > 14 && (
                              <CopyButton
                                value={e.target.id}
                                label={uiText('Copy id {v0}', { v0: e.target.id })}
                              />
                            )}
                          </span>
                        </div>
                      </td>
                      <td data-label={uiText('Change')}>{auditChange(e)}</td>
                      <td data-label={uiText('Reason')}>{e.reason}</td>
                    </tr>
                  );
                })}
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
