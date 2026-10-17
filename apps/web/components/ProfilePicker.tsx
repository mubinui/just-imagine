'use client';
import { useLanguage } from '../lib/i18n';
import { copy as uiText, uiError } from '../lib/i18n/ui';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MeResponse, ChildResponse } from '@just-imagine/protocol';
import { CompanionArt } from './companion/Companion';
import { selectLanguageProfile } from '../lib/i18n';
import { api } from '../lib/api';
import { getVoice, releaseVoice } from '../lib/voice';
import { s } from '../lib/strings/en';
import '../app/explorers.css';
export function Avatar({ kind = 'fox' }: { kind?: string }) {
  return (
    <span className={`avatar avatar-${kind}`} aria-hidden="true">
      <span className="ears" />
      <span className="face">
        <i />
        <i />
        <b />
      </span>
    </span>
  );
}
export function ProfilePicker() {
  useLanguage();
  const [data, setData] = useState<MeResponse>(),
    [error, setError] = useState('');
  const router = useRouter();
  useEffect(() => {
    api<MeResponse>('me')
      .then(setData)
      .catch((e) => setError(uiError(e)));
  }, []);
  function select(child: ChildResponse) {
    releaseVoice();
    const voice = getVoice();
    const unlocked = voice.unlockAudio();
    sessionStorage.removeItem('ji-world');
    selectLanguageProfile(child);
    void Promise.resolve(unlocked)
      .then(() => router.push('/studio'))
      .catch((e) => setError(uiError(e)));
  }
  return (
    <main className="picker">
      <h1>{s.who}</h1>
      <p className="lead">{s.pick}</p>
      {!data && !error && <p role="status">{s.load}</p>}
      <div className="profiles">
        {data?.children.map((child) => (
          <button className="profile" key={child.id} onClick={() => select(child)}>
            {child.companion ? (
              <CompanionArt companion={child.companion} />
            ) : (
              <Avatar kind={child.avatar} />
            )}
            <strong>{uiText(child.firstName)}</strong>
            <span>
              {s.agePrefix} {uiText(child.ageBand)}
            </span>
            <svg
              className="profile-arrow"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <path d="M4 12h15m-6-6 6 6-6 6" />
            </svg>
          </button>
        ))}
      </div>
      {error && <p role="alert">{uiText(error)}</p>}
      {data?.children.length === 0 && <p>{s.empty}</p>}
      <Link href="/parent/children" className="text-link">
        {s.add} ↗
      </Link>
      <Link href="/gallery" className="button secondary">
        {s.gallery}
      </Link>
    </main>
  );
}
