'use client';
/* eslint-disable @next/next/no-img-element -- Published owned artwork uses its explicit source URL. */
import '../../app/catalog.css';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../lib/i18n';
import type { PublicPack } from './types';

export function packPortrait(pack: PublicPack, characterId: string) {
  const entityId = pack.hotspots.find((hotspot) => hotspot.characterId === characterId)?.entityId;
  return pack.scene.entities.find((entity) => entity.id === entityId)?.asset?.url;
}

/** Published packs use their authored physics scene, without inventing built-in chapters. */
export function CatalogAdventure({
  pack,
  onMeet,
}: {
  pack: PublicPack;
  onMeet: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    meet = useRef(onMeet);
  const { language } = useLanguage(),
    bn = language === 'bn';
  const [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    meet.current = onMeet;
  }, [onMeet]);
  useEffect(() => {
    let active = true,
      dispose: (() => void) | undefined;
    const target = host.current;
    if (!target) return;
    void import('@just-imagine/engine')
      .then(async ({ mountEngine }) => {
        if (!active) return;
        const engine = await mountEngine(target, pack.scene, (event) => {
          if (event.type !== 'tap') return;
          const hotspot = pack.hotspots.find((item) => item.entityId === event.target);
          if (hotspot) meet.current(hotspot.characterId);
        });
        if (!active) engine.dispose();
        else {
          dispose = () => engine.dispose();
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      dispose?.();
    };
  }, [pack, retry]);
  return (
    <div className="catalog-adventure">
      <div className="catalog-scene" ref={host} aria-label={bn ? pack.titleBn : pack.title} />
      {error && (
        <p role="alert">
          {bn ? 'জগৎ খোলা যায়নি।' : 'This world could not open.'}{' '}
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            {bn ? 'আবার চেষ্টা' : 'Retry'}
          </button>
        </p>
      )}
      <p>
        {bn
          ? 'জগতে ছুঁয়ে খেলো। বন্ধুকে বেছে তার গল্প শোনো বা প্রশ্ন করো।'
          : 'Touch the world to play. Choose a friend to hear their story or ask a question.'}
      </p>
      <nav className="learning-cast" aria-label={bn ? 'বন্ধু বেছে নাও' : 'Choose a character'}>
        {pack.characters.map((character) => (
          <button type="button" key={character.id} onClick={() => onMeet(character.id)}>
            {packPortrait(pack, character.id) && (
              <img src={packPortrait(pack, character.id)} alt="" />
            )}
            <span>{bn ? character.nameBn : character.name}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
