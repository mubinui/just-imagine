import { describe, it, expect, beforeEach } from 'vitest';
import { PLAN_LIMITS, UsageDailyDocSchema, paths, yyyymmdd } from '@just-imagine/protocol';
import { clearFirestore } from './emulator';
import { readDoc } from '../src/docs';
import {
  QuotaExceeded,
  addImages,
  addVoiceSeconds,
  reserveWorld,
  voiceSecondsLeft,
} from '../src/quota';

const now = new Date('2026-10-15T10:00:00Z');
const day = yyyymmdd(now);

describe('quota', () => {
  beforeEach(clearFirestore);

  it('counts worlds per day and refuses the fourth free world', async () => {
    await expect(reserveWorld('u1', 'free', now)).resolves.toEqual({
      worldsUsed: 1,
      worldsLeft: 2,
    });
    await reserveWorld('u1', 'free', now);
    await reserveWorld('u1', 'free', now);
    await expect(reserveWorld('u1', 'free', now)).rejects.toMatchObject({
      kind: 'worlds',
      limit: 3,
    });
    const usage = await readDoc(paths.usageDaily('u1', day), UsageDailyDocSchema);
    expect(usage?.worlds).toBe(3);
  });

  it.each(Array.from({ length: 10 }, (_, i) => i))(
    'race %i lets exactly one of two concurrent reservations through at the last unit',
    async () => {
      await reserveWorld('u1', 'free', now);
      await reserveWorld('u1', 'free', now);
      const results = await Promise.allSettled([
        reserveWorld('u1', 'free', now),
        reserveWorld('u1', 'free', now),
      ]);
      const ok = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');
      expect(ok.length).toBe(1);
      expect(failed.length).toBe(1);
      expect((failed[0] as PromiseRejectedResult).reason).toBeInstanceOf(QuotaExceeded);
    },
  );

  it('starts a new day with a fresh counter', async () => {
    for (let i = 0; i < 3; i++) await reserveWorld('u1', 'free', now);
    const tomorrow = new Date('2026-10-16T00:00:01Z');
    await expect(reserveWorld('u1', 'free', tomorrow)).resolves.toEqual({
      worldsUsed: 1,
      worldsLeft: 2,
    });
  });

  it('accumulates voice seconds and reports what is left, going negative rather than throwing', async () => {
    expect(await voiceSecondsLeft('u1', 'free', now)).toBe(PLAN_LIMITS.free.voiceSecondsPerDay);
    await expect(addVoiceSeconds('u1', 'free', 30, now)).resolves.toEqual({
      voiceSecondsLeft: 870,
    });
    await expect(addVoiceSeconds('u1', 'free', 900, now)).resolves.toEqual({
      voiceSecondsLeft: -30,
    });
  });

  it.each([NaN, Infinity, -1])('rejects invalid voice %s', async (seconds) => {
    await expect(addVoiceSeconds('u1', 'free', seconds, now)).rejects.toThrow();
  });
  it.each([NaN, Infinity, -1, 1.5])('rejects invalid image %s', async (count) => {
    await expect(addImages('u1', count, now)).rejects.toThrow();
  });
  it.each([
    { uid: 'other', date: day },
    { uid: 'u1', date: '20261014' },
    { uid: 'u1', date: day, worlds: -1 },
  ])('rejects corrupt stored usage %j', async (identity) => {
    const { db } = await import('../src/firebase');
    await db()
      .doc(paths.usageDaily('u1', day))
      .set({ worlds: 0, images: 0, voiceSeconds: 0, ...identity });
    await expect(reserveWorld('u1', 'free', now)).rejects.toThrow();
    await expect(voiceSecondsLeft('u1', 'free', now)).rejects.toThrow();
  });
  it('counts images', async () => {
    await addImages('u1', 4, now);
    await addImages('u1', 2, now);
    const usage = await readDoc(paths.usageDaily('u1', day), UsageDailyDocSchema);
    expect(usage?.images).toBe(6);
  });
});

it('does not recreate daily usage after account deletion is fenced', async () => {
  const { db } = await import('../src/firebase');
  await db().doc('deletionLocks/deleted_usage').set({ requestedAt: 1 });
  await expect(addImages('deleted_usage', 1, now)).rejects.toThrow('deletion');
  await expect(addVoiceSeconds('deleted_usage', 'free', 10, now)).rejects.toThrow('deletion');
  expect((await db().doc(paths.usageDaily('deleted_usage', day)).get()).exists).toBe(false);
});
