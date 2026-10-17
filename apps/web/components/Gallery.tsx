'use client';
import { useLanguage } from '../lib/i18n';
import { copy as uiText, uiError } from '../lib/i18n/ui';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { conceptCard, type WorldListResponse, type ChildResponse } from '@just-imagine/protocol';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import { api } from '../lib/api';
import { getVoice } from '../lib/voice';
import { env } from '../lib/env';
import { s } from '../lib/strings/en';
export function Gallery() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const [worlds, setWorlds] = useState<WorldListResponse['worlds']>([]),
    [error, setError] = useState('');
  const router = useRouter();
  useEffect(() => {
    const child = JSON.parse(localStorage.getItem('ji-child') || 'null') as ChildResponse | null;
    if (!child) {
      router.replace('/play');
      return;
    }
    let active = true;
    queueMicrotask(() => {
      if (active) {
        setLoading(true);
        setError('');
        setWorlds([]);
      }
    });
    void api<WorldListResponse>('listWorlds', { childId: child.id })
      .then((result) => {
        if (active) setWorlds(result.worlds);
      })
      .catch((error) => {
        if (active) setError(uiError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router, language, retry]);
  function open(id: string) {
    const key = Object.entries(FIXTURE_WORLDS).find(([, doc]) => doc.worldId === id)?.[0];
    if (key) sessionStorage.setItem('ji-fixture', key);
    sessionStorage.setItem('ji-world', id);
    if (getVoice().session && !env.fake) getVoice().send({ type: 'openWorld', worldId: id });
    void getVoice()
      .unlockAudio()
      .then(() => router.push('/studio'))
      .catch((e) => setError(uiError(e)));
  }
  return (
    <main className="gallery">
      <div className="page-heading">
        <h1>{s.gallery}</h1>
        <Link className="button secondary" href="/play">
          {s.back}
        </Link>
      </div>
      {loading && <p role="status">{uiText('Opening your saved worlds in this language…')}</p>}
      {error && (
        <div role="alert">
          <p>{uiText(error)}</p>
          <button className="button secondary" onClick={() => setRetry((n) => n + 1)}>
            {uiText('Try again')}
          </button>
        </div>
      )}
      <div className="world-grid">
        {worlds.map((world, index) => (
          <button
            className={`world-tile world-${index % 4}`}
            key={world.id}
            onClick={() => open(world.id)}
          >
            <span className="world-shape" aria-hidden="true" />
            <span className="world-tile-copy">
              <strong>{uiText(world.title)}</strong>
              <span>{world.concepts.map((c) => conceptCard(c, language).title).join(' · ')}</span>
              <span>{s.open} ↗</span>
            </span>
          </button>
        ))}
      </div>
      {!loading && !error && !worlds.length && <p>{s.empty}</p>}
    </main>
  );
}
