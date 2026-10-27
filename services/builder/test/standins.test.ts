import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { FRIEND_STANDINS, STANDINS, standInFor, type StandIn } from '../src/standins';

const publicDir = fileURLToPath(new URL('../../../apps/web/public', import.meta.url));
const all: StandIn[] = [...STANDINS, ...Object.values(FRIEND_STANDINS)];

describe('painted stand-in library', () => {
  it.each(all.map((s) => [s.key, s] as const))(
    '%s is a transparent WebP of the recorded size',
    async (_key, standIn) => {
      expect(standIn.url).toMatch(/^\/standins\/[a-z-]+\.webp$/);
      const file = publicDir + standIn.url;
      expect(existsSync(file)).toBe(true);
      const meta = await sharp(file).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.hasAlpha).toBe(true);
      expect(meta.width).toBe(standIn.width);
      expect(meta.height).toBe(standIn.height);
      expect(Math.max(standIn.width, standIn.height)).toBeLessThanOrEqual(512);
    },
  );

  it('has the generic crate default', () => {
    expect(STANDINS.find((s) => s.key === 'crate')?.words).toContain('box');
  });

  it("gives every friend that friend's own frame", () => {
    for (const id of ['mishti', 'bhombol', 'chandni'] as const) {
      expect(FRIEND_STANDINS[id].key).toBe(`friend-${id}`);
      expect(FRIEND_STANDINS[id].url).toBe(`/standins/friend-${id}.webp`);
    }
  });

  it('keeps match words lowercase and unique across entries', () => {
    const words = all.flatMap((s) => s.words);
    for (const word of words) expect(word).toBe(word.toLowerCase());
    expect(new Set(words).size).toBe(words.length);
    expect(new Set(all.map((s) => s.key)).size).toBe(all.length);
  });
});

describe('standInFor', () => {
  const e = (name: string, tags: string[] = [], description = '') => ({ name, tags, description });

  it('matches whole lowercase words in name, tags and description', () => {
    expect(standInFor(e('Red Racer', [], 'a speedy car')).key).toBe('car');
    expect(standInFor(e('Wally', ['whale'])).key).toBe('fish');
    expect(standInFor(e('Scarf', [], 'a warm scarf')).key).toBe('crate');
  });

  it('prefers the entry with the most matching words, ties to the earlier entry', () => {
    expect(standInFor(e('x', [], 'a robot dog dog puppy')).key).toBe('dog');
    expect(standInFor(e('x', [], 'a cat and a dog')).key).toBe('dog');
  });

  it('matches multi-word phrases only when every word is present', () => {
    expect(standInFor(e('x', [], 'a ship in space')).key).toBe('rocket');
    expect(standInFor(e('x', [], 'a ship at sea')).key).toBe('boat');
  });

  it('falls back to the crate for words that match nothing', () => {
    expect(standInFor(e('Zorp', ['blob'], 'a wobbly thing')).key).toBe('crate');
  });

  it("gives the friend its own companion's frame, never another's", () => {
    for (const id of ['mishti', 'bhombol', 'chandni'] as const)
      expect(standInFor(e('Pal', ['friend', id], 'a car dog'), 'mishti')).toBe(FRIEND_STANDINS[id]);
    expect(standInFor(e('Pal', ['friend'], 'x'), 'chandni')).toBe(FRIEND_STANDINS.chandni);
  });
});
