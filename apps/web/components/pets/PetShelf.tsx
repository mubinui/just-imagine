'use client';
import { copy as uiText } from '../../lib/i18n/ui';
import { useEffect, useRef } from 'react';
import { useLanguage } from '../../lib/i18n';
import { PetArt } from './PetArt';
import { PET_CATALOG } from './catalog';

/** "My pets": every pet, found ones to choose as a buddy, the rest as silhouettes with their goal. */
export function PetShelf({
  pets,
  buddy,
  onChoose,
  onClose,
}: {
  pets: string[];
  buddy?: string;
  onChoose: (petId: string) => void;
  onClose: () => void;
}) {
  const { language, t } = useLanguage();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="pet-shelf-wrap" role="presentation" onClick={onClose}>
      <section
        className="pet-shelf"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pet-shelf-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="pet-shelf-title" tabIndex={-1} ref={heading}>
            {t('learnWorlds.myPets')}
          </h2>
          <p>{t('learnWorlds.shelfHint')}</p>
        </header>
        <ul>
          {PET_CATALOG.map((pet) => {
            const found = pets.includes(pet.id);
            const name = language === 'bn' ? pet.nameBn : pet.name;
            return (
              <li key={pet.id}>
                {found ? (
                  <button
                    type="button"
                    className="pet-card"
                    aria-pressed={buddy === pet.id}
                    onClick={() => onChoose(pet.id)}
                  >
                    <PetArt id={pet.id} />
                    <strong>{uiText(name)}</strong>
                    {buddy === pet.id && <small>{t('learnWorlds.buddy')}</small>}
                  </button>
                ) : (
                  <div className="pet-card is-locked">
                    <PetArt id={pet.id} locked />
                    <strong>?</strong>
                    <small>{t('learnWorlds.petLocked', { points: pet.unlockPoints })}</small>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="learn-tiles">
          <button type="button" className="dock-tile" onClick={onClose}>
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
            <span>{t('learnWorlds.close')}</span>
          </button>
        </div>
      </section>
    </div>
  );
}
