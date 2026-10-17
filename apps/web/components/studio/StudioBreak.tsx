'use client';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import type { CharacterId, Companion } from '@just-imagine/protocol';
import { useLanguage } from '../../lib/i18n';
import { CharacterArt } from './CharacterArt';
import { CompanionArt } from '../companion/Companion';
import { UiIcon } from '../UiIcon';
import styles from './StudioBreak.module.css';

const COPY = {
  en: {
    body: 'Stand up, stretch and give your imagination a little rest. Choose what comes next when you’re ready.',
    status: 'Call ended · Microphone off',
    statusActive: 'Live assistant is on',
    back: 'Back to Studio',
    choices: 'Other adventures',
    learn: 'Learn',
    stories: 'Stories',
    worlds: 'My worlds',
    explorers: 'Choose another explorer',
  },
  bn: {
    body: 'একটু উঠে দাঁড়াও, হাত-পা ছড়াও, কল্পনাকেও বিশ্রাম দাও। তৈরি হলে এরপর কী করবে বেছে নাও।',
    status: 'কথা বলা শেষ · মাইক্রোফোন বন্ধ',
    statusActive: 'লাইভ সহকারী চালু আছে',
    back: 'স্টুডিওতে ফিরি',
    choices: 'অন্য অ্যাডভেঞ্চার',
    learn: 'শিখি',
    stories: 'গল্প',
    worlds: 'আমার জগৎ',
    explorers: 'অন্য একজন অভিযাত্রী বেছে নাও',
  },
} as const;

/** A quiet finish, with no connection side effects; returning requires a separate voice tap. */
export function StudioBreak({
  title,
  character,
  companion,
  voiceActive,
  onReturn,
  onLeave,
}: {
  title: string;
  character: CharacterId;
  companion?: Companion;
  voiceActive: boolean;
  onReturn: () => void;
  onLeave: () => void;
}) {
  const { language } = useLanguage();
  const copy = COPY[language];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus({ preventScroll: true }), []);
  return (
    <main className={styles.page} aria-labelledby="studio-break-title">
      <div className={styles.portrait} aria-hidden="true">
        {companion ? (
          <CompanionArt companion={companion} speaking={false} />
        ) : (
          <CharacterArt id={character} action="still" />
        )}
      </div>
      <div className={styles.content}>
        <h1 id="studio-break-title" ref={heading} tabIndex={-1}>
          {title}
        </h1>
        <p className={styles.copy}>{copy.body}</p>
        <p className={styles.status} role="status">
          <UiIcon name={voiceActive ? 'mic' : 'micOff'} />
          {voiceActive ? copy.statusActive : copy.status}
        </p>
        <button className={styles.return} type="button" onClick={onReturn}>
          <UiIcon name="back" />
          {copy.back}
        </button>
        <nav className={styles.destinations} aria-label={copy.choices}>
          <Link href="/learn" onClick={onLeave}>
            <UiIcon name="book" />
            {copy.learn}
          </Link>
          <Link href="/stories" onClick={onLeave}>
            <UiIcon name="chat" />
            {copy.stories}
          </Link>
          <Link href="/gallery" onClick={onLeave}>
            <UiIcon name="gallery" />
            {copy.worlds}
          </Link>
        </nav>
        <Link className={styles.explorers} href="/play" onClick={onLeave}>
          {copy.explorers}
        </Link>
      </div>
    </main>
  );
}
