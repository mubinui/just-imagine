'use client';
import { useState } from 'react';
import Link from 'next/link';
import { schoolHref, useSchoolResource } from '../../lib/school/api';
import type { Lesson } from '../../lib/school/types';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { ErrorNotice, Loading } from './shared';
import { LessonMaterials, type MaterialKind, type MaterialLanguage } from './LessonMaterials';
import styles from './LessonMaterials.module.css';

export function LessonMaterialsPage({
  id,
  audience,
}: {
  id: string;
  audience: 'teacher' | 'admin' | 'student';
}) {
  const { language } = useSchoolLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState<MaterialLanguage | null>(null);
  const [kind, setKind] = useState<MaterialKind>('notes');
  const documentLanguage = selectedLanguage ?? language;
  const bn = documentLanguage === 'bn';
  const area = audience === 'admin' ? 'admin' : audience === 'student' ? 'study' : 'school';
  // The student branch only calls the existing public, key-redacted study endpoint.
  const { data, error, loading, reload } = useSchoolResource<{ lesson: Lesson }>(
    `${area}/lessons/${encodeURIComponent(id)}`,
  );
  const back = `/${area}/lessons/${encodeURIComponent(id)}`;
  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <Link href={audience === 'teacher' ? schoolHref(back) : back}>
          {bn ? 'পাঠে ফিরি' : 'Back to lesson'}
        </Link>
        <div className={styles.choices} role="group" aria-label={bn ? 'নথির ধরন' : 'Document type'}>
          <button type="button" aria-pressed={kind === 'notes'} onClick={() => setKind('notes')}>
            <span className={styles.choiceLabel}>{bn ? 'নোট' : 'Notes'}</span>
          </button>
          <button
            type="button"
            aria-pressed={kind === 'worksheet'}
            onClick={() => setKind('worksheet')}
          >
            <span className={styles.choiceLabel}>{bn ? 'অনুশীলনপত্র' : 'Worksheet'}</span>
          </button>
        </div>
        <label className={styles.language}>
          <span>{bn ? 'নথির ভাষা' : 'Document language'}</span>
          <select
            value={documentLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value === 'bn' ? 'bn' : 'en')}
          >
            <option value="en">English</option>
            <option value="bn">বাংলা</option>
          </select>
        </label>
        <button type="button" disabled={!data || loading || !!error} onClick={() => window.print()}>
          {bn ? 'প্রিন্ট / পিডিএফ' : 'Print / save PDF'}
        </button>
      </div>
      <p className={styles.savedOnly}>
        {bn
          ? 'সংরক্ষিত পাঠ থেকে তৈরি। সম্পাদকের অসংরক্ষিত পরিবর্তন এখানে নেই। উত্তর ও ইঙ্গিত এই নথিতে দেওয়া হয় না।'
          : 'Uses the saved lesson. Unsaved editor changes are not included. Answer keys and hints are omitted.'}
      </p>
      <ErrorNotice error={error} retry={reload} />
      {loading ? (
        <Loading />
      ) : !error && data ? (
        <LessonMaterials lesson={data.lesson} language={documentLanguage} kind={kind} />
      ) : null}
    </div>
  );
}
