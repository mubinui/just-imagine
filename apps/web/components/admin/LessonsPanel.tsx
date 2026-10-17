'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText, uiNumber } from '../../lib/i18n/ui';
import Link from 'next/link';
import { useState } from 'react';
import { CHAPTERS } from '@just-imagine/stem-content';
import type { Lesson } from '../../lib/school/types';
import { adminRequest, useAdminResource } from './adminApi';
import { formatWhen } from './format';
import { Empty, LoadError, PageHeading, Skeleton, Status, type Tone } from './parts';

const loadLessons = () => adminRequest<{ lessons: Lesson[] }>('lessons');
const SUBJECTS = { physics: 'Physics', chemistry: 'Chemistry', math: 'Mathematics' } as const;
const STATUS: Record<Lesson['status'], [Tone, string]> = {
  draft: ['warn', 'Draft'],
  published: ['good', 'Published'],
  archived: ['quiet', 'Archived'],
};

/** Operator lesson library in console chrome; editing opens the shared lesson editor. */
export function LessonsPanel() {
  const { language } = useLanguage();
  const { data, error, loading, reload } = useAdminResource(loadLessons);
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const text = (value: { en: string; bn: string } | undefined) =>
    value ? value[language] || value.en : '';
  const rows =
    data?.lessons.filter(
      (l) => (!subject || l.subject === subject) && (!grade || String(l.grade) === grade),
    ) ?? [];
  return (
    <>
      <PageHeading
        title={uiText('Lessons')}
        detail={uiText(
          'Lessons every school can use. Both languages must be approved before a lesson is published.',
        )}
        onRefresh={() => void reload()}
        busy={loading}
      />
      <LoadError message={error} onRetry={() => void reload()} />
      <section className="adm-section" aria-labelledby="lesson-list">
        <h2 id="lesson-list" className="adm-visually-hidden">
          {uiText('All lessons')}
        </h2>
        <div className="adm-section-head">
          <div className="adm-filters">
            <label className="adm-field adm-field-inline">
              <span>{uiText('Subject')}</span>
              <select value={subject} onChange={(e) => setSubject(e.target.value)}>
                <option value="">{uiText('All subjects')}</option>
                {Object.entries(SUBJECTS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {uiText(label)}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field adm-field-inline">
              <span>{uiText('Grade')}</span>
              <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                <option value="">{uiText('All grades')}</option>
                {['9', '10'].map((g) => (
                  <option key={g} value={g}>
                    {uiText('Grade {v0}', { v0: Number(g) })}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <Link className="adm-button adm-primary" href="/admin/lessons/new">
            {uiText('Create lesson')}
          </Link>
        </div>
        {!data ? (
          loading && <Skeleton rows={6} />
        ) : rows.length === 0 ? (
          <Empty
            title={
              data.lessons.length
                ? uiText('No lessons match these filters.')
                : uiText('No lessons yet.')
            }
          >
            {data.lessons.length
              ? uiText('Choose all subjects or all grades to see more.')
              : uiText('Create a lesson to offer it to every school.')}
          </Empty>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table adm-cards">
              <thead>
                <tr>
                  <th scope="col">{uiText('Lesson')}</th>
                  <th scope="col">{uiText('Subject')}</th>
                  <th scope="col" className="num">
                    {uiText('Grade')}
                  </th>
                  <th scope="col">{uiText('Chapter')}</th>
                  <th scope="col">{uiText('Status')}</th>
                  <th scope="col">{uiText('Updated')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lesson) => {
                  const [tone, label] = STATUS[lesson.status];
                  return (
                    <tr key={lesson.id}>
                      <th scope="row" data-label={uiText('Lesson')}>
                        <Link className="adm-row-open" href={'/admin/lessons/' + lesson.id}>
                          {text(lesson.title)}
                        </Link>
                      </th>
                      <td data-label={uiText('Subject')}>{uiText(SUBJECTS[lesson.subject])}</td>
                      <td className="num" data-label={uiText('Grade')}>
                        {uiNumber(lesson.grade)}
                      </td>
                      <td data-label={uiText('Chapter')}>
                        {text(CHAPTERS.find((c) => c.id === lesson.chapterId)?.title)}
                      </td>
                      <td data-label={uiText('Status')}>
                        <Status tone={tone}>{uiText(label)}</Status>
                      </td>
                      <td className="adm-when" data-label={uiText('Updated')}>
                        {formatWhen(lesson.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
