'use client';
import '../../app/learn.css';
import { useState } from 'react';
import { useLanguage } from '../../lib/i18n';
import { getMixer } from '../../lib/sound';
import { PetArt } from './PetArt';
import { petName } from './catalog';
import { usePetBuddy } from './usePetBuddy';
import type { LearnState } from '../learn/progress';

/**
 * The buddy pet's place in a dock, after the friends. Pets do not speak; a tap makes it hop.
 * Renders nothing until the child has found a pet.
 */
export function PetSlot({ childId, state }: { childId?: string; state?: LearnState }) {
  const { language } = useLanguage();
  const buddy = usePetBuddy(childId, state);
  const [hops, setHops] = useState(0);
  if (!buddy) return null;
  const name = petName(buddy, language);
  return (
    <button
      type="button"
      className="friend pet-slot"
      aria-label={name}
      data-hop={hops % 2}
      onClick={() => {
        setHops((n) => n + 1);
        getMixer().playCue('boing', { gain: 0.6, rate: 1.3 });
      }}
    >
      <span className="art" key={hops}>
        <PetArt id={buddy} action={hops ? 'wave' : 'idle'} />
      </span>
      <span className="name">{name}</span>
    </button>
  );
}
