import { describe, expect, it } from 'vitest';
import { schoolError, schoolErrorMessage } from '../lib/school/errors';

describe('school-specific error recovery', () => {
  it.each([
    ['Check your school code, username and PIN.', ['বিদ্যালয়ের কোড', 'ইউজারনেম', 'পিন', 'শিক্ষক']],
    ['Too many PIN attempts. Please wait 15 minutes or ask your teacher.', ['১৫ মিনিট', 'শিক্ষক']],
    [
      'Your school is paused right now. Please ask your teacher.',
      ['বিদ্যালয়ের', 'স্থগিত', 'শিক্ষক'],
    ],
    [
      'Your school is paused. You can still read its records.',
      ['পড়তে পারবেন', 'পরিবর্তন করা যাবে না'],
    ],
    ['Your class changed. Sign in again.', ['শ্রেণি বা পিন বদলেছে', 'আবার প্রবেশ']],
    ['Your PIN was reset. Sign in again.', ['শ্রেণি বা পিন বদলেছে', 'শিক্ষকের']],
    ['This is not a student account.', ['শিক্ষার্থীর অ্যাকাউন্ট', 'পিন বদলে থাকলে']],
    ['This account is not a school administrator.', ['অনুমতি নেই', 'সঠিক বিদ্যালয়ের অ্যাকাউন্ট']],
    ['This lesson changed. Reload it before saving.', ['লেখা আলাদা করে', 'আবার খোলো']],
    ['Your school has used today’s AI allowance.', ['আজ বিদ্যালয়ের', 'পরের দিন', 'শিক্ষক']],
    ['Your school has used today’s tutor time.', ['আজ বিদ্যালয়ের', 'কথা বলার বরাদ্দ']],
    ['Failed to fetch', ['ইন্টারনেটের সংযোগ', 'আবার চেষ্টা']],
    ['Unexpected internal response', ['আবার চেষ্টা', 'বিদ্যালয় প্রশাসক']],
  ])('explains the actual school error: %s', (english, fragments) => {
    const bangla = schoolError(english, 'bn');
    for (const fragment of fragments) expect(bangla).toContain(fragment);
    expect(bangla).not.toMatch(/অভিভাবক|parent|guardian/i);
    if (!/fetch|internal/i.test(english)) expect(schoolError(english, 'en')).toBe(english);
  });

  it('distinguishes a PIN lockout from the generic quota code used by the API', () => {
    expect(
      schoolError(
        {
          code: 'QUOTA_EXHAUSTED',
          message: 'Too many PIN attempts. Please wait 15 minutes or ask your teacher.',
        },
        'bn',
      ),
    ).toContain('১৫ মিনিট');
    expect(
      schoolError({ code: 'QUOTA_EXHAUSTED', message: 'Daily limit reached.' }, 'bn'),
    ).toContain('বরাদ্দ শেষ');
  });

  it('maps Firebase auth codes to the same recovery copy in both languages', () => {
    const error = Object.assign(new Error('Authentication failed.'), {
      code: 'auth/invalid-credential',
    });
    expect(schoolError(error, 'bn')).toContain('শিক্ষকের ইমেইল বা পাসওয়ার্ড');
    expect(schoolError(error, 'en')).toMatch(/email and password don’t match/);
    expect(
      schoolError({ code: 'auth/id-token-revoked', message: 'Expired credentials.' }, 'bn'),
    ).toContain('আবার প্রবেশ');
    expect(
      schoolError({ code: 'auth/network-request-failed', message: 'Network failed.' }, 'bn'),
    ).toContain('ইন্টারনেট');
  });

  it('preserves authored Bangla and gives unknown thrown values a recoverable fallback', () => {
    const authored = 'তোমার শিক্ষককে জানাও।';
    expect(schoolError(authored, 'bn')).toBe(authored);
    expect(schoolErrorMessage(null)).toBe('Could not finish. Please try again.');
    expect(schoolError(null, 'bn')).toContain('আবার চেষ্টা');
  });
});

describe('English recovery copy never shows transport details', () => {
  const credentials = [
    'Firebase: Error (auth/wrong-password).',
    'Firebase: Error (auth/user-not-found).',
    'Firebase: Error (auth/invalid-credential).',
    'Firebase: Error (auth/invalid-login-credentials).',
  ];
  it('gives every credential failure one message, so it never reveals whether an email exists', () => {
    const messages = new Set(credentials.map((m) => schoolError(m, 'en')));
    expect(messages.size).toBe(1);
    const [message] = [...messages];
    expect(message).not.toMatch(/firebase|auth\//i);
    expect(message).toMatch(/email and password/i);
    expect(new Set(credentials.map((m) => schoolError(m, 'bn', 'teacher'))).size).toBe(1);
  });

  it.each([
    ['Failed to fetch', /internet connection/i],
    [
      {
        code: 'auth/network-request-failed',
        message: 'Firebase: Error (auth/network-request-failed).',
      },
      /internet connection/i,
    ],
    ['Internal error', /on our side/i],
    [{ code: 'INTERNAL', message: 'Something went wrong. Please try again.' }, /on our side/i],
    ['Request failed (502).', /on our side/i],
    ['Firebase: Error (auth/popup-closed-by-user).', /Google sign-in was closed/i],
    ['Firebase: Error (auth/too-many-requests).', /too many/i],
    ['Firebase: Error (auth/email-already-in-use).', /already has an account/i],
    ['Firebase: Error (auth/weak-password).', /at least 8 characters/i],
    ['Firebase: Error (auth/some-new-code).', /could not sign you in/i],
  ])('explains %s in plain English', (error, expected) => {
    const message = schoolError(error, 'en');
    expect(message).toMatch(expected);
    expect(message).not.toMatch(/firebase|auth\/|fetch|\(\d{3}\)/i);
  });

  it('keeps the friendly messages the API already writes', () => {
    for (const message of [
      'School AI is temporarily unavailable. Your saved lesson is unchanged; try again shortly.',
      'Your account is paused. Please ask your teacher.',
      'This shared lesson is already in your school lessons. Open your copy instead.',
    ])
      expect(schoolError(message, 'en')).toBe(message);
  });
});

describe('Bangla register follows the audience', () => {
  it('addresses teachers respectfully and students informally', () => {
    expect(schoolError('Failed to fetch', 'bn', 'teacher')).toContain('করুন');
    expect(schoolError('Failed to fetch', 'bn', 'teacher')).not.toMatch(/করো|তোমার/);
    expect(schoolError('Failed to fetch', 'bn')).toContain('করো');
    expect(schoolError('This lesson changed. Reload it before saving.', 'bn', 'teacher')).toContain(
      'খুলুন',
    );
    expect(schoolError(null, 'bn', 'teacher')).not.toMatch(/করো|তোমার/);
  });

  it('explains a paused student account to the student', () => {
    expect(schoolError('Your account is paused. Please ask your teacher.', 'bn')).toContain(
      'অ্যাকাউন্ট',
    );
  });
});
