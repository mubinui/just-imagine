'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type WorldListResponse, type ChildResponse } from '@just-imagine/protocol';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import { api } from '../lib/api';
import { getVoice } from '../lib/voice';
import { env } from '../lib/env';
import { s } from '../lib/strings/en';
export function Gallery() {
  const [worlds, setWorlds] = useState<WorldListResponse['worlds']>([]),
    [error, setError] = useState('');
  const router = useRouter();
  useEffect(() => {
    const child = JSON.parse(localStorage.getItem('ji-child') || 'null') as ChildResponse | null;
    if (!child) {
      router.replace('/play');
      return;
    }
    api<WorldListResponse>('listWorlds', { childId: child.id })
      .then((r) => setWorlds(r.worlds))
      .catch((e) => setError(e.message));
  }, [router]);
  function open(id: string) {
    const key = Object.entries(FIXTURE_WORLDS).find(([, doc]) => doc.worldId === id)?.[0];
    if (key) sessionStorage.setItem('ji-fixture', key);
    sessionStorage.setItem('ji-world', id);
    if (getVoice().session && !env.fake) getVoice().send({ type: 'openWorld', worldId: id });
    void getVoice()
      .unlockAudio()
      .then(() => router.push('/studio'))
      .catch((e) => setError(e.message));
  }
  return (
    <main className="gallery">
      <div className="page-heading">
        <h1>{s.gallery}</h1>
        <Link className="button secondary" href="/play">
          {s.back}
        </Link>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="world-grid">
        {worlds.map((world, index) => (
          <button
            className={`world-tile world-${index % 4}`}
            key={world.id}
            onClick={() => open(world.id)}
          >
            <span className="world-shape" aria-hidden="true" />
            <span className="world-tile-copy">
              <strong>{world.title}</strong>
              <span>{world.concepts.join(' · ')}</span>
              <span>{s.open} ↗</span>
            </span>
          </button>
        ))}
      </div>
      {!worlds.length && <p>{s.empty}</p>}
    </main>
  );
}
