'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCustomToken,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
} from 'firebase/auth';
import { firebase } from '../../lib/firebase';
import { schoolRequest } from '../../lib/school/api';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { Brand } from '../Shell';
import { AuthCompanion } from '../AuthCompanion';
import {
  LanguageSwitch,
  Field,
  ErrorNotice,
  Loading,
  useSchoolAction,
  SchoolAudienceProvider,
} from './shared';
import '../../app/school.css';

type InviteState =
  | { state: 'checking' }
  | { state: 'valid'; token: string; email: string }
  | { state: 'invalid'; error: unknown };

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
  const [signup, setSignup] = useState(join);
  const [invite, setInvite] = useState<InviteState>({ state: 'checking' });
  const bn = language === 'bn';
  // The invitation is checked before any account is created or signed in.
  useEffect(() => {
    if (!join) return;
    const token = new URLSearchParams(window.location.search).get('invite');
    let active = true;
    void (async () => {
      try {
        if (!token) throw new Error('This invitation link is incomplete.');
        const checked = await schoolRequest<{ email: string }>(
          'school/invites/check',
          { token },
          'POST',
          true,
        );
        if (active) setInvite({ state: 'valid', token, email: checked.email });
      } catch (error) {
        if (active) setInvite({ state: 'invalid', error });
      }
    })();
    return () => {
      active = false;
    };
  }, [join]);
  async function teacher(form: FormData | null) {
    await action.run(async () => {
      const auth = firebase().auth;
      const result = form
        ? await (signup ? createUserWithEmailAndPassword : signInWithEmailAndPassword)(
            auth,
            String(form.get('email')).trim(),
            String(form.get('password')),
          )
        : await signInWithPopup(auth, new GoogleAuthProvider());
      if (join) {
        if (invite.state !== 'valid') throw new Error('This invitation link is incomplete.');
        try {
          await schoolRequest('school/invites/accept', { token: invite.token });
        } catch (error) {
          // Never leave a half-joined account signed in on a failed acceptance.
          await signOut(auth);
          throw error;
        }
      }
      await result.user.getIdToken(true);
      router.replace('/school');
    });
  }
  const studentForm = (
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
          // The language chosen here wins over the one saved on the profile.
          await schoolRequest('study/me', { language }, 'PATCH').catch(() => undefined);
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
        {action.busy ? s('connect') : bn ? 'প্রবেশ করো' : s('signIn')}
      </button>
    </form>
  );
  const teacherForm = (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void teacher(new FormData(event.currentTarget));
        }}
      >
        <Field
          label={s('email')}
          hint={
            join && invite.state === 'valid'
              ? bn
                ? 'আমন্ত্রণটি এই ঠিকানায় পাঠানো হয়েছে।'
                : 'The invitation was sent to this address.'
              : undefined
          }
        >
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            key={invite.state === 'valid' ? invite.email : 'email'}
            defaultValue={invite.state === 'valid' ? invite.email : undefined}
            readOnly={join && invite.state === 'valid'}
          />
        </Field>
        <Field
          label={s('password')}
          hint={signup ? (bn ? 'অন্তত ৮ অক্ষর।' : 'At least 8 characters.') : undefined}
        >
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
      <button
        type="button"
        className="sch-auth-google"
        disabled={action.busy}
        onClick={() => void teacher(null)}
      >
        {s('google')}
      </button>
      {join && (
        <button type="button" disabled={action.busy} onClick={() => setSignup(!signup)}>
          {signup
            ? bn
              ? 'আগেই অ্যাকাউন্ট আছে? প্রবেশ করুন'
              : 'Already have an account? Sign in'
            : s('createAccount')}
        </button>
      )}
    </>
  );
  return (
    <SchoolAudienceProvider audience={student ? 'student' : 'teacher'}>
      <main className="sch-auth sch auth-character-page" lang={bn ? 'bn' : 'en'}>
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
                ? bn
                  ? 'শিক্ষকের দেওয়া বিদ্যালয়ের কোড, ইউজারনেম ও পিন দিয়ে প্রবেশ করো।'
                  : 'Use the school code, username and PIN your teacher gave you.'
                : join
                  ? bn
                    ? 'আমন্ত্রণের ইমেইল ঠিকানা দিয়ে অ্যাকাউন্ট তৈরি করুন বা প্রবেশ করুন।'
                    : 'Create an account or sign in with the email address the invitation was sent to.'
                  : bn
                    ? 'আপনার বিদ্যালয়ের শিক্ষক অ্যাকাউন্ট দিয়ে প্রবেশ করুন।'
                    : 'Continue with your school’s teacher account.'}
            </p>
            <ErrorNotice error={action.errorDetail ?? action.error} />
            {student ? (
              studentForm
            ) : !join ? (
              teacherForm
            ) : invite.state === 'checking' ? (
              <Loading rows={2} />
            ) : invite.state === 'invalid' ? (
              <ErrorNotice error={invite.error} />
            ) : (
              teacherForm
            )}
          </section>
        </div>
      </main>
    </SchoolAudienceProvider>
  );
}
