import { describe, expect, it } from 'vitest';
import { ADVENTURES, PACKS, storyChapter } from '../src';
describe('authored story coverage', () => {
  it('gives all nine packs and every character a bilingual playable chapter', () => {
    expect(Object.keys(ADVENTURES).sort()).toEqual(Object.keys(PACKS).sort());
    let total = 0;
    for (const [packId, story] of Object.entries(ADVENTURES)) {
      const pack = PACKS[packId]!;
      expect(story.chapters.map((c) => c.characterId).sort()).toEqual(
        pack.characters.map((c) => c.id).sort(),
      );
      expect(new Set(story.chapters.map((c) => c.id)).size).toBe(story.chapters.length);
      for (const line of [
        story.title,
        story.opening,
        story.ending,
        ...story.chapters.flatMap((c) => [c.title, c.setup, c.goal, c.ending]),
      ]) {
        expect(line[0].length).toBeGreaterThan(8);
        expect(line[1]).toMatch(/[ঀ-৿]/);
      }
      for (const chapter of story.chapters) {
        const c = pack.characters.find((c) => c.id === chapter.characterId)!;
        expect(c.facts[chapter.fact]).toBeTruthy();
        expect(c.factsBn[chapter.fact]).toBeTruthy();
      }
      total += story.chapters.length;
    }
    expect(total).toBe(40);
  });
  it('contains only public game text, never reward or private quiz fields', () => {
    expect(JSON.stringify(ADVENTURES)).not.toMatch(/"(answerKey|accepted|hint|points|petReward)"/);
    expect(storyChapter('__proto__', 'constructor')).toBeUndefined();
    expect(storyChapter('space', 'heart')).toBeUndefined();
  });
});
