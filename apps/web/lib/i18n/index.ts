import { setActiveStrings } from '../strings/en';
import { useSyncExternalStore } from 'react';
import { en, type StringKey, type StringTable } from './en';
import { bn } from './bn';
import { UI_BN } from './ui-bn';

export type { StringKey, StringTable } from './en';

export const LANGUAGES = ['en', 'bn'] as const;
export type Language = (typeof LANGUAGES)[number];
export const DEFAULT_LANGUAGE: Language = 'en';

const TABLES: Record<Language, StringTable> = { en, bn };

export function isLanguage(value: unknown): value is Language {
  return (LANGUAGES as readonly unknown[]).includes(value);
}

/** The whole table for one language, for components that index it dynamically. */
export function strings(language: Language): StringTable {
  return TABLES[language];
}

/** The value for the html or element `lang` attribute. */
export function langAttr(language: Language): 'en' | 'bn-BD' {
  return language === 'bn' ? 'bn-BD' : 'en';
}

const BENGALI_ZERO = 0x09e6;
const LATIN_ZERO = 0x30;

/** Child UI numbers: Bengali numerals for bn (lab values keep Latin digits by passing 'en'). */
export function formatNumber(value: number, language: Language): string {
  const text = String(value);
  if (language !== 'bn') return text;
  return text.replace(/\d/g, (d) =>
    String.fromCharCode(BENGALI_ZERO - LATIN_ZERO + d.charCodeAt(0)),
  );
}

const MINUTE_UNIT: Record<Language, string> = { en: 'min', bn: 'মিনিট' };

/** A whole number of minutes with its unit, never negative. */
export function formatMinutes(minutes: number, language: Language): string {
  const whole = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));
  return `${formatNumber(whole, language)} ${MINUTE_UNIT[language]}`;
}

export type Vars = Record<string, string | number>;

function lookup(table: StringTable, key: string): string | undefined {
  let node: unknown = table;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Attach grammatical Bangla name suffixes without changing the stored identity. */
export function withNameSuffix(
  value: string,
  suffix: string | undefined,
  language: Language,
): string {
  if (!suffix) return value;
  if (language !== 'bn' || !/[\u0980-\u09ff]$/u.test(value)) return value + suffix;
  if (suffix === '-কে') return value + 'কে';
  if (suffix === '-এর') return value + (/[অআইঈউঊঋএঐওঔািীুূেৈোৌ]$/u.test(value) ? 'র' : 'ের');
  return value + suffix;
}

/**
 * The string for `key` in `language`, with `{name}`-style variables filled in. Numbers are written
 * in the numerals of the language; a variable that was not passed stays visible as `{name}`.
 */
export function translate(language: Language, key: StringKey, vars?: Vars): string {
  const text = lookup(TABLES[language], key) ?? lookup(en, key) ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}(-এর|-কে)?/g, (match, name: string, suffix: string | undefined) => {
    const value = vars[name];
    if (value === undefined) return match;
    const formatted =
      typeof value === 'number'
        ? formatNumber(value, language)
        : language === 'bn'
          ? (UI_BN[value] ?? value)
          : (Object.entries(UI_BN).find(([, bn]) => bn === value)?.[0] ?? value);
    return withNameSuffix(formatted, suffix, language);
  });
}

/** `translate` in the current language. Inside components prefer `useLanguage().t`, which re-renders. */
export function t(key: StringKey, vars?: Vars): string {
  return translate(readLanguage(), key, vars);
}

// The explorer profile the Studio, Gallery and Companion read. Its `language` field is the
// child's setting; the family-wide preference covers the marketing page and parent space
// before an explorer is chosen.
const CHILD_KEY = 'ji-child';
const PREFERENCE_KEY = 'ji-language';
const listeners = new Set<() => void>();

function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined; // Storage access can throw in private or embedded contexts.
  }
}

function readProfile(store: Storage): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(store.getItem(CHILD_KEY) || 'null');
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

/** The current language: the chosen explorer's, else the family preference, else English. */
export function readLanguage(): Language {
  const store = storage();
  if (!store) return DEFAULT_LANGUAGE;
  const fromProfile = readProfile(store)?.language;
  if (isLanguage(fromProfile)) return fromProfile;
  const preference = store.getItem(PREFERENCE_KEY);
  return isLanguage(preference) ? preference : DEFAULT_LANGUAGE;
}

/**
 * Records the parent's choice locally and tells every `useLanguage()` about it. The caller also
 * saves it to the child profile through the api; this only keeps the browser in step.
 */
const LANGUAGE_RENDER_KEY = '__justImagineRenderLanguage';
export function currentLanguage(): Language {
  const value = (globalThis as Record<string, unknown>)[LANGUAGE_RENDER_KEY];
  return isLanguage(value) ? value : DEFAULT_LANGUAGE;
}
export function setRenderLanguage(language: Language): void {
  (globalThis as Record<string, unknown>)[LANGUAGE_RENDER_KEY] = language;
}

export function setLanguage(language: Language): void {
  if (!isLanguage(language)) throw new Error('Unsupported language');
  setRenderLanguage(language);
  setActiveStrings(TABLES[language]);
  const store = storage();
  if (store) {
    store.setItem(PREFERENCE_KEY, language);
    const profile = readProfile(store);
    if (profile) store.setItem(CHILD_KEY, JSON.stringify({ ...profile, language }));
  }
  for (const listener of listeners) listener();
}

/** Calls `listener` after `setLanguage` here, or after another tab changes the stored profile. */
export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CHILD_KEY || event.key === PREFERENCE_KEY) listener();
  };
  const browser = typeof window === 'undefined' ? undefined : window;
  browser?.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    browser?.removeEventListener('storage', onStorage);
  };
}

const serverLanguage = (): Language => DEFAULT_LANGUAGE;

/**
 * The current language for a component, re-rendering when it changes. Server rendering and
 * hydration use English; the stored choice applies right after hydration.
 */
export function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, readLanguage, serverLanguage);
  return {
    language,
    lang: langAttr(language),
    strings: TABLES[language],
    setLanguage,
    t: (key: StringKey, vars?: Vars) => translate(language, key, vars),
  };
}

/** Selecting a profile also updates already-mounted navigation in the same tab. */
export function selectLanguageProfile(
  profile: { id: string; language?: Language } & Record<string, unknown>,
): void {
  const store = storage();
  store?.setItem(CHILD_KEY, JSON.stringify(profile));
  setLanguage(profile.language === 'bn' ? 'bn' : 'en');
}
