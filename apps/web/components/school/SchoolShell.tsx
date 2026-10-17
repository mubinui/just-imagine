'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { firebase } from '../../lib/firebase';
import { schoolRequest, schoolHref, setOperatorSchoolContext } from '../../lib/school/api';
import type { SchoolMe, StudyMe } from '../../lib/school/types';
import { useSchoolLanguage, setSchoolLanguage } from '../../lib/i18n/study';
import { Brand } from '../Shell';
import { LanguageSwitch, ErrorNotice, Loading } from './shared';
import '../../app/school.css';
const Session = createContext<SchoolMe | StudyMe | null>(null);
export function useSchoolSession() {
  return useContext(Session);
}
export function SchoolShell({
  children,
  student = false,
}: {
  children: ReactNode;
  student?: boolean;
}) {
  const { s, language } = useSchoolLanguage(),
    router = useRouter(),
    path = usePathname();
  const [me, setMe] = useState<SchoolMe | StudyMe>(),
    [error, setError] = useState('');
  useEffect(() => {
    let generation = 0;
    const unsubscribe = onIdTokenChanged(firebase().auth, (user) => {
      const request = ++generation;
      setMe(undefined);
      setError('');
      setOperatorSchoolContext(null);
      if (!user) {
        router.replace(student ? '/study/sign-in' : '/school/sign-in');
        return;
      }
      void user
        .getIdTokenResult()
        .then(async (token) => {
          if (
            student
              ? token.claims.role !== 'student'
              : token.claims.role !== 'schoolAdmin' && token.claims.admin !== true
          )
            throw new Error(
              'This account cannot open this area. Sign in with the correct account.',
            );
          const context =
            token.claims.admin === true
              ? new URLSearchParams(window.location.search).get('schoolId')
              : null;
          if (request !== generation) return;
          setOperatorSchoolContext(context);
          const data = await schoolRequest<SchoolMe | StudyMe>(
            (student ? 'study/me' : 'school/me') +
              (context ? '?schoolId=' + encodeURIComponent(context) : ''),
          );
          if (request !== generation || firebase().auth.currentUser?.uid !== user.uid) return;
          setMe(data);
          if ('student' in data && data.student) setSchoolLanguage(data.student.language);
        })
        .catch((e) => {
          if (request === generation) {
            setMe(undefined);
            setError(e instanceof Error ? e.message : 'Sign in again to continue.');
          }
        });
    });
    return () => {
      generation++;
      unsubscribe();
    };
  }, [student, router]);
  const nav = student
    ? [
        ['/study', 'home'],
        ['/study/leaderboard', 'leaderboard'],
        ['/study/lab', 'lab'],
      ]
    : [
        ['/school', 'home'],
        ['/school/classes', 'classes'],
        ['/school/students', 'students'],
        ['/school/lessons', 'lessons'],
        ['/school/results', 'results'],
        ['/school/leaderboard', 'leaderboard'],
      ];
  return (
    <div data-world="parent" className={'sch ' + (student ? 'study' : 'teacher')}>
      <header className="header sch-header">
        <Brand />
        <div className="sch-header-end">
          <span>{language === 'bn' ? me?.school?.nameBn : me?.school?.name}</span>
          <LanguageSwitch student={student} />
        </div>
      </header>
      <div className="sch-shell">
        <aside className="sch-nav">
          <p>{student ? s('study') : s('teacher')}</p>
          <nav aria-label={student ? s('study') : s('school')}>
            {nav.map(([href, key]) => (
              <Link
                href={schoolHref(href!)}
                key={href}
                aria-current={path === href ? 'page' : undefined}
              >
                {s(key as 'home')}
              </Link>
            ))}
          </nav>
          <button onClick={() => void signOut(firebase().auth)}>{s('signOut')}</button>
        </aside>
        <main className="sch-content">
          <ErrorNotice error={error} />
          {error && (
            <Link className="sch-action-link" href={student ? '/study/sign-in' : '/school/sign-in'}>
              {s('signIn')}
            </Link>
          )}
          {!me && !error ? (
            <Loading />
          ) : !error && me ? (
            <Session.Provider key={me.uid + me.schoolId} value={me}>
              {children}
            </Session.Provider>
          ) : null}
        </main>
      </div>
    </div>
  );
}
