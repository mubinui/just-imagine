import { currentLanguage, formatNumber, withNameSuffix, type Vars } from './index';
import { en } from './en';
import { bn } from './bn';
import { UI_BN } from './ui-bn';
import { english } from '../strings/en';
import { isPermissionDenied } from '../permission-denied';

const catalogue = new Map<string, string>();
function collect(a: object, b: object) {
  for (const [key, value] of Object.entries(a)) {
    const translated = (b as Record<string, unknown>)[key];
    if (typeof value === 'string' && typeof translated === 'string')
      catalogue.set(value, translated);
    else if (typeof value === 'object' && value && typeof translated === 'object' && translated)
      collect(value, translated);
  }
}
collect(en, bn);
for (const [key, value] of Object.entries(UI_BN)) catalogue.set(key, value);
const englishCatalogue = new Map<string, string>();
for (const [english, bangla] of catalogue) {
  if (!englishCatalogue.has(bangla)) englishCatalogue.set(bangla, english);
}

/** Explicit UI translation, never applied to arbitrary DOM nodes or stored user content. */
const numericLabel = /^[-+]?\d+(?:[.,:/–-]\d+)*%?$/;
function localizedText(text: string): string {
  if (currentLanguage() !== 'bn') return englishCatalogue.get(text) ?? text;
  const translated = catalogue.get(text);
  if (translated !== undefined)
    return translated.replace(/\{\w+\}|\d/g, (token) =>
      token.startsWith('{') ? token : formatNumber(Number(token), 'bn'),
    );
  return numericLabel.test(text) ? text.replace(/\d/g, (d) => formatNumber(Number(d), 'bn')) : text;
}
export function copy(english: string | null | undefined, vars?: Vars): string {
  const language = currentLanguage();
  const text = localizedText(english ?? '');
  return text.replace(/\{(\w+)\}(-এর|-কে)?/g, (match, key: string, suffix: string | undefined) => {
    const value = vars?.[key];
    if (value === undefined) return match;
    const formatted =
      typeof value === 'number' ? formatNumber(value, language) : localizedText(value);
    return withNameSuffix(formatted, suffix, language);
  });
}

/** Never expose an untranslated transport/SDK error as Bangla interface copy. */
export function uiError(error: unknown, fallback = 'Could not finish. Please try again.'): string {
  // A world the browser may not read is a rules answer, not something a child should see.
  if (isPermissionDenied(error)) return copy(english.unavailable);
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (currentLanguage() === 'en')
    return /[\u0980-\u09ff]/.test(message) ? fallback : message || fallback;
  if (/[\u0980-\u09ff]/.test(message)) return message;
  if (catalogue.has(message)) return copy(message);
  if (/network|fetch|connection|connect|offline/i.test(message))
    return 'সংযোগ পাওয়া যায়নি। ইন্টারনেটের সংযোগ দেখে আবার চেষ্টা করুন।';
  if (/quota|limit|allowance/i.test(message))
    return 'এই মুহূর্তের বরাদ্দ শেষ। কিছুক্ষণ পর আবার চেষ্টা করুন, অথবা অভিভাবককে বলুন।';
  if (/sign.in|unauth|token|session ended/i.test(message))
    return 'আবার প্রবেশ করুন, তারপর চেষ্টা করুন।';
  if (/permission|forbidden|administrator/i.test(message))
    return 'এই কাজের অনুমতি নেই। সঠিক অ্যাকাউন্ট দিয়ে প্রবেশ করুন।';
  return copy(fallback) === fallback ? 'কাজটি শেষ করা যায়নি। আবার চেষ্টা করুন।' : copy(fallback);
}
export function hasUiCopy(english: string): boolean {
  return catalogue.has(english);
}

export function uiNumber(value: number | null | undefined): string {
  return value == null ? '' : formatNumber(value, currentLanguage());
}
