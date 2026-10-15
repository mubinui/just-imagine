import { describe, it, expect } from 'vitest';
import { MATERIAL_TABLE, lookupMaterialRange } from '../src/materials-table';
import { LIMITS } from '../src/limits';

describe('MATERIAL_TABLE', () => {
  it('keeps every range inside the global density limits and ordered', () => {
    for (const [name, r] of Object.entries(MATERIAL_TABLE)) {
      for (const key of ['density', 'friction', 'restitution', 'softness'] as const) {
        const [lo, hi] = r[key];
        expect(lo, `${name}.${key}`).toBeLessThanOrEqual(hi);
      }
      expect(r.density[0]).toBeGreaterThanOrEqual(LIMITS.density.min);
      expect(r.density[1]).toBeLessThanOrEqual(LIMITS.density.max);
    }
  });
});

describe('lookupMaterialRange', () => {
  it('finds a material by exact name', () => {
    expect(lookupMaterialRange('jelly')).toBe(MATERIAL_TABLE['jelly']);
  });
  it('finds a material by its last word, ignoring case and separators', () => {
    expect(lookupMaterialRange('Green_Jelly')).toBe(MATERIAL_TABLE['jelly']);
    expect(lookupMaterialRange('old-wood')).toBe(MATERIAL_TABLE['wood']);
  });
  it('prefers the last known word when several match', () => {
    expect(lookupMaterialRange('stone_rubber')).toBe(MATERIAL_TABLE['rubber']);
  });
  it('returns undefined for unknown names', () => {
    expect(lookupMaterialRange('unobtainium')).toBeUndefined();
  });
});
