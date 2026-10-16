'use client';
import { useEffect } from 'react';
import { useLanguage, strings } from '../lib/i18n';
import { setActiveStrings } from '../lib/strings/en';

/**
 * Applies the chosen explorer's language to everything inside it. The server and the first client
 * render use English; after hydration the stored language takes over and the subtree remounts once
 * under its own key so every component reads the new table.
 */
export function LanguageRoot({ children }: { children: React.ReactNode }) {
  const { language, lang } = useLanguage();
  // Set during render so the subtree below reads the right table on this very render.
  setActiveStrings(strings(language));
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  // Only leaving the child screens restores English (the parent area stays English).
  useEffect(
    () => () => {
      setActiveStrings(strings('en'));
      document.documentElement.lang = 'en';
    },
    [],
  );
  return <div key={language}>{children}</div>;
}
