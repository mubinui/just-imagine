import { describe, it, expect, afterEach } from 'vitest';
import { s, english, setActiveStrings } from '../lib/strings/en';
import { bn } from '../lib/i18n/bn';

afterEach(() => setActiveStrings(english));

describe('active strings', () => {
  it('reads English by default', () => {
    expect(s.end).toBe(english.end);
    expect(s.dialLabels.gravity).toBe('Gravity');
  });
  it('switches every key, including nested ones, to Bangla', () => {
    setActiveStrings(bn);
    expect(s.end).toBe(bn.end);
    expect(s.dialLabels.gravity).toBe(bn.dialLabels.gravity);
    expect(s.statusLabels.connected).toBe(bn.statusLabels.connected);
  });
});
