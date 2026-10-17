'use client';
import { useState, type ReactNode } from 'react';
import { useSchoolResource } from '../../lib/school/api';
import type { BoardResponse, StudyMe } from '../../lib/school/types';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { useSchoolSession } from '../school/SchoolShell';
import { Loading, ErrorNotice } from '../school/shared';
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
  const me = useSchoolSession() as StudyMe | null;
  const resource = useSchoolResource<BoardResponse>(path);
  return (
    <div aria-busy={resource.loading}>
      <ErrorNotice error={resource.error} retry={resource.reload} />
      {resource.error ? null : resource.loading ? (
        <Loading />
      ) : resource.data?.board?.entries.length ? (
        <div className="sch-table-wrap">
          <table className="sch-board-table">
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
              {resource.data.board.entries.map((entry, index) => (
                <tr
                  key={entry.studentId}
                  className={entry.studentId === me?.studentId ? 'sch-board-own' : ''}
                >
                  <td className="sch-rank">{index + 1}</td>
                  <th scope="row">{entry.firstName}</th>
                  <td className="sch-number">{entry.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="sch-empty">{s('boardHidden')}</p>
      )}
      {!teacher && !resource.loading && !resource.error && resource.data?.own && (
        <p className="sch-notice">
          {s('yourPoints')}: {resource.data.own.points} · {s('rank')}:{' '}
          {resource.data.own.rank ?? '—'}
        </p>
      )}
    </div>
  );
}
