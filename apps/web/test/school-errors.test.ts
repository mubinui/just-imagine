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
    expect(schoolError(english, 'en')).toBe(english);
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

  it('keeps Firebase auth codes available without rewriting English SDK messages', () => {
    const error = Object.assign(new Error('Authentication failed.'), {
      code: 'auth/invalid-credential',
    });
    expect(schoolError(error, 'bn')).toContain('শিক্ষকের ইমেইল বা পাসওয়ার্ড');
    expect(schoolError(error, 'en')).toBe('Authentication failed.');
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
