import { describe, expect, it } from 'vitest';
import { PETS } from '../src/pets';
import { PET_IDS, PetSchema } from '../src/schema';

describe('PETS', () => {
  it('has exactly eight pets that all pass PetSchema', () => {
    expect(PETS).toHaveLength(8);
    for (const pet of PETS) expect(PetSchema.safeParse(pet).success).toBe(true);
  });

  it('covers every pet id exactly once, in order', () => {
    expect(PETS.map((p) => p.id)).toEqual([...PET_IDS]);
  });

  it('has strictly increasing unlock thresholds', () => {
    for (let i = 1; i < PETS.length; i++) {
      expect(PETS[i]!.unlockPoints).toBeGreaterThan(PETS[i - 1]!.unlockPoints);
    }
  });

  it('names every pet in Bangla script', () => {
    for (const pet of PETS) expect(/[ঀ-৿]/.test(pet.nameBn)).toBe(true);
  });
});
