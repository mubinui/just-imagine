'use client';
import { useState, type ReactNode } from 'react';
import { useSchoolResource } from '../../lib/school/api';
import type { BoardResponse, StudyMe } from '../../lib/school/types';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { useSchoolSession } from '../school/SchoolShell';
import { Loading, ErrorNotice } from '../school/shared';
import { competitionRanks, displayRank } from './study-logic';
import { useStudyCopy } from './copy';
import styles from './Leaderboard.module.css';
export function Leaderboard({
  teacher = false,
  classId = '',
  scopeControl,
  scopeLabel,
}: {
  teacher?: boolean;
  classId?: string;
  scopeControl?: ReactNode;
  scopeLabel?: string;
}) {
  const { s } = useSchoolLanguage(),
    [scope, setScope] = useState<'class' | 'school'>('class'),
    [period, setPeriod] = useState<'week' | 'all'>('week');
  const selectedScope = teacher ? (classId ? 'class' : 'school') : scope;
  const path = `${teacher ? 'school' : 'study'}/boards?scope=${selectedScope}&period=${period}${teacher && classId ? '&classId=' + encodeURIComponent(classId) : ''}`;
  const label = scopeLabel ?? s(selectedScope === 'class' ? 'classBoard' : 'schoolBoard');
  return (
    <section className="sch-board">
      <div className="sch-filter-bar">
        {teacher ? (
          scopeControl
        ) : (
          <fieldset className="sch-filter-group">
            <legend>{s('leaderboardScope')}</legend>
            <div className="sch-segments">
              {(['class', 'school'] as const).map((v) => (
                <button key={v} aria-pressed={scope === v} onClick={() => setScope(v)}>
                  {s(v === 'class' ? 'classBoard' : 'schoolBoard')}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <fieldset className="sch-filter-group">
          <legend>{s('timePeriod')}</legend>
          <div className="sch-segments">
            {(['week', 'all'] as const).map((v) => (
              <button key={v} aria-pressed={period === v} onClick={() => setPeriod(v)}>
                {s(v === 'week' ? 'week' : 'allTime')}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      <BoardResults
        key={path}
        path={path}
        teacher={teacher}
        label={`${label} · ${s(period === 'week' ? 'week' : 'allTime')}`}
      />
    </section>
  );
}

function BoardResults({ path, teacher, label }: { path: string; teacher: boolean; label: string }) {
  const { s } = useSchoolLanguage();
  const { t, n } = useStudyCopy();
  const me = useSchoolSession() as StudyMe | null;
  const resource = useSchoolResource<BoardResponse>(path);
  const entries = resource.data?.board?.entries ?? [];
  const ranks = competitionRanks(entries);
  const ownRank = displayRank(resource.data?.own?.points, resource.data?.own?.rank);
  const own = !teacher && !resource.loading && !resource.error ? resource.data?.own : undefined;
  return (
    <div aria-busy={resource.loading} className={styles.board}>
      <ErrorNotice error={resource.error} retry={resource.reload} />
      {own && (
        <dl className={styles.standing}>
          <div>
            <dt>{s('yourPoints')}</dt>
            <dd>{n(own.points)}</dd>
          </div>
          <div>
            <dt>{s('rank')}</dt>
            <dd>{ownRank ? n(ownRank) : <small>{t('notRanked')}</small>}</dd>
          </div>
        </dl>
      )}
      {resource.error ? null : resource.loading ? (
        <Loading />
      ) : resource.data?.board?.entries.length ? (
        <div className={`sch-table-wrap ${styles.card}`}>
          <table className={`sch-board-table ${styles.table}`}>
            <caption>{label}</caption>
            <thead>
              <tr>
                <th scope="col" className="sch-rank">
                  {s('rank')}
                </th>
                <th scope="col">{s('students')}</th>
                <th scope="col" className="sch-number">
                  {s('points')}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => {
                const rank = ranks[index],
                  mine = entry.studentId === me?.studentId;
                return (
                  <tr
                    key={entry.studentId}
                    className={mine ? 'sch-board-own' : ''}
                    data-medal={rank && rank <= 3 ? rank : undefined}
                  >
                    <td className="sch-rank">{rank ? n(rank) : '—'}</td>
                    <th scope="row">
                      {entry.firstName}
                      {mine && <span className={styles.you}>{t('you')}</span>}
                    </th>
                    <td className="sch-number">{n(entry.points)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="sch-empty">{s('boardHidden')}</p>
      )}
    </div>
  );
}
