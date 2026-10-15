import { describe, it, expect } from 'vitest';
import { newId } from '../src/ids';

describe('newId', () => {
  it('produces prefixed lowercase ULIDs that sort by time', () => {
    const a = newId('w');
    const b = newId('w');
    expect(a).toMatch(/^w_[0-9a-z]{26}$/);
    expect(a < b).toBe(true);
    const ids = Array.from({ length: 1000 }, () => newId('w'));
    expect(new Set(ids).size).toBe(1000);
    expect([...ids].sort()).toEqual(ids);
  });
});
