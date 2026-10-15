import { describe, it, expect } from 'vitest';
import { CHARACTERS, CharacterIdSchema, guidesFor } from '../src/characters';
import { defaultTierFor } from '../src/bands';

describe('characters', () => {
  it('has a config for every id with a non-empty voice', () => {
    for (const id of CharacterIdSchema.options)
      expect(CHARACTERS[id].voice.length).toBeGreaterThan(0);
  });
  it('offers Math Man only from 8-10 up and the other guides to everyone', () => {
    expect(guidesFor('6-7').map((c) => c.id)).toEqual(['pori', 'jadukaka']);
    expect(guidesFor('8-10').map((c) => c.id)).toEqual(['pori', 'onkomama', 'jadukaka']);
    expect(guidesFor('11-13').map((c) => c.id)).toEqual(['pori', 'onkomama', 'jadukaka']);
  });
  it('defaults 11-13 to the lab tier and younger bands to playground', () => {
    expect(defaultTierFor('11-13')).toBe('lab');
    expect(defaultTierFor('8-10')).toBe('playground');
  });
});
