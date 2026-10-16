import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@just-imagine/server-core';
import { paths, yyyymmdd } from '@just-imagine/protocol';
import { manuscript } from '../../../packages/protocol/test/fixtures/story';
import { FirestoreStoryStore } from '../src/stories';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
const deliver = async () => {};
const store = () => new FirestoreStoryStore(deliver);
beforeEach(async () => {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!host || host.endsWith(':8080')) throw new Error('Use isolated test emulator, not demo data');
  await fetch(
    `http://${host}/emulator/v1/projects/demo-just-imagine/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db().doc(paths.user('parent')).set({
    email: 'test@example.test',
    displayName: 'Parent',
    consentAt: 1,
    plan: 'free',
    stripeCustomerId: null,
    createdAt: 1,
  });
  await db()
    .doc(paths.child('parent', 'c_mira'))
    .set({
      firstName: 'Mira',
      avatar: 'owl',
      ageBand: '8-10',
      tier: 'playground',
      labsUnlocked: false,
      captions: true,
      language: 'bn',
      sessionTargetMinutes: 8,
      loopsCompleted: 0,
      createdAt: 1,
      storyPreferences: {
        learningGoals: 'Caring for teeth and sharing',
        avoidTopics: 'storms',
        length: 'short',
      },
    });
});
describe('owned story lifecycle', () => {
  it('snapshots real parent preferences and meters concurrent idempotent requests once', async () => {
    const s = store(),
      body = { topic: 'A rabbit and a planet make a garden', requestId: 'one' };
    const [a, b] = await Promise.all([
      s.create('parent', 'c_mira', body),
      s.create('parent', 'c_mira', body),
    ]);
    expect(a.id).toBe(b.id);
    expect(a.language).toBe('bn');
    expect(a.preferences.learningGoals).toContain('teeth');
    const usage = await db()
      .doc(paths.usageDaily('parent', yyyymmdd(new Date())))
      .get();
    expect(usage.data()?.['worlds']).toBe(1);
    await expect(
      s.create('parent', 'c_mira', { ...body, topic: 'Another different story' }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('refuses another family, deletion locks and a fourth free creation', async () => {
    const s = store(),
      a = await s.create('parent', 'c_mira', { topic: 'A friendly planet', requestId: 'one' });
    await expect(s.get('other', a.id)).rejects.toMatchObject({ status: 404 });
    await s.create('parent', 'c_mira', { topic: 'Another friendly planet', requestId: 'two' });
    await s.create('parent', 'c_mira', { topic: 'Third friendly planet', requestId: 'three' });
    await expect(
      s.create('parent', 'c_mira', { topic: 'Fourth friendly planet', requestId: 'four' }),
    ).rejects.toMatchObject({ status: 429 });
    await db().doc('users/parent/deletionLocks/c_mira').set({ at: 1 });
    await expect(s.get('parent', a.id)).rejects.toMatchObject({ status: 404 });
  });
  it('validates saved passages/choices and detects stale bookmark writes', async () => {
    const s = store(),
      a = await s.create('parent', 'c_mira', { topic: 'A friendly planet', requestId: 'one' });
    await db().doc(`stories/${a.id}`).update({ manuscript: manuscript(), status: 'ready' });
    const body = {
      revision: 0,
      progress: { scene: 1, beat: 1, choices: { scene_0: 'water' }, completed: false },
    };
    expect((await s.update('parent', a.id, body)).revision).toBe(1);
    await expect(s.update('parent', a.id, body)).rejects.toMatchObject({ status: 409 });
    await expect(
      s.update('parent', a.id, {
        ...body,
        revision: 1,
        progress: { ...body.progress, choices: { scene_0: 'not-a-choice' } },
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      s.update('parent', a.id, { ...body, revision: 1, progress: { ...body.progress, scene: 5 } }),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('deletes the story behind a permanent late-writer fence', async () => {
    const s = store(),
      a = await s.create('parent', 'c_mira', { topic: 'A friendly planet', requestId: 'one' });
    await s.delete('parent', a.id);
    await expect(s.get('parent', a.id)).rejects.toMatchObject({ status: 404 });
    expect((await db().doc(`storyDeletionLocks/${a.id}`).get()).exists).toBe(true);
  });
});
