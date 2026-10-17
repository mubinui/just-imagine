type SchoolLanguage = 'en' | 'bn';

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

/** School recovery language must never send students to the family/parent flow. */
export function schoolError(error: unknown, language: SchoolLanguage): string {
  const message = schoolErrorMessage(error);
  if (language === 'en' || /[\u0980-\u09ff]/u.test(message)) return message;
  const code =
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
      ? error.code
      : '';
  const signal = `${code} ${message}`;
  if (/too many PIN attempts|PIN.{0,30}(?:locked|lockout)/i.test(signal))
    return 'অনেকবার পিন দিয়ে চেষ্টা করা হয়েছে। ১৫ মিনিট অপেক্ষা করো, অথবা তোমার শিক্ষককে জানাও।';
  if (
    /school code,? username and PIN|(?:incorrect|wrong|invalid|mismatch).{0,15}PIN|PIN.{0,15}(?:incorrect|wrong|invalid|mismatch)/i.test(
      signal,
    )
  )
    return 'বিদ্যালয়ের কোড, ইউজারনেম ও ছয় অঙ্কের পিন মিলিয়ে আবার চেষ্টা করো। পিন না মিললে তোমার শিক্ষককে জানাও।';
  if (
    /(?:class|PIN).{0,30}(?:changed|reset)|id-token-revoked|user-token-expired|invalid-user-token/i.test(
      signal,
    )
  )
    return 'তোমার শ্রেণি বা পিন বদলেছে। শিক্ষকের কাছ থেকে বর্তমান শ্রেণি ও পিন জেনে আবার প্রবেশ করো।';
  if (/This is not a student account/i.test(signal))
    return 'শিক্ষার্থীর অ্যাকাউন্ট দিয়ে আবার প্রবেশ করো। শ্রেণি বা পিন বদলে থাকলে শিক্ষকের কাছ থেকে নতুন তথ্য নাও।';
  if (/school AI is paused/i.test(signal))
    return 'পরিচালক এখন বিদ্যালয়ের AI সেবা স্থগিত রেখেছেন। সংরক্ষিত পাঠ পড়তে পারবে; সেবা চালুর জন্য শিক্ষক বা বিদ্যালয় প্রশাসককে জানাও।';
  if (/school.{0,25}(?:paused|suspended)/i.test(signal))
    return /still read/i.test(message)
      ? 'বিদ্যালয়ের কার্যক্রম স্থগিত আছে। রেকর্ড পড়তে পারবেন, তবে পরিবর্তন করা যাবে না। আবার চালু করতে বিদ্যালয় প্রশাসককে জানান।'
      : 'তোমার বিদ্যালয়ের কার্যক্রম এখন স্থগিত আছে। আবার চালু করার জন্য তোমার শিক্ষক বা বিদ্যালয় প্রশাসককে জানাও।';
  if (/class is not available|class not found/i.test(signal))
    return 'তোমার শ্রেণিটি এখন পাওয়া যাচ্ছে না। সঠিক শ্রেণিতে যোগ করার জন্য শিক্ষককে জানাও, তারপর আবার প্রবেশ করো।';
  if (/lesson.{0,35}changed|revision.{0,30}(?:conflict|changed|match)/i.test(signal))
    return 'পাঠটি ইতিমধ্যে বদলেছে। তোমার লেখা আলাদা করে রেখে পাঠটি আবার খোলো, তারপর নতুন সংস্করণে পরিবর্তন সংরক্ষণ করো বা উত্তর দাও।';
  if (/QUOTA_EXHAUSTED|allowance|quota|used today.{0,10}tutor time|daily.{0,20}limit/i.test(signal))
    return 'আজ বিদ্যালয়ের AI বা কথা বলার বরাদ্দ শেষ হয়েছে। পরের দিন আবার চেষ্টা করো, অথবা তোমার শিক্ষক বা বিদ্যালয় প্রশাসককে জানাও।';
  if (
    /auth\/(?:invalid-credential|wrong-password|user-not-found|invalid-email)|email and password.{0,20}(?:match|invalid)/i.test(
      signal,
    )
  )
    return 'শিক্ষকের ইমেইল বা পাসওয়ার্ড মিলছে না। তথ্য মিলিয়ে আবার চেষ্টা করুন; প্রয়োজনে বিদ্যালয় প্রশাসককে জানান।';
  if (/auth\/too-many-requests/i.test(signal))
    return 'অনেকবার প্রবেশের চেষ্টা হয়েছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন; সমস্যা থাকলে বিদ্যালয় প্রশাসককে জানান।';
  if (/invite.{0,30}(?:expired|already used)/i.test(signal))
    return 'এই আমন্ত্রণের মেয়াদ শেষ বা এটি ব্যবহার করা হয়েছে। নতুন আমন্ত্রণের জন্য বিদ্যালয়ের পরিচালককে জানান।';
  if (/invite.{0,30}incomplete|invitation link is incomplete/i.test(signal))
    return 'আমন্ত্রণের লিংকটি অসম্পূর্ণ। বিদ্যালয়ের পরিচালকের কাছ থেকে সম্পূর্ণ লিংকটি নিন।';
  if (/email address on this invitation/i.test(signal))
    return 'আমন্ত্রণে যে ইমেইল ঠিকানা আছে, সেটি দিয়ে প্রবেশ করুন। অন্য ঠিকানা লাগলে বিদ্যালয়ের পরিচালককে জানান।';
  if (/separate teacher account|teacher account separate/i.test(signal))
    return 'এই আমন্ত্রণের জন্য আলাদা শিক্ষকের অ্যাকাউন্ট ব্যবহার করুন। পরিবার বা পরিচালকের অ্যাকাউন্ট দিয়ে এটি গ্রহণ করা যাবে না।';
  if (
    /FORBIDDEN|permission|not a school administrator|cannot open this area|another school|operator account.{0,15}required/i.test(
      signal,
    )
  )
    return 'এই কাজের অনুমতি নেই। সঠিক বিদ্যালয়ের অ্যাকাউন্ট দিয়ে প্রবেশ করুন; প্রবেশাধিকার লাগলে শিক্ষক বা বিদ্যালয় প্রশাসককে জানান।';
  if (
    /UNAUTHENTICATED|sign in again|sign in to continue|token.{0,20}expired|session.{0,20}ended/i.test(
      signal,
    )
  )
    return 'প্রবেশের মেয়াদ শেষ হয়েছে। বিদ্যালয়ের অ্যাকাউন্ট দিয়ে আবার প্রবেশ করো; নতুন পিন দরকার হলে শিক্ষককে জানাও।';
  if (
    /network|failed to fetch|fetch failed|load failed|connection|could not connect|timed out/i.test(
      signal,
    )
  )
    return 'সংযোগ পাওয়া যাচ্ছে না। ইন্টারনেটের সংযোগ দেখে আবার চেষ্টা করো। সমস্যা চললে শিক্ষক বা বিদ্যালয় প্রশাসককে জানাও।';
  return 'কাজটি শেষ করা যায়নি। আবার চেষ্টা করো। সমস্যা চললে তোমার শিক্ষক বা বিদ্যালয় প্রশাসককে জানাও।';
}
