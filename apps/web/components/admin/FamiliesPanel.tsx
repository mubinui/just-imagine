'use client';
import { useLanguage } from '../../lib/i18n';
import { uiNumber } from '../../lib/i18n/ui';
import { copy as uiText } from '../../lib/i18n/ui';
import { useCallback, useState } from 'react';
import type { AdminFamilyListResponse } from '@just-imagine/protocol';
import { adminApi, useAdminResource } from './adminApi';
import { formatWhen, planLabel } from './format';
import { FamilyDrawer } from './FamilyDrawer';
import { Empty, LoadError, PageHeading, Skeleton, Status } from './parts';

const PAGE_SIZE = 25;

export function FamiliesPanel() {
  useLanguage();
  const [query, setQuery] = useState('');
  const [cursors, setCursors] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const cursor = cursors.at(-1);
  const load = useCallback(
    () =>
      adminApi<AdminFamilyListResponse>('families', {
        query: { q: query || undefined, limit: PAGE_SIZE, cursor },
      }),
    [query, cursor],
  );
  const { data, error, loading, reload } = useAdminResource(load);
  return (
    <>
      <PageHeading
        title={uiText('Families')}
        detail={uiText(
          'Parent accounts, plans and usage. Explorers appear only as counts and age bands.',
        )}
      />
      <form
        className="adm-search"
        role="search"
        action={(form) => {
          setCursors([]);
          setQuery(String(form.get('q') ?? '').trim());
        }}
      >
        <label htmlFor="family-search">{uiText('Parent email starts with')}</label>
        <div className="adm-search-row">
          <input
            id="family-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="parent@example.com"
            autoComplete="off"
          />
          <button type="submit" className="adm-button adm-primary">
            {uiText('Search')}
          </button>
          {query && (
            <button
              type="button"
              className="adm-button"
              onClick={() => {
                setCursors([]);
                setQuery('');
              }}
            >
              {uiText('Show all')}
            </button>
          )}
        </div>
      </form>
      <LoadError message={error} />
      {!data && loading ? (
        <Skeleton rows={8} />
      ) : data && data.families.length === 0 ? (
        <Empty
          title={
            query
              ? uiText('No parent email starts with “{v0}”.', { v0: String(query) })
              : uiText('No families yet.')
          }
        >
          {query
            ? uiText('Search matches the start of the address, so try fewer characters.')
            : uiText('Families appear here once a parent signs up.')}
        </Empty>
      ) : (
        data && (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table adm-families">
                <caption className="adm-visually-hidden">
                  {uiText('Families')}
                  {query ? uiText(' matching {v0}', { v0: String(query) }) : ''}
                  {uiText('; open a family for actions.')}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{uiText('Parent email')}</th>
                    <th scope="col">{uiText('Plan')}</th>
                    <th scope="col">{uiText('Account')}</th>
                    <th scope="col" className="num">
                      {uiText('Explorers')}
                    </th>
                    <th scope="col">{uiText('Joined')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.families.map((family) => (
                    <tr key={family.uid}>
                      <th scope="row">
                        <button
                          type="button"
                          className="adm-row-open"
                          onClick={() => setOpen(family.uid)}
                          aria-haspopup="dialog"
                        >
                          {uiText(family.email || family.uid)}
                        </button>
                      </th>
                      <td>{uiText(planLabel(family))}</td>
                      <td>
                        {family.suspended ? (
                          <Status tone="bad">{uiText('Suspended')}</Status>
                        ) : (
                          <Status tone="good">{uiText('Active')}</Status>
                        )}
                      </td>
                      <td className="num">{uiNumber(family.childrenCount)}</td>
                      <td className="adm-when">{formatWhen(family.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="adm-pager">
              <button
                type="button"
                className="adm-button"
                disabled={!cursors.length || loading}
                onClick={() => setCursors((c) => c.slice(0, -1))}
              >
                {uiText('Previous page')}
              </button>
              <span className="adm-detail">
                {uiText('Page')}
                {uiNumber(cursors.length + 1)}
              </span>
              <button
                type="button"
                className="adm-button"
                disabled={!data.nextCursor || loading}
                onClick={() => data.nextCursor && setCursors((c) => [...c, data.nextCursor!])}
              >
                {uiText('Next page')}
              </button>
            </div>
          </>
        )
      )}
      {open && (
        <FamilyDrawer
          uid={open}
          onClose={() => setOpen(null)}
          onChanged={() => void reload()}
          onDeleted={() => {
            setOpen(null);
            void reload();
          }}
        />
      )}
    </>
  );
}
