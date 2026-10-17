import { describe, expect, it } from 'vitest';
import { SIM_IDS, SIMS, type SimModel } from '@just-imagine/stem-sims';
import { SIM_DEFAULTS } from '../components/stem/SimView';
import { forceVectorLengths, readingLabel, readingState } from '../lib/school/readings';

describe('readings from the shipped simulation models', () => {
  for (const id of SIM_IDS) {
    it(`labels every ${id} reading in both languages`, () => {
      const model = SIMS[id] as SimModel<unknown>;
      const values = model.at(model.params.parse(SIM_DEFAULTS[id]), 0);
      for (const key of Object.keys(values))
        for (const language of ['en', 'bn'] as const) {
          const display = readingLabel(id, key, language);
          expect(display, `${id}.${key} (${language})`).not.toBeNull();
          expect(display!.label).not.toBe(key);
          if (language === 'bn') expect(display!.label).toMatch(/[\u0980-\u09ff]/u);
        }
    });
  }
  it('uses actual scientific units and interprets categorical model outputs', () => {
    expect(readingLabel('newton-cart', 'a', 'en')?.unit).toBe('m/s²');
    expect(readingLabel('newton-cart', 'friction', 'bn')?.unit).toBe('N');
    expect(readingLabel('ohms-circuit', 'req', 'en')?.unit).toBe('Ω');
    expect(readingLabel('ohms-circuit', 'p0', 'bn')?.unit).toBe('W');
    expect(readingState('newton-cart', 'moving', false, 'en')).toBe('At rest');
    expect(readingState('newton-cart', 'moving', true, 'bn')).toBe('চলছে');
    expect(readingState('unit-circle', 'quadrant', 0, 'en')).toBe('On an axis');
    expect(readingState('unit-circle', 'tan', null, 'bn')).toBe('সংজ্ঞায়িত নয়');
  });
  it('keeps the actual 5N resting case visible and preserves force ratios without leaving the viewBox', () => {
    const resting = forceVectorLengths(5, 5);
    expect(resting.applied).toBeGreaterThan(44);
    expect(resting.applied).toBe(resting.friction);
    const moving = forceVectorLengths(60, 12);
    expect(moving.applied).toBeLessThanOrEqual(170);
    expect(moving.friction / moving.applied).toBeCloseTo(12 / 60);
    expect(forceVectorLengths(0, 0)).toEqual({ applied: 0, friction: 0 });
  });
});
