'use client';
import { useState } from 'react';
import { useSchoolResource } from '../../lib/school/api';
import type { BoardResponse, StudyMe } from '../../lib/school/types';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { useSchoolSession } from '../school/SchoolShell';
import { Loading, ErrorNotice } from '../school/shared';
export function Leaderboard({
  teacher = false,
  classId = '',
}: {
  teacher?: boolean;
  classId?: string;
}) {
  const { s } = useSchoolLanguage(),
    [scope, setScope] = useState<'class' | 'school'>('class'),
    [period, setPeriod] = useState<'week' | 'all'>('week');
  const me = useSchoolSession() as StudyMe | null;
  const selectedScope = teacher && !classId ? 'school' : scope;
  const resource = useSchoolResource<BoardResponse>(
    `${teacher ? 'school' : 'study'}/boards?scope=${selectedScope}&period=${period}${classId ? '&classId=' + encodeURIComponent(classId) : ''}`,
  );
  return (
    <section>
      <div className="sch-tabs">
        {(['class', 'school'] as const).map((v) => (
          <button
            key={v}
            disabled={teacher && !classId && v === 'class'}
            aria-pressed={selectedScope === v}
            onClick={() => setScope(v)}
          >
            {s(v === 'class' ? 'classBoard' : 'schoolBoard')}
          </button>
        ))}
      </div>
      <div className="sch-tabs">
        {(['week', 'all'] as const).map((v) => (
          <button key={v} aria-pressed={period === v} onClick={() => setPeriod(v)}>
            {s(v === 'week' ? 'week' : 'allTime')}
          </button>
        ))}
      </div>
      <ErrorNotice error={resource.error} retry={resource.reload} />
      {resource.loading ? (
        <Loading />
      ) : resource.data?.board?.entries.length ? (
        <div className="sch-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{s('rank')}</th>
                <th>{s('students')}</th>
                <th>{s('points')}</th>
              </tr>
            </thead>
            <tbody>
              {resource.data.board.entries.map((entry, index) => (
                <tr
                  key={entry.studentId}
                  className={entry.studentId === me?.studentId ? 'sch-board-own' : ''}
                >
                  <td>{index + 1}</td>
                  <td>{entry.firstName}</td>
                  <td>{entry.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="sch-empty">{s('boardHidden')}</p>
      )}
      {!teacher && resource.data?.own && (
        <p className="sch-notice">
          {s('yourPoints')}: {resource.data.own.points} · {s('rank')}:{' '}
          {resource.data.own.rank ?? '—'}
        </p>
      )}
    </section>
  );
}
