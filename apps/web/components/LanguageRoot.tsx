'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useLanguage, strings, setRenderLanguage } from '../lib/i18n';
import { setActiveStrings } from '../lib/strings/en';
import { useSchoolLanguage } from '../lib/i18n/study';

/**
 * Applies the chosen explorer's language to everything inside it. The server and the first client
 * render use English; after hydration the stored language takes over and subscribed components update without disposing an unlocked audio context.
 */
export function LanguageRoot({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const familyLanguage = useLanguage();
  const schoolLanguage = useSchoolLanguage();
  const isSchool = pathname.startsWith('/school') || pathname.startsWith('/study');
  const language = isSchool ? schoolLanguage.language : familyLanguage.language;
  const lang = language === 'bn' ? 'bn-BD' : 'en';
  // Set during render so the subtree below reads the right table on this very render.
  setActiveStrings(strings(language));
  setRenderLanguage(language);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  useEffect(() => {
    const title = isSchool
      ? language === 'bn'
        ? 'বিদ্যালয় · জাস্ট ইমাজিন'
        : 'Schools · Just Imagine'
      : pathname.startsWith('/admin')
        ? language === 'bn'
          ? 'পরিচালনা প্যানেল · জাস্ট ইমাজিন'
          : 'Operator console · Just Imagine'
        : language === 'bn'
          ? 'জাস্ট ইমাজিন — ছোট্ট বিস্ময়, বড় আবিষ্কার'
          : 'Just Imagine — little wonders, big discoveries';
    // Next installs route metadata after navigation; keep explicit browser metadata in step too.
    const syncMetadata = () => {
      if (document.title !== title) document.title = title;
      const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      const content =
        language === 'bn'
          ? 'পরিবারের সঙ্গে কল্পনা, খেলা আর নতুন কিছু শেখার জায়গা।'
          : 'A playful family space for imagination and discovery.';
      if (description && description.content !== content) description.content = content;
      const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
      if (manifest) {
        const url = new URL(manifest.href);
        if (url.searchParams.get('lang') !== language) {
          url.searchParams.set('lang', language);
          manifest.href = url.href;
        }
      }
    };
    syncMetadata();
    const observer = new MutationObserver(syncMetadata);
    observer.observe(document.head, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['href'],
    });
    return () => observer.disconnect();
  }, [language, pathname, isSchool]);
  return <div lang={lang}>{children}</div>;
}
