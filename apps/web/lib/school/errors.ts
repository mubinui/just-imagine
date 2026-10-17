type SchoolLanguage = 'en' | 'bn';
/** Students are addressed informally (তুমি); teachers and operators respectfully (আপনি). */
export type SchoolAudience = 'student' | 'teacher';

/** Keep transport details intact until rendering, including Firebase's machine-readable code. */
export function schoolErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message;
  return 'Could not finish. Please try again.';
}

type Copy = {
  /** English replacement; omitted when the API already wrote a readable English message. */
  en?: string;
  bn: string;
  /** Respectful Bangla for teacher screens when it differs from the student wording. */
  bnTeacher?: string;
};
type Rule = { test: RegExp; copy: Copy | ((message: string) => Copy) };

const NETWORK: Copy = {
  en: 'We couldn’t reach Just Imagine. Check your internet connection and try again.',
  bn: 'সংযোগ পাওয়া যাচ্ছে না। ইন্টারনেটের সংযোগ দেখে আবার চেষ্টা করো। সমস্যা চললে শিক্ষক বা বিদ্যালয় প্রশাসককে জানাও।',
  bnTeacher:
    'সংযোগ পাওয়া যাচ্ছে না। ইন্টারনেটের সংযোগ দেখে আবার চেষ্টা করুন। সমস্যা চললে বিদ্যালয় প্রশাসককে জানান।',
};
const FALLBACK: Copy = {
  en: 'Something went wrong on our side. Your saved work is unchanged. Please try again.',
  bn: 'কাজটি শেষ করা যায়নি। আবার চেষ্টা করো। সমস্যা চললে তোমার শিক্ষক বা বিদ্যালয় প্রশাসককে জানাও।',
  bnTeacher:
    'কাজটি শেষ করা যায়নি। সংরক্ষিত কাজ অপরিবর্তিত আছে। আবার চেষ্টা করুন; সমস্যা চললে বিদ্যালয় প্রশাসককে জানান।',
};

/** Ordered: the first matching rule wins. Tested against "<code> <message>". */
const RULES: Rule[] = [
  {
    test: /publication checks/i,
    copy: {
      bn: 'পাঠের প্রকাশ-পূর্ব যাচাই খুলে দেখুন। নির্দেশিত অংশ সংশোধন ও সংরক্ষণ করে আবার অনুমোদন দিন।',
    },
  },
  {
    test: /example (?:solution|lab solution)/i,
    copy: {
      bn: 'সমাধানের নমুনাটি মডেলের লক্ষ্য পূরণ করছে কি না যাচাই করুন। শুধু অনুমোদিত প্যারামিটার বা উপকরণ ব্যবহার করুন।',
    },
  },
  {
    test: /already solved at its starting settings/i,
    copy: {
      bn: 'সিমুলেশনের প্রারম্ভিক মানেই লক্ষ্য পূরণ হচ্ছে। প্রারম্ভিক মান বা লক্ষ্য বদলে শিক্ষার্থীকে সমাধানের সুযোগ দিন।',
    },
  },
  {
    test: /AI (?:translation changed|changed the scientific|returned the wrong language)/i,
    copy: {
      bn: 'AI উত্তরে ভাষা বা বৈজ্ঞানিক সংখ্যার পরিবর্তন ধরা পড়েছে। আপনার লেখা অপরিবর্তিত আছে। আবার চেষ্টা করুন বা নিজে সম্পাদনা করুন।',
    },
  },
  {
    test: /already in your school lessons/i,
    copy: {
      bn: 'এই শেয়ার করা পাঠটি ইতিমধ্যে আপনার বিদ্যালয়ের পাঠে আছে। নতুন কপি না করে আপনার কপিটি খুলুন।',
    },
  },
  {
    test: /too many PIN attempts|PIN.{0,30}(?:locked|lockout)/i,
    copy: {
      bn: 'অনেকবার পিন দিয়ে চেষ্টা করা হয়েছে। ১৫ মিনিট অপেক্ষা করো, অথবা তোমার শিক্ষককে জানাও।',
    },
  },
  {
    test: /school code,? username and PIN|(?:incorrect|wrong|invalid|mismatch).{0,15}PIN|PIN.{0,15}(?:incorrect|wrong|invalid|mismatch)/i,
    copy: {
      bn: 'বিদ্যালয়ের কোড, ইউজারনেম ও ছয় অঙ্কের পিন মিলিয়ে আবার চেষ্টা করো। পিন না মিললে তোমার শিক্ষককে জানাও।',
    },
  },
  {
    test: /account is paused|student.{0,20}suspended/i,
    copy: {
      bn: 'তোমার অ্যাকাউন্ট এখন স্থগিত আছে। আবার চালু করার জন্য তোমার শিক্ষককে জানাও।',
      bnTeacher:
        'এই শিক্ষার্থীর অ্যাকাউন্ট স্থগিত আছে। প্রয়োজনে শিক্ষার্থীর তালিকা থেকে আবার চালু করুন।',
    },
  },
  {
    test: /auth\/(?:id-token-revoked|user-token-expired|invalid-user-token|requires-recent-login)/i,
    copy: {
      en: 'Your sign-in has ended. Please sign in again.',
      bn: 'তোমার শ্রেণি বা পিন বদলেছে। শিক্ষকের কাছ থেকে বর্তমান শ্রেণি ও পিন জেনে আবার প্রবেশ করো।',
      bnTeacher: 'প্রবেশের মেয়াদ শেষ হয়েছে। আবার প্রবেশ করুন।',
    },
  },
  {
    test: /(?:class|PIN).{0,30}(?:changed|reset)|id-token-revoked|user-token-expired|invalid-user-token/i,
    copy: {
      bn: 'তোমার শ্রেণি বা পিন বদলেছে। শিক্ষকের কাছ থেকে বর্তমান শ্রেণি ও পিন জেনে আবার প্রবেশ করো।',
      bnTeacher: 'প্রবেশের মেয়াদ শেষ হয়েছে। আবার প্রবেশ করুন।',
    },
  },
  {
    test: /This is not a student account/i,
    copy: {
      bn: 'শিক্ষার্থীর অ্যাকাউন্ট দিয়ে আবার প্রবেশ করো। শ্রেণি বা পিন বদলে থাকলে শিক্ষকের কাছ থেকে নতুন তথ্য নাও।',
    },
  },
  {
    test: /school AI is paused/i,
    copy: {
      bn: 'পরিচালক এখন বিদ্যালয়ের AI সেবা স্থগিত রেখেছেন। সংরক্ষিত পাঠ পড়তে পারবে; সেবা চালুর জন্য শিক্ষক বা বিদ্যালয় প্রশাসককে জানাও।',
      bnTeacher:
        'পরিচালক এখন বিদ্যালয়ের AI সেবা স্থগিত রেখেছেন। সংরক্ষিত পাঠ অপরিবর্তিত আছে; নিজে সম্পাদনা চালিয়ে যেতে পারবেন।',
    },
  },
  {
    test: /School AI (?:is temporarily unavailable|is not connected|could not prepare|returned)/i,
    copy: {
      bn: 'বিদ্যালয়ের AI সেবা এখন সাড়া দিচ্ছে না। সংরক্ষিত পাঠ অপরিবর্তিত আছে; একটু পরে আবার চেষ্টা করো।',
      bnTeacher:
        'বিদ্যালয়ের AI সেবা এখন সাড়া দিচ্ছে না। সংরক্ষিত পাঠ অপরিবর্তিত আছে; একটু পরে আবার চেষ্টা করুন বা নিজে সম্পাদনা করুন।',
    },
  },
  {
    test: /school.{0,25}(?:paused|suspended)/i,
    copy: (message) =>
      /still read/i.test(message)
        ? {
            bn: 'বিদ্যালয়ের কার্যক্রম স্থগিত আছে। রেকর্ড পড়তে পারবেন, তবে পরিবর্তন করা যাবে না। আবার চালু করতে বিদ্যালয় প্রশাসককে জানান।',
          }
        : {
            bn: 'তোমার বিদ্যালয়ের কার্যক্রম এখন স্থগিত আছে। আবার চালু করার জন্য তোমার শিক্ষক বা বিদ্যালয় প্রশাসককে জানাও।',
            bnTeacher:
              'বিদ্যালয়ের কার্যক্রম এখন স্থগিত আছে। আবার চালু করতে বিদ্যালয় প্রশাসককে জানান।',
          },
  },
  {
    test: /class is not available|class not found/i,
    copy: {
      bn: 'তোমার শ্রেণিটি এখন পাওয়া যাচ্ছে না। সঠিক শ্রেণিতে যোগ করার জন্য শিক্ষককে জানাও, তারপর আবার প্রবেশ করো।',
      bnTeacher: 'শ্রেণিটি আর পাওয়া যাচ্ছে না। তালিকা হালনাগাদ করে আবার চেষ্টা করুন।',
    },
  },
  {
    test: /lesson.{0,35}changed|revision.{0,30}(?:conflict|changed|match)/i,
    copy: {
      bn: 'পাঠটি ইতিমধ্যে বদলেছে। তোমার লেখা আলাদা করে রেখে পাঠটি আবার খোলো, তারপর নতুন সংস্করণে পরিবর্তন সংরক্ষণ করো বা উত্তর দাও।',
      bnTeacher:
        'পাঠটি ইতিমধ্যে বদলেছে। আপনার লেখা আলাদা করে রেখে পাঠটি আবার খুলুন, তারপর নতুন সংস্করণে পরিবর্তন সংরক্ষণ করুন।',
    },
  },
  {
    test: /QUOTA_EXHAUSTED|allowance|quota|used today.{0,10}tutor time|daily.{0,20}limit/i,
    copy: {
      bn: 'আজ বিদ্যালয়ের AI বা কথা বলার বরাদ্দ শেষ হয়েছে। পরের দিন আবার চেষ্টা করো, অথবা তোমার শিক্ষক বা বিদ্যালয় প্রশাসককে জানাও।',
      bnTeacher:
        'আজ বিদ্যালয়ের AI বরাদ্দ শেষ হয়েছে। পরের দিন আবার চেষ্টা করুন; ততক্ষণ নিজে সম্পাদনা চালিয়ে যেতে পারবেন।',
    },
  },
  {
    // One message for every credential failure, so the form never reveals whether an email exists.
    test: /auth\/(?:invalid-credential|invalid-login-credentials|wrong-password|user-not-found|invalid-email|user-disabled|missing-password)|email and password.{0,20}(?:match|invalid)/i,
    copy: {
      en: 'That email and password don’t match a teacher account. Check them and try again, or ask your school administrator.',
      bn: 'শিক্ষকের ইমেইল বা পাসওয়ার্ড মিলছে না। তথ্য মিলিয়ে আবার চেষ্টা করুন; প্রয়োজনে বিদ্যালয় প্রশাসককে জানান।',
    },
  },
  {
    test: /auth\/too-many-requests/i,
    copy: {
      en: 'There were too many sign-in attempts. Wait a few minutes, then try again.',
      bn: 'অনেকবার প্রবেশের চেষ্টা হয়েছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন; সমস্যা থাকলে বিদ্যালয় প্রশাসককে জানান।',
    },
  },
  {
    test: /auth\/email-already-in-use/i,
    copy: {
      en: 'This email already has an account. Choose “Sign in” instead to accept the invitation.',
      bn: 'এই ইমেইলে আগেই অ্যাকাউন্ট আছে। আমন্ত্রণ গ্রহণ করতে “প্রবেশ করুন” বেছে নিন।',
    },
  },
  {
    test: /auth\/weak-password/i,
    copy: {
      en: 'Use a password of at least 8 characters.',
      bn: 'অন্তত ৮ অক্ষরের পাসওয়ার্ড ব্যবহার করুন।',
    },
  },
  {
    test: /auth\/(?:popup-closed-by-user|cancelled-popup-request|user-cancelled|popup-blocked)/i,
    copy: {
      en: 'Google sign-in was closed before it finished. Try again, and allow the pop-up if asked.',
      bn: 'Google দিয়ে প্রবেশ শেষ হওয়ার আগেই বন্ধ হয়েছে। আবার চেষ্টা করুন এবং পপ-আপ চালু রাখুন।',
    },
  },
  {
    test: /invite.{0,30}(?:expired|already used)/i,
    copy: {
      bn: 'এই আমন্ত্রণের মেয়াদ শেষ বা এটি ব্যবহার করা হয়েছে। নতুন আমন্ত্রণের জন্য বিদ্যালয়ের পরিচালককে জানান।',
    },
  },
  {
    test: /invite.{0,30}incomplete|invitation link is incomplete/i,
    copy: {
      bn: 'আমন্ত্রণের লিংকটি অসম্পূর্ণ। বিদ্যালয়ের পরিচালকের কাছ থেকে সম্পূর্ণ লিংকটি নিন।',
    },
  },
  {
    test: /email address on this invitation/i,
    copy: {
      bn: 'আমন্ত্রণে যে ইমেইল ঠিকানা আছে, সেটি দিয়ে প্রবেশ করুন। অন্য ঠিকানা লাগলে বিদ্যালয়ের পরিচালককে জানান।',
    },
  },
  {
    test: /separate teacher account|teacher account separate/i,
    copy: {
      bn: 'এই আমন্ত্রণের জন্য আলাদা শিক্ষকের অ্যাকাউন্ট ব্যবহার করুন। পরিবার বা পরিচালকের অ্যাকাউন্ট দিয়ে এটি গ্রহণ করা যাবে না।',
    },
  },
  {
    test: /FORBIDDEN|permission|not a school administrator|cannot open this area|another school|operator account.{0,15}required/i,
    copy: {
      bn: 'এই কাজের অনুমতি নেই। সঠিক বিদ্যালয়ের অ্যাকাউন্ট দিয়ে প্রবেশ করুন; প্রবেশাধিকার লাগলে শিক্ষক বা বিদ্যালয় প্রশাসককে জানান।',
    },
  },
  {
    test: /UNAUTHENTICATED|sign in again|sign in to continue|token.{0,20}expired|session.{0,20}ended/i,
    copy: {
      bn: 'প্রবেশের মেয়াদ শেষ হয়েছে। বিদ্যালয়ের অ্যাকাউন্ট দিয়ে আবার প্রবেশ করো; নতুন পিন দরকার হলে শিক্ষককে জানাও।',
      bnTeacher: 'প্রবেশের মেয়াদ শেষ হয়েছে। বিদ্যালয়ের অ্যাকাউন্ট দিয়ে আবার প্রবেশ করুন।',
    },
  },
  {
    test: /network|failed to fetch|fetch failed|load failed|connection|could not connect|timed out/i,
    copy: NETWORK,
  },
  {
    test: /^\s*INTERNAL\b|internal(?: server)? error|unexpected internal|request failed \(5\d\d\)/i,
    copy: FALLBACK,
  },
  {
    test: /auth\//i,
    copy: {
      en: 'We could not sign you in. Please try again, or ask your school administrator.',
      bn: 'প্রবেশ করা যায়নি। আবার চেষ্টা করুন; সমস্যা চললে বিদ্যালয় প্রশাসককে জানান।',
    },
  },
];

/** Messages that read like SDK or transport output rather than words written for people. */
const TECHNICAL = /firebase|auth\/|request failed \(|^\s*[[{]|zod|stack|undefined|null|TypeError/i;

/** School recovery language must never send students to the family/parent flow. */
export function schoolError(
  error: unknown,
  language: SchoolLanguage,
  audience: SchoolAudience = 'student',
): string {
  const message = schoolErrorMessage(error);
  if (language === 'bn' && /[ঀ-৿]/u.test(message)) return message;
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';
  const signal = `${code} ${message}`;
  const rule = RULES.find((candidate) => candidate.test.test(signal));
  const copy = rule ? (typeof rule.copy === 'function' ? rule.copy(message) : rule.copy) : null;
  if (language === 'en') {
    if (copy?.en) return copy.en;
    return TECHNICAL.test(message) ? FALLBACK.en! : message;
  }
  const chosen = copy ?? FALLBACK;
  return audience === 'teacher' ? (chosen.bnTeacher ?? chosen.bn) : chosen.bn;
}
