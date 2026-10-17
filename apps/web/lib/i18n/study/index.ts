'use client';
import { useCallback, useSyncExternalStore } from 'react';
import { en, type SchoolString } from './en';
import { bn } from './bn';
const listeners = new Set<() => void>();
const KEY = 'ji-school-language';
export function schoolLanguage(): 'en' | 'bn' {
  try {
    return localStorage.getItem(KEY) === 'bn' ? 'bn' : 'en';
  } catch {
    return 'en';
  }
}
export function setSchoolLanguage(language: 'en' | 'bn') {
  try {
    localStorage.setItem(KEY, language);
  } catch {
    /* preference optional */
  }
  listeners.forEach((l) => l());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}
export function useSchoolLanguage() {
  const language = useSyncExternalStore(subscribe, schoolLanguage, (): 'en' | 'bn' => 'en');
  const s = useCallback((key: SchoolString) => (language === 'bn' ? bn : en)[key], [language]);
  const text = useCallback(
    (value: { en: string; bn: string } | undefined) => value?.[language] ?? '',
    [language],
  );
  return { language, setLanguage: setSchoolLanguage, s, text };
}
