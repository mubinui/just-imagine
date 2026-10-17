import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SimView, SIM_DEFAULTS } from '../components/stem/SimView';
import { SIM_IDS } from '@just-imagine/stem-sims';
import { numericAnswer, assessmentAnswer, applyTutorSuggestion } from '../lib/school/answers';
import { previewRosterCsv } from '../lib/school/csv';
import { en } from '../lib/i18n/study/en';
import { bn } from '../lib/i18n/study/bn';
import { setSchoolLanguage, schoolLanguage } from '../lib/i18n/study';
const item = {
  id: 'cart',
  kind: 'simTask' as const,
  prompt: { en: 'Push', bn: 'ধাক্কা' },
  simId: 'newton-cart',
  startParams: { mass: 2, force: 0, muS: 0.4, muK: 0.2 },
  editableParams: ['force'],
  points: 2,
};
afterEach(() => vi.unstubAllGlobals());
describe('school input boundaries', () => {
  it('accepts Bengali decimals and Unicode minus without turning blanks into zero', () => {
    expect(numericAnswer(' −১২.৫০ ')).toBe(-12.5);
    expect(numericAnswer('০')).toBe(0);
    expect(() => numericAnswer('')).toThrow();
    expect(() => numericAnswer('Infinity')).toThrow();
    expect(() => numericAnswer('12kg')).toThrow();
  });
  it('submits only teacher-editable simulation params and preserves omitted defaults server-side', () => {
    expect(assessmentAnswer(item, { force: 8, mass: 0.5, observedAcceleration: 999 })).toEqual({
      force: 8,
    });
    expect(assessmentAnswer(item, undefined)).toEqual({});
  });
  it('does not let a tutor bypass locks, schema ranges or coupled friction constraints', () => {
    expect(applyTutorSuggestion('newton-cart', item.startParams, 'mass', 0.5, ['mass'])).toBeNull();
    expect(applyTutorSuggestion('newton-cart', item.startParams, 'force', 90, [])).toBeNull();
    expect(applyTutorSuggestion('newton-cart', item.startParams, 'muK', 0.7, [])).toBeNull();
    expect(applyTutorSuggestion('newton-cart', item.startParams, 'force', 10, [])).toEqual({
      ...item.startParams,
      force: 10,
    });
  });
  it('previews quoted multilingual CSV with BOM/CRLF and identifies actual import blockers', () => {
    const r = previewRosterCsv(
      '\uFEFFfirstName,username,classId\r\n"আরি, রহমান",ari-1,c_class\r\nRafi,ARI-1,c_other',
      ['c_class'],
      1,
    );
    expect(r.rows[0]?.firstName).toBe('আরি, রহমান');
    expect(r.issues.map((i) => i.code)).toEqual(['duplicate', 'unknownClass', 'seats']);
    expect(previewRosterCsv('name,username\nA,abc', []).issues[0]?.code).toBe('columns');
    expect(
      previewRosterCsv('firstName,username,classId\n"A,abc,c_class', ['c_class']).issues[0]?.code,
    ).toBe('quote');
  });
  it('keeps school language separate from the existing family profile and preference', () => {
    const store = new Map([
      ['ji-child', '{"id":"ari","language":"en"}'],
      ['ji-language', 'en'],
    ]);
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    setSchoolLanguage('bn');
    expect(schoolLanguage()).toBe('bn');
    expect(store.get('ji-child')).toBe('{"id":"ari","language":"en"}');
    expect(store.get('ji-language')).toBe('en');
  });
  it('keeps all school UI labels paired and nonempty in both languages', () => {
    expect(Object.keys(bn).sort()).toEqual(Object.keys(en).sort());
    expect(Object.values(bn).every((v) => v.trim().length > 0)).toBe(true);
  });
});
describe('model-backed simulation rendering', () => {
  for (const id of SIM_IDS)
    it(`renders ${id} with real defaults and keyboard-accessible controls`, () => {
      const html = renderToStaticMarkup(
        <SimView id={id} value={SIM_DEFAULTS[id]} onChange={() => {}} />,
      );
      expect(html).toContain('role="img"');
      expect(html).toContain('type="number"');
      expect(html).not.toMatch(/(?:NaN|undefined)/);
    });
});
