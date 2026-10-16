import { it, expect } from 'vitest';
import { db } from '@just-imagine/server-core';
import { learnPaths, paths } from '@just-imagine/protocol';
import { FirestoreSessionStore } from '../src/store';
import type { SessionRecord } from '../src/contracts';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';

const store = () =>
  new FirestoreSessionStore({
    project: 'demo-just-imagine',
    queue: 'test',
    builderUrl: 'https://example.test',
    serviceAccount: 'test@example.test',
  });
const child = {
  firstName: 'Mira',
  avatar: 'owl' as const,
  ageBand: '8-10' as const,
  tier: 'playground' as const,
  labsUnlocked: false,
  captions: true,
  sessionTargetMinutes: 8,
  loopsCompleted: 0,
  createdAt: 1,
};
const record = (uid: string, childId: string): SessionRecord => ({
  id: `s_${uid}`,
  identity: { uid, childId, child, plan: 'free', remaining: 900 },
  characterId: 'bhombol',
  startedAt: Date.now(),
  persona: { packId: 'space', characterId: 'saturn' },
});

it('adds points to an older profile, unlocks pets at thresholds and records pack progress', async () => {
  const ref = db().doc(paths.child('learn_parent', 'c_learn'));
  await ref.set({ ...child, points: 6 });
  const s = store();
  const r = record('learn_parent', 'c_learn');
  await expect(
    s.awardPoints(r, { packId: 'space', challengeId: 'ch_saturn_bath', points: 4 }),
  ).resolves.toEqual({ total: 10, unlocked: ['tuktuk'] });
  await expect(
    s.awardPoints(r, { packId: 'space', challengeId: 'ch_planet_count', points: 2 }),
  ).resolves.toEqual({ total: 12, unlocked: [] });
  expect((await ref.get()).data()).toMatchObject({
    points: 12,
    pets: ['tuktuk'],
    firstName: 'Mira',
  });
  const progress = (
    await db()
      .doc(learnPaths.progress('learn_parent', 'c_learn', 'space'))
      .get()
  ).data();
  expect(progress).toMatchObject({
    packId: 'space',
    challengesDone: ['ch_saturn_bath', 'ch_planet_count'],
  });
  // The session's end keeps the points it did not write.
  await s.claim(r);
  await s.finish({ ...r, completedLoops: 1 }, 'Met Saturn', 'ended');
  expect((await ref.get()).data()).toMatchObject({ points: 12, pets: ['tuktuk'] });
});

it('treats a missing points field as zero and grants a challenge pet reward early', async () => {
  const ref = db().doc(paths.child('reward_parent', 'c_reward'));
  await ref.set(child);
  await expect(
    store().awardPoints(record('reward_parent', 'c_reward'), {
      packId: 'space',
      challengeId: 'ch_biggest',
      points: 2,
      petReward: 'tuktuk',
    }),
  ).resolves.toEqual({ total: 2, unlocked: ['tuktuk'] });
});

it('refuses to award points to a profile being deleted', async () => {
  await db().doc(paths.child('fenced_parent', 'c_fenced')).set(child);
  await db().doc('users/fenced_parent/deletionLocks/c_fenced').set({ requestedAt: 1 });
  await expect(
    store().awardPoints(record('fenced_parent', 'c_fenced'), {
      packId: 'space',
      challengeId: 'ch_saturn_bath',
      points: 4,
    }),
  ).rejects.toThrow('FORBIDDEN');
  expect(
    (await db().doc(paths.child('fenced_parent', 'c_fenced')).get()).data(),
  ).not.toHaveProperty('points');
});

it('pays each authored challenge once across concurrent sessions and later replays', async () => {
  const ref = db().doc(paths.child('once_parent', 'c_once'));
  await ref.set(child);
  const award = { packId: 'hygiene', challengeId: 'ch_soap_01', points: 3 };
  const results = await Promise.allSettled([
    store().awardPoints(record('once_parent', 'c_once'), award),
    store().awardPoints(record('once_parent', 'c_once'), award),
  ]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect((await ref.get()).data()?.['points']).toBe(3);
  await expect(store().awardPoints(record('once_parent', 'c_once'), award)).rejects.toThrow(
    /already/,
  );
});
