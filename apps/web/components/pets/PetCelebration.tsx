'use client';
import { useEffect, useRef } from 'react';
import { useLanguage } from '../../lib/i18n';
import { PetArt } from './PetArt';
import { petName } from './catalog';

/** A pet was just found: it greets the child and can become the child's buddy. */
export function PetCelebration({
  petId,
  onBuddy,
  onClose,
}: {
  petId: string;
  onBuddy: () => void;
  onClose: () => void;
}) {
  const { language, t } = useLanguage();
  const name = petName(petId, language);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  return (
    <div className="pet-found" role="dialog" aria-modal="true" aria-labelledby="pet-found-title">
      <div className="pet-found-card">
        <div className="pet-found-art">
          <PetArt id={petId} />
        </div>
        <h2 id="pet-found-title">{t('learnWorlds.petFound', { name })}</h2>
        <div className="learn-tiles">
          <button ref={first} type="button" className="dock-tile is-sunny" onClick={onBuddy}>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />
            </svg>
            <span>{t('learnWorlds.petBuddy', { name })}</span>
          </button>
          <button type="button" className="dock-tile" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            <span>{t('learnWorlds.keepPlaying')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
