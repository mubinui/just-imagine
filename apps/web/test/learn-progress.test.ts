import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  DEMO_LEARN,
  applyPet,
  applyPoints,
  buddyFor,
  doneIn,
  fromSummary,
  readBuddy,
  readDemoLearn,
  writeBuddy,
  writeDemoLearn,
} from '../components/learn/progress';

describe('learn progress', () => {
  it('starts the preview explorer a few points short of the first pet', () => {
    expect(DEMO_LEARN.points).toBe(6);
    expect(DEMO_LEARN.pets).toEqual([]);
    expect(doneIn(DEMO_LEARN, ['ch_planet_count', 'ch_saturn_bath'])).toBe(1);
  });
  it('takes the server total and records the answered challenge once', () => {
    const once = applyPoints(DEMO_LEARN, 'space', {
      total: 10,
      delta: 4,
      reason: 'ch_saturn_bath',
    });
    expect(once.points).toBe(10);
    expect(once.progress['space']).toContain('ch_saturn_bath');
    const twice = applyPoints(once, 'space', { total: 10, delta: 4, reason: 'ch_saturn_bath' });
    expect(twice.progress['space']!.filter((id) => id === 'ch_saturn_bath')).toHaveLength(1);
    expect(DEMO_LEARN.progress['space']).not.toContain('ch_saturn_bath');
  });
  it('adds a pet once and picks a buddy the child owns', () => {
    const withPet = applyPet(applyPet(DEMO_LEARN, 'tuktuk'), 'tuktuk');
    expect(withPet.pets).toEqual(['tuktuk']);
    expect(buddyFor(withPet, undefined)).toBe('tuktuk');
    expect(buddyFor(applyPet(withPet, 'chiku'), 'tuktuk')).toBe('tuktuk');
    expect(buddyFor(withPet, 'golu')).toBe('tuktuk');
    expect(buddyFor(DEMO_LEARN, 'golu')).toBeUndefined();
  });
  it('reads the api summary', () => {
    expect(
      fromSummary({
        points: 3,
        pets: ['tuktuk'],
        progress: [{ packId: 'space', challengesDone: ['ch_rings'], updatedAt: 1 }],
      }),
    ).toEqual({ points: 3, pets: ['tuktuk'], progress: { space: ['ch_rings'] } });
  });
});

describe('preview storage', () => {
  const store = new Map<string, string>();
  beforeEach(() => {
    store.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
        removeItem: (k: string) => store.delete(k),
      },
    });
  });
  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });
  it('round-trips per child and survives broken or missing storage', () => {
    expect(readDemoLearn('c1')).toEqual(DEMO_LEARN);
    writeDemoLearn('c1', applyPet(DEMO_LEARN, 'tuktuk'));
    expect(readDemoLearn('c1').pets).toEqual(['tuktuk']);
    expect(readDemoLearn('c2').pets).toEqual([]);
    store.set('ji-learn:c3', '{broken');
    expect(readDemoLearn('c3')).toEqual(DEMO_LEARN);
    writeBuddy('c1', 'tuktuk');
    expect(readBuddy('c1')).toBe('tuktuk');
    delete (globalThis as { localStorage?: unknown }).localStorage;
    expect(readDemoLearn('c1')).toEqual(DEMO_LEARN);
    expect(readBuddy('c1')).toBeUndefined();
  });
});
