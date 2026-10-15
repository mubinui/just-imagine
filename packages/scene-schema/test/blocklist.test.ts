import { describe, it, expect } from 'vitest';
import { findBlockedTerm } from '../src/blocklist';

describe('findBlockedTerm', () => {
  it('returns null for ordinary kid content', () => {
    expect(findBlockedTerm('a friendly dragon made of jelly')).toBeNull();
  });
  it('matches whole words case-insensitively', () => {
    expect(findBlockedTerm('a Gun that shoots bubbles')).toBe('gun');
  });
  it('does not match inside other words', () => {
    expect(findBlockedTerm('a begun race')).toBeNull();
    expect(findBlockedTerm('a skilled painter')).toBeNull();
  });
});
