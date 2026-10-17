'use client';
import { useEffect, useRef } from 'react';
import { useLanguage } from '../../lib/i18n';
import { PetArt } from './PetArt';
import { petName } from './catalog';
import { UiIcon } from '../UiIcon';

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
            <UiIcon name="heart" />
            <span>{t('learnWorlds.petBuddy', { name })}</span>
          </button>
          <button type="button" className="dock-tile" onClick={onClose}>
            <UiIcon name="arrowRight" />
            <span>{t('learnWorlds.keepPlaying')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
