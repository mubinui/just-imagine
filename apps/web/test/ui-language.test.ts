import { afterEach, describe, expect, it } from 'vitest';
import { setRenderLanguage } from '../lib/i18n';
import { copy, uiError, uiNumber } from '../lib/i18n/ui';
import { UI_BN } from '../lib/i18n/ui-bn';
afterEach(() => setRenderLanguage('en'));
const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
describe('whole-app UI language', () => {
  it('has meaningful Bangla-script copy and matching placeholders for all additional UI entries', () => {
    for (const [en, bn] of Object.entries(UI_BN)) {
      expect(bn, en).toMatch(/[\u0980-\u09ff]/);
      expect(bn.replace(/\{\w+\}/g, ''), en).not.toMatch(/[a-z]/i);
      expect(placeholders(bn), en).toEqual(placeholders(en));
    }
  });
  it('localizes known names and numeric labels without corrupting identities or IDs', () => {
    setRenderLanguage('bn');
    expect(copy('Pip')).toBe('পিপ');
    expect(copy('Ari')).toBe('আরি');
    expect(uiNumber(203)).toBe('২০৩');
    expect(copy('parent123@justimagine.test')).toBe('parent123@justimagine.test');
    expect(copy('w_01m51s06tz1xwbmsnjb6d5gpx3')).toBe('w_01m51s06tz1xwbmsnjb6d5gpx3');
    expect(copy('Rafi Ahmed')).toBe('Rafi Ahmed');
  });
  it('uses the render language for hydration and can switch existing feedback back to English', () => {
    expect(copy('Save language')).toBe('Save language');
    setRenderLanguage('bn');
    const saved = copy('Save language');
    expect(saved).toBe('ভাষা সংরক্ষণ করুন');
    setRenderLanguage('en');
    expect(copy(saved)).toBe('Save language');
  });
  it('keeps numbered interpolation tokens intact while localizing their values', () => {
    setRenderLanguage('bn');
    const result = copy(
      'Choose the language for {v0}. The app, learning activities and voice will follow it.',
      { v0: 'Ari' },
    );
    expect(result).toContain('আরির জন্য');
    expect(result).not.toContain('{');
    expect(result).not.toContain('Ari');
    expect(copy('Apply {v0}', { v0: 'Forest' })).toBe('বন রং চালু করুন');
  });
  it('never leaks an untranslated SDK/network error into Bangla screens', () => {
    setRenderLanguage('bn');
    expect(uiError(new Error('Firebase token refused: abc'))).not.toMatch(/[a-z]/i);
    expect(uiError(new Error('Failed to fetch'))).toContain('সংযোগ');
  });
});
