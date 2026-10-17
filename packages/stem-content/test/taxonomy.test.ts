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
    expect(chapterById('physics-2')?.sims).toEqual([
      'motion-graphs',
      'projectile',
      'vector-addition',
    ]);
    expect(chapterById('physics-3')?.sims).toEqual([
      'newton-cart',
      'vector-addition',
      'incline',
      'collision',
      'orbit',
    ]);
    expect(chapterById('physics-11')?.sims).toEqual(['ohms-circuit']);
    expect(chapterById('chemistry-7')?.lab).toBe(true);
    expect(chapterById('chemistry-9')?.lab).toBe(true);
    expect(chapterById('nope')).toBeUndefined();
  });

  it('offers each library preset in the chapters that teach it', () => {
    const where = (id: string) =>
      CHAPTERS.filter((c) => c.sims.includes(id as never)).map((c) => c.id);
    expect(where('pendulum')).toEqual(['physics-4', 'physics-7']);
    expect(where('spring')).toEqual(['physics-4', 'physics-7']);
    expect(where('gas-law')).toEqual(['physics-5', 'chemistry-2']);
    expect(where('flame-test')).toEqual(['chemistry-3', 'chemistry-10']);
    expect(where('reaction-rate')).toEqual(['chemistry-7']);
    expect(where('titration')).toEqual(['chemistry-6', 'chemistry-9']);
    expect(where('ph-indicator')).toEqual(['chemistry-9']);
    expect(where('function-grapher')).toEqual([
      'math-gm-2',
      'math-gm-4',
      'math-hm-1',
      'math-hm-9',
      'math-hm-11',
    ]);
    expect(where('trig-waves')).toEqual(['math-gm-9', 'math-hm-8']);
    expect(where('derivative')).toEqual(['math-hm-11']);
    expect(where('riemann-area')).toEqual(['math-gm-16', 'math-hm-11']);
    expect(where('vector-addition')).toEqual(['physics-2', 'physics-3', 'math-hm-12']);
    expect(where('probability')).toEqual(['math-hm-14']);
  });
});
