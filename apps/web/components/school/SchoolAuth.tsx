'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { firebase } from '../../lib/firebase';
import { schoolRequest } from '../../lib/school/api';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { Brand } from '../Shell';
import { AuthCompanion } from '../AuthCompanion';
import { LanguageSwitch, Field, ErrorNotice, useSchoolAction } from './shared';
import '../../app/school.css';
export function SchoolAuth({
  student = false,
  join = false,
}: {
  student?: boolean;
  join?: boolean;
}) {
  const { s, language } = useSchoolLanguage(),
    router = useRouter(),
    action = useSchoolAction();
  const [signup, setSignup] = useState(false);
  async function teacher(form: FormData | null) {
    await action.run(async () => {
      const auth = firebase().auth;
      const result = form
        ? await (signup ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(
            auth,
            String(form.get('email')),
            String(form.get('password')),
          )
        : await signInWithPopup(auth, new GoogleAuthProvider());
      if (join) {
        const invite = new URLSearchParams(window.location.search).get('invite');
        if (!invite) throw new Error('This invitation link is incomplete.');
        await schoolRequest('school/invites/accept', { token: invite });
      }
      await result.user.getIdToken(true);
      router.replace('/school');
    });
  }
  return (
    <main className="sch-auth sch auth-character-page">
      <header className="auth-character-header">
        <Brand />
        <LanguageSwitch />
      </header>
      <div className="auth-character-layout">
        <AuthCompanion role={student ? 'student' : 'teacher'} language={language} />
        <section>
          <h1>{student ? s('studentAccess') : join ? s('join') : s('teacherAccess')}</h1>
          <p className="auth-character-help">
            {student
              ? language === 'bn'
                ? 'শিক্ষকের দেওয়া বিদ্যালয়ের কোড, ব্যবহারকারীর নাম ও পিন দিয়ে প্রবেশ করো।'
                : 'Use the school code, username and PIN your teacher gave you.'
              : language === 'bn'
                ? 'তোমার বিদ্যালয়ের শিক্ষক অ্যাকাউন্ট দিয়ে প্রবেশ করো।'
                : 'Continue with your school’s teacher account.'}
          </p>
          <ErrorNotice error={action.errorDetail ?? action.error} />
          {student ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void action.run(async () => {
                  const r = await schoolRequest<{ customToken: string }>(
                    'study/login',
                    {
                      schoolCode: String(form.get('schoolCode')).trim().toUpperCase(),
                      username: String(form.get('username')).trim(),
                      pin: String(form.get('pin')).replace(/[০-৯]/g, (d) =>
                        String(d.charCodeAt(0) - 0x09e6),
                      ),
                    },
                    'POST',
                    true,
                  );
                  await signInWithCustomToken(firebase().auth, r.customToken);
                  router.replace('/study');
                });
              }}
            >
              <Field label={s('schoolCode')}>
                <input
                  name="schoolCode"
                  required
                  maxLength={6}
                  autoCapitalize="characters"
                  autoComplete="organization"
                />
              </Field>
              <Field label={s('username')}>
                <input name="username" required autoComplete="username" autoCapitalize="none" />
              </Field>
              <Field label={s('pin')}>
                <input
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  minLength={6}
                  maxLength={6}
                  required
                  autoComplete="current-password"
                />
              </Field>
              <button className="sch-primary" disabled={action.busy}>
                {action.busy ? s('connect') : s('signIn')}
              </button>
            </form>
          ) : (
            <>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void teacher(new FormData(event.currentTarget));
                }}
              >
                <Field label={s('email')}>
                  <input name="email" type="email" required autoComplete="email" />
                </Field>
                <Field label={s('password')}>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete={signup ? 'new-password' : 'current-password'}
                  />
                </Field>
                <button className="sch-primary" disabled={action.busy}>
                  {action.busy ? s('connect') : s(signup ? 'createAccount' : 'signIn')}
                </button>
              </form>
              <button disabled={action.busy} onClick={() => void teacher(null)}>
                {s('google')}
              </button>
              {join && (
                <button disabled={action.busy} onClick={() => setSignup(!signup)}>
                  {s(signup ? 'signIn' : 'createAccount')}
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
