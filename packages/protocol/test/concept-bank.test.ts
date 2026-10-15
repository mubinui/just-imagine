import { describe, it, expect } from 'vitest';
import { CONCEPTS } from '@just-imagine/scene-schema';
import { CONCEPT_BANK, conceptCard } from '../src/concept-bank';

describe('CONCEPT_BANK', () => {
  it('has a card for every concept with short, non-empty copy', () => {
    for (const c of CONCEPTS) {
      const card = CONCEPT_BANK[c];
      expect(card, c).toBeDefined();
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.title.length).toBeLessThanOrEqual(30);
      expect(card.realLifeNote.length).toBeGreaterThan(20);
      expect(card.realLifeNote.length).toBeLessThanOrEqual(160);
      expect(card.kidHint.length).toBeLessThanOrEqual(120);
    }
  });
  it('returns only the fields the card shows', () => {
    expect(conceptCard('bounce')).toEqual({
      title: CONCEPT_BANK.bounce.title,
      realLifeNote: CONCEPT_BANK.bounce.realLifeNote,
    });
  });
});
