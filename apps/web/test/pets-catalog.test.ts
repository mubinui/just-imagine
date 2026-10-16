import { it, expect } from 'vitest';
import { PETS } from '@just-imagine/learning-content';
import { PET_CATALOG } from '../components/pets/catalog';
import { PET_ORDER } from '../components/pets/PetArt';

it('matches the authored pets: ids, names in both languages and thresholds', () => {
  expect(PET_CATALOG).toEqual(
    PETS.map(({ id, name, nameBn, unlockPoints }) => ({ id, name, nameBn, unlockPoints })),
  );
  expect([...PET_ORDER]).toEqual(PETS.map((p) => p.id));
});
