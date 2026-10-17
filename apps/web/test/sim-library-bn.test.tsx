import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SimId } from '@just-imagine/stem-sims';

vi.mock('../lib/i18n/study', async () => {
  const { bn } = await import('../lib/i18n/study/bn');
  return {
    useSchoolLanguage: () => ({
      language: 'bn' as const,
      setLanguage: () => {},
      s: (key: keyof typeof bn) => bn[key],
      text: (value: { en: string; bn: string } | undefined) => value?.bn ?? '',
    }),
  };
});

const { SimView, SIM_DEFAULTS } = await import('../components/stem/SimView');
const { simName } = await import('../components/stem/sim-format');

/** Bangla words each sim must show, and English words that must not leak through. */
const BANGLA: Record<string, { show: string[]; hide: string[] }> = {
  projectile: { show: ['পাল্লা', 'সর্বোচ্চ উচ্চতা', 'উড্ডয়নকাল'], hide: ['Range', 'Flight time'] },
  'vector-addition': { show: ['লব্ধি', 'সামান্তরিক', 'একক'], hide: ['Resultant', 'Tip to tail'] },
  incline: {
    show: ['বলচিত্র', 'ওজন', 'অভিলম্ব', 'ঘর্ষণ', 'পিছলে নামে'],
    hide: ['Weight', 'Slides'],
  },
  pendulum: { show: ['গতিশক্তি', 'বিভবশক্তি', 'তাপশক্তি', 'দোলনকাল'], hide: ['Kinetic', 'Period'] },
  spring: { show: ['গতিশক্তি', 'স্থিতিস্থাপক', 'স্প্রিং ধ্রুবক'], hide: ['Kinetic', 'Elastic'] },
  collision: { show: ['সংঘর্ষের আগে', 'সংঘর্ষের পরে', 'মোট ভরবেগ'], hide: ['Before', 'After'] },
  orbit: { show: ['উপবৃত্তাকার কক্ষপথ', 'মুক্তিবেগ'], hide: ['Elliptical', 'Escape speed'] },
  'ph-indicator': {
    show: ['অম্লীয়', 'নিরপেক্ষ', 'ক্ষারীয়', 'ঘনমাত্রা'],
    hide: ['Acidic', 'Alkaline'],
  },
  titration: { show: ['সমতা বিন্দু', 'যোগ করা NaOH-এর আয়তন'], hide: ['End point'] },
  'flame-test': {
    show: ['তরঙ্গদৈর্ঘ্য', 'হলুদ-কমলা', '৫৮৯'],
    hide: ['Wavelength', 'yellow-orange'],
  },
  'reaction-rate': { show: ['উৎপাদ', 'অর্ধায়ু', 'প্রভাবক'], hide: ['Product (%)', 'Half-life'] },
  'gas-law': { show: ['চাপ', 'আয়তন', 'তাপমাত্রা'], hide: ['Pressure', 'Volume'] },
  'function-grapher': { show: ['শীর্ষবিন্দু', 'মূল', 'y-অক্ষছেদ'], hide: ['Vertex', 'Root'] },
  derivative: { show: ['স্পর্শক', 'ঢাল'], hide: ['Tangent', 'Slope'] },
  'riemann-area': {
    show: ['আনুমানিক', 'প্রকৃত', 'ত্রুটি', 'বর্গ একক'],
    hide: ['Estimate', 'Exact'],
  },
  probability: { show: ['আপেক্ষিক গণসংখ্যা', 'তাত্ত্বিক', 'পরীক্ষালব্ধ'], hide: ['Theoretical'] },
  'trig-waves': { show: ['বিস্তার', 'পর্যায়', 'θ (°)'], hide: ['Amplitude', 'Period'] },
};

describe('library sims in Bangla', () => {
  for (const [id, words] of Object.entries(BANGLA))
    it(`draws ${id} with Bangla labels and Bangla numerals`, () => {
      const html = renderToStaticMarkup(
        <SimView id={id as SimId} value={SIM_DEFAULTS[id as SimId]} onChange={() => {}} />,
      );
      expect(html).toContain(`aria-label="${simName(id as SimId, 'bn')}"`);
      for (const text of words.show) expect(html, `${id}: ${text}`).toContain(text);
      for (const text of words.hide) expect(html, `${id}: ${text}`).not.toContain(text);
      // Numbers drawn in the SVG use Bangla digits.
      const svgText = [...html.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(' ');
      expect(svgText).toMatch(/[০-৯]/u);
    });
});
