import { it, expect } from 'vitest';
import { db } from '@just-imagine/server-core';
import { paths, yyyymmdd } from '@just-imagine/protocol';
import { FirestoreSessionStore } from '../src/store';
import type { SessionRecord } from '../src/contracts';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
it('atomically meters monotonic checkpoints once and fences deleted accounts', async () => {
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
  const record: SessionRecord = {
    id: 's_meter',
    identity: { uid: 'meter_parent', childId: 'c_meter', child, plan: 'free', remaining: 900 },
    characterId: 'bhombol',
    startedAt: Date.now(),
  };
  await db().doc(paths.child('meter_parent', 'c_meter')).set(child);
  const store = new FirestoreSessionStore({
    project: 'demo-just-imagine',
    queue: 'test',
    builderUrl: 'https://example.test',
    serviceAccount: 'test@example.test',
  });
  await store.claim(record);
  expect(await store.meter(record, 10)).toBe(890);
  expect(await store.meter(record, 10)).toBe(890);
  await Promise.all([store.meter(record, 20), store.meter(record, 20)]);
  const usage = db().doc(paths.usageDaily('meter_parent', yyyymmdd(new Date())));
  expect((await usage.get()).data()?.['voiceSeconds']).toBe(20);
  expect((await db().doc(paths.session(record.id)).get()).data()?.['voiceSeconds']).toBe(20);
  await db().doc('deletionLocks/meter_parent').set({ requestedAt: 1 });
  await usage.delete();
  await expect(store.meter(record, 30)).rejects.toThrow('FORBIDDEN');
  expect((await usage.get()).exists).toBe(false);
  await store.finish(record, 'Science exploration', 'ended');
});
it('persists learning progress once when finish is retried', async () => {
  const child = {
    firstName: 'Mira',
    avatar: 'owl' as const,
    ageBand: '8-10' as const,
    tier: 'playground' as const,
    labsUnlocked: false,
    captions: true,
    sessionTargetMinutes: 8,
    loopsCompleted: 2,
    createdAt: 1,
  };
  const record: SessionRecord = {
    id: 's_progress',
    identity: {
      uid: 'progress_parent',
      childId: 'c_progress',
      child,
      plan: 'free',
      remaining: 900,
    },
    characterId: 'bhombol',
    startedAt: Date.now(),
    completedLoops: 1,
    stats: {
      turns: 4,
      beats: 2,
      discoveries: ['bounce'],
      predictions: [{ question: 'Will it bounce?', answerIndex: 0, correctIndex: 0 }],
    },
  };
  const ref = db().doc(paths.child('progress_parent', 'c_progress'));
  await ref.set(child);
  const store = new FirestoreSessionStore({
    project: 'demo-just-imagine',
    queue: 'test',
    builderUrl: 'https://example.test',
    serviceAccount: 'test@example.test',
  });
  await store.claim(record);
  await store.finish(record, 'Explored bounce', 'ended');
  await store.finish(record, 'Explored bounce', 'ended');
  expect((await ref.get()).data()).toMatchObject({ loopsCompleted: 3, sessionTargetMinutes: 10 });
  expect((await db().doc(paths.session(record.id)).get()).data()).toMatchObject({
    turns: 4,
    beats: 2,
    discoveries: ['bounce'],
    active: false,
  });
});

it('delivers local jobs with optional fields through Firestore without undefined values', async () => {
  const previous = process.env['LOCAL_DEV'];
  process.env['LOCAL_DEV'] = '1';
  const store = new FirestoreSessionStore({
    project: 'demo-just-imagine',
    queue: 'test',
    builderUrl: 'https://example.test',
    serviceAccount: 'test@example.test',
  });
  const ref = db().doc('localBuildTasks/j_local_optional');
  try {
    await store.enqueue({
      kind: 'build',
      jobId: 'j_local_optional',
      worldId: 'w_local_optional',
      uid: 'local_queue_parent',
      childId: 'c_local_queue',
      sessionId: 's_local_queue',
      plan: 'free',
      description: 'A friendly bouncing ball',
      concepts: ['bounce'],
      ageBand: '8-10',
      tier: 'playground',
      labKind: undefined,
      promptVersion: 'v1',
      styleVersion: 'v1',
      conversationSummary: '',
    });
    const task = (await ref.get()).data();
    expect(task).toMatchObject({
      worldId: 'w_local_optional',
      state: 'queued',
      payload: { kind: 'build' },
    });
    expect(task?.['payload']).not.toHaveProperty('labKind');
  } finally {
    if (previous === undefined) delete process.env['LOCAL_DEV'];
    else process.env['LOCAL_DEV'] = previous;
    await ref.delete();
  }
});
