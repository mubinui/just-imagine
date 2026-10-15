import { describe, it, expect } from 'vitest';
import { castFor, clampToVariable, effectiveCaptions, fillPath } from '../lib/helpers';
describe('child interaction boundaries', () => {
  it('filters guides and companions by age', () => {
    expect(castFor('6-7').map((c) => c.id)).not.toContain('onkomama');
    expect(castFor('8-10')).toHaveLength(6);
    expect(castFor('11-13').every((c) => c.kind === 'guide')).toBe(true);
  });
  it('honors parent caption overrides', () => {
    expect(effectiveCaptions({ ageBand: '6-7' })).toBe(false);
    expect(effectiveCaptions({ ageBand: '11-13' })).toBe(true);
    expect(effectiveCaptions({ ageBand: '6-7', captions: true })).toBe(true);
    expect(effectiveCaptions({ ageBand: '8-10', captions: false })).toBe(false);
  });
  it('clamps and snaps lab values including nonfinite input', () => {
    const v = { min: 1, max: 8, step: 0.5 };
    expect(clampToVariable(-4, v)).toBe(1);
    expect(clampToVariable(300, v)).toBe(8);
    expect(clampToVariable(3.3, v)).toBe(3.5);
    expect(clampToVariable(NaN, v)).toBe(1);
  });
  it('escapes path parameters and rejects missing parameters', () => {
    expect(fillPath('/v1/children/:childId', { childId: 'a/b' })).toBe('/v1/children/a%2Fb');
    expect(() => fillPath('/:worldId', {})).toThrow();
  });
});
