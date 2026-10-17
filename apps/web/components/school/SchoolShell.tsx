'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { onIdTokenChanged, signOut } from 'firebase/auth';
import { firebase } from '../../lib/firebase';
import { schoolRequest, schoolHref, setOperatorSchoolContext } from '../../lib/school/api';
import type { SchoolMe, StudyMe } from '../../lib/school/types';
import { useSchoolLanguage, setSchoolLanguage } from '../../lib/i18n/study';
import { Brand } from '../Shell';
import { LanguageSwitch, ErrorNotice, Loading, SchoolAudienceProvider } from './shared';
import { ThemePicker } from '../ThemePicker';
import { UiIcon, type UiIconName } from '../UiIcon';
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
  const nav: [
    href: string,
    key: 'home' | 'classes' | 'students' | 'lessons' | 'results' | 'leaderboard' | 'lab',
    icon: UiIconName,
  ][] = student
    ? [
        ['/study', 'home', 'home'],
        ['/study/leaderboard', 'leaderboard', 'trophy'],
        ['/study/lab', 'lab', 'flask'],
      ]
    : [
        ['/school', 'home', 'home'],
        ['/school/classes', 'classes', 'gallery'],
        ['/school/students', 'students', 'learn'],
        ['/school/lessons', 'lessons', 'book'],
        ['/school/results', 'results', 'check'],
        ['/school/leaderboard', 'leaderboard', 'trophy'],
      ];
  const root = student ? '/study' : '/school';
  // Lesson editors, materials and other sub-pages keep their section highlighted.
  const current = (href: string) =>
    href === root ? path === root : path === href || path.startsWith(href + '/');
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    // On phones the tabs scroll sideways; keep the current one in view without moving the page.
    if (nav && active && nav.scrollWidth > nav.clientWidth)
      nav.scrollTo({ left: active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2 });
  }, [path, me]);
  const bnStudent = student && language === 'bn';
  const signOutLabel = bnStudent ? 'বের হও' : s('signOut');
  const showNav = !error;
  return (
    <SchoolAudienceProvider audience={student ? 'student' : 'teacher'}>
      <div
        data-world="parent"
        lang={language === 'bn' ? 'bn' : 'en'}
        className={'sch ' + (student ? 'study' : 'teacher')}
      >
        <header className="header sch-header">
          <Brand />
          <div className="sch-header-end">
            <span className="sch-school-name">
              {language === 'bn' ? me?.school?.nameBn : me?.school?.name}
            </span>
            <LanguageSwitch student={student} />
            <ThemePicker compact language={language} />
            <button
              type="button"
              className="sch-signout"
              onClick={() => void signOut(firebase().auth)}
            >
              <UiIcon name="finish" />
              <span>{signOutLabel}</span>
            </button>
          </div>
        </header>
        <div className={'sch-shell' + (showNav ? '' : ' sch-shell-bare')}>
          {showNav && (
            <aside className="sch-nav">
              <p>{student ? s('study') : s('teacher')}</p>
              <nav ref={navRef} aria-label={student ? s('study') : s('school')}>
                {nav.map(([href, key, icon]) => (
                  <Link
                    href={schoolHref(href)}
                    key={href}
                    aria-current={current(href) ? 'page' : undefined}
                  >
                    <UiIcon name={icon} />
                    <span>{s(key)}</span>
                  </Link>
                ))}
              </nav>
            </aside>
          )}
          <main className="sch-content">
            <ErrorNotice error={error} />
            {error && (
              <Link
                className="sch-action-link"
                href={student ? '/study/sign-in' : '/school/sign-in'}
              >
                {bnStudent ? 'আবার প্রবেশ করো' : s('signIn')}
              </Link>
            )}
            {!me && !error ? (
              <Loading rows={4} />
            ) : !error && me ? (
              <Session.Provider key={me.uid + me.schoolId} value={me}>
                {children}
              </Session.Provider>
            ) : null}
          </main>
        </div>
      </div>
    </SchoolAudienceProvider>
  );
}
