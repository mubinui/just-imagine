import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { english } from '../lib/strings/en';
import { en } from '../lib/i18n/en';
import { bn } from '../lib/i18n/bn';
import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  formatMinutes,
  formatNumber,
  langAttr,
  readLanguage,
  setLanguage,
  subscribeLanguage,
  t,
  translate,
  useLanguage,
  selectLanguageProfile,
  currentLanguage,
  setRenderLanguage,
} from '../lib/i18n';

type Table = { [key: string]: string | Table };
const BENGALI = /[ঀ-৿]/;

function leaves(table: Table, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(table)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') out.set(path, value);
    else for (const [k, v] of leaves(value, path)) out.set(k, v);
  }
  return out;
}
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const enLeaves = leaves(en as unknown as Table);
const bnLeaves = leaves(bn as unknown as Table);

describe('string tables', () => {
  it('keeps lib/strings/en.ts as the single source of English', () => {
    expect(en).toBe(english);
  });
  it('has the same deep key set in en and bn', () => {
    expect([...bnLeaves.keys()].sort()).toEqual([...enLeaves.keys()].sort());
  });
  it('keeps every {placeholder} in both languages', () => {
    for (const [key, text] of enLeaves) {
      expect(placeholders(bnLeaves.get(key) ?? ''), key).toEqual(placeholders(text));
    }
  });
  it('leaves no key untranslated', () => {
    for (const [key, text] of bnLeaves) {
      expect(text, key).toMatch(BENGALI);
      expect(text, key).not.toBe(enLeaves.get(key));
    }
  });
  it('keeps character names, only rendered in Bangla script', () => {
    expect(bn.mascot).toBe('ভোম্বল');
  });
});

describe('translate and t', () => {
  it('interpolates {name}-style variables', () => {
    expect(translate('en', 'ask', { name: 'Mishti' })).toBe('Ask Mishti');
    const bangla = translate('bn', 'ask', { name: 'মিষ্টি' });
    expect(bangla).toBe('মিষ্টিকে জিজ্ঞেস করো');
    expect(bangla).not.toContain('{');
  });
  it('resolves nested keys with dots', () => {
    expect(translate('en', 'statusLabels.connected')).toBe('Listening');
    expect(translate('bn', 'dialOptions.gravity.moon')).toBe(bn.dialOptions.gravity.moon);
  });
  it('writes numeric variables in the language of the text', () => {
    expect(translate('en', 'quotaFriendly', { minutes: 12 })).toContain('12');
    expect(translate('bn', 'quotaFriendly', { minutes: 12 })).toContain('১২');
  });
  it('leaves a missing variable visible instead of throwing', () => {
    expect(translate('en', 'ask', {})).toBe('Ask {name}');
    expect(translate('en', 'ask')).toBe('Ask {name}');
  });
});

describe('numbers and attributes', () => {
  it('writes Bengali numerals for bn and Latin digits for en', () => {
    expect(formatNumber(2026, 'bn')).toBe('২০২৬');
    expect(formatNumber(-3.5, 'bn')).toBe('-৩.৫');
    expect(formatNumber(42, 'en')).toBe('42');
  });
  it('formats whole minutes with a unit in each language', () => {
    expect(formatMinutes(12.4, 'en')).toBe('12 min');
    expect(formatMinutes(12.4, 'bn')).toBe('১২ মিনিট');
    expect(formatMinutes(-1, 'en')).toBe('0 min');
  });
  it('exposes the html lang value and the language list', () => {
    expect(langAttr('en')).toBe('en');
    expect(langAttr('bn')).toBe('bn-BD');
    expect(LANGUAGES).toEqual(['en', 'bn']);
    expect(DEFAULT_LANGUAGE).toBe('en');
  });
});

describe('current language from the child profile', () => {
  const store = new Map<string, string>();
  const profile = { id: 'c_1', firstName: 'Ari', avatar: 'fox', ageBand: '8-10' };
  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      },
    });
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
    setRenderLanguage('en');
  });
  it('falls back to English without a profile, with a malformed profile, or with an unknown value', () => {
    expect(readLanguage()).toBe('en');
    store.set('ji-child', '{not json');
    expect(readLanguage()).toBe('en');
    store.set('ji-child', JSON.stringify({ ...profile, language: 'fr' }));
    expect(readLanguage()).toBe('en');
    delete (globalThis as { localStorage?: unknown }).localStorage;
    expect(readLanguage()).toBe('en');
  });
  it('reads the language of the explorer the Studio reads', () => {
    store.set('ji-child', JSON.stringify({ ...profile, language: 'bn' }));
    expect(readLanguage()).toBe('bn');
  });
  it('uses the family preference when the profile has no language', () => {
    store.set('ji-language', 'bn');
    expect(readLanguage()).toBe('bn');
    store.set('ji-child', JSON.stringify(profile));
    expect(readLanguage()).toBe('bn');
    store.set('ji-child', JSON.stringify({ ...profile, language: 'en' }));
    expect(readLanguage()).toBe('en');
  });
  it('setLanguage updates the stored profile, the preference and subscribers', () => {
    store.set('ji-child', JSON.stringify(profile));
    let notified = 0;
    const unsubscribe = subscribeLanguage(() => notified++);
    setLanguage('bn');
    expect(JSON.parse(store.get('ji-child')!)).toEqual({ ...profile, language: 'bn' });
    expect(store.get('ji-language')).toBe('bn');
    expect(readLanguage()).toBe('bn');
    expect(notified).toBe(1);
    unsubscribe();
    setLanguage('en');
    expect(notified).toBe(1);
    expect(readLanguage()).toBe('en');
  });
  it('notifies mounted screens when another profile is chosen in the same tab', () => {
    let notified = 0;
    const unsubscribe = subscribeLanguage(() => notified++);
    selectLanguageProfile({ ...profile, language: 'bn' });
    expect(readLanguage()).toBe('bn');
    expect(currentLanguage()).toBe('bn');
    expect(notified).toBe(1);
    selectLanguageProfile({ ...profile, id: 'c_2', language: 'en' });
    expect(readLanguage()).toBe('en');
    expect(notified).toBe(2);
    unsubscribe();
  });
  it('rejects unsupported language changes without altering the saved choice', () => {
    setLanguage('bn');
    expect(() => setLanguage('hi' as 'en')).toThrow('Unsupported language');
    expect(readLanguage()).toBe('bn');
  });
  it('t() follows the current language', () => {
    expect(t('stop')).toBe(en.stop);
    setLanguage('bn');
    expect(t('stop')).toBe(bn.stop);
    expect(t('ask', { name: 'Pori Apu' })).toBe('পরী আপুকে জিজ্ঞেস করো');
  });
  it('useLanguage renders the default language on the server even when storage says bn', () => {
    store.set('ji-child', JSON.stringify({ ...profile, language: 'bn' }));
    function Probe() {
      const { language, t: tt } = useLanguage();
      return createElement('span', { lang: langAttr(language) }, tt('stop'));
    }
    expect(renderToString(createElement(Probe))).toBe('<span lang="en">Stop</span>');
  });
});
