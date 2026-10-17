import { describe, it, expect } from 'vitest';
import { SIM_IDS } from '@just-imagine/stem-sims';
import { CHAPTERS, chapterById, chaptersFor, ChapterSchema } from '../src/taxonomy';

const BENGALI = /[ঀ-৿]/;

describe('NCTB class 9-10 taxonomy', () => {
  it('has the full SSC chapter lists', () => {
    expect(chaptersFor('physics')).toHaveLength(13);
    expect(chaptersFor('chemistry')).toHaveLength(12);
    expect(CHAPTERS.filter((c) => c.book === 'general-math')).toHaveLength(17);
    expect(CHAPTERS.filter((c) => c.book === 'higher-math')).toHaveLength(14);
  });
  it('uses the chapter order in the official 2026 Physics editions', () => {
    expect(chapterById('physics-13')?.title).toEqual({
      en: 'Radioactivity and electronics',
      bn: 'তেজস্ক্রিয়তা ও ইলেকট্রনিক্স',
    });
    expect(chapterById('physics-14')).toBeUndefined();
  });

  it('has unique ids, valid entries and real Bangla titles', () => {
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length);
    for (const chapter of CHAPTERS) {
      expect(ChapterSchema.parse(chapter)).toEqual(chapter);
      expect(chapter.title.bn).toMatch(BENGALI);
    }
  });

  it('places every demo sim and the lab in their chapters', () => {
    const placed = new Set(CHAPTERS.flatMap((c) => c.sims));
    for (const id of SIM_IDS) expect(placed.has(id)).toBe(true);
    expect(chapterById('physics-2')?.sims).toEqual(['motion-graphs']);
    expect(chapterById('physics-3')?.sims).toEqual(['newton-cart']);
    expect(chapterById('physics-11')?.sims).toEqual(['ohms-circuit']);
    expect(chapterById('chemistry-7')?.lab).toBe(true);
    expect(chapterById('chemistry-9')?.lab).toBe(true);
    expect(chapterById('nope')).toBeUndefined();
  });
});
