import { describe, it, expect, beforeEach } from 'vitest';
import { db, writeDoc } from '@just-imagine/server-core';
import { UserDocSchema, paths } from '@just-imagine/protocol';
import { FirestoreApiStore } from '../src/store';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
const store = new FirestoreApiStore();
const user = {
  email: 'parent@example.test',
  displayName: 'Parent',
  consentAt: 1,
  plan: 'free',
  stripeCustomerId: null,
  createdAt: 1,
};
beforeEach(async () => {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!host) throw new Error('Run integration tests under Firestore emulator');
  const response = await fetch(
    `http://${host}/emulator/v1/projects/demo-just-imagine/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!response.ok) throw new Error('Emulator clear failed');
  await writeDoc(paths.user('parent'), UserDocSchema, user);
});
describe('Firestore API ownership and limits', () => {
  it('allows exactly one concurrent free profile creation', async () => {
    const create = () =>
      store.createChild('parent', { firstName: 'Mira', avatar: 'owl', ageBand: '8-10' });
    const results = await Promise.allSettled([create(), create()]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((r) => r.status === 'rejected');
    expect(failed?.status === 'rejected' && failed.reason).toMatchObject({ code: 'PLAN_LIMIT' });
    expect((await store.me('parent')).children).toHaveLength(1);
  });
  it('cannot update another parent child and rejects lab without unlock', async () => {
    const child = await store.createChild('parent', {
      firstName: 'Mira',
      avatar: 'owl',
      ageBand: '6-7',
    });
    await writeDoc(paths.user('other'), UserDocSchema, user);
    await expect(store.updateChild('other', child.id, { firstName: 'No' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(store.updateChild('parent', child.id, { tier: 'lab' })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
    await expect(
      store.updateChild('parent', child.id, { tier: 'lab', labsUnlocked: true }),
    ).resolves.toMatchObject({ tier: 'lab', labsUnlocked: true });
  });
  it('does not read another owner world', async () => {
    // A malformed foreign doc must never be returned to the requesting parent.
    await db().doc(paths.world('w_foreign')).set({ ownerUid: 'other' });
    await expect(store.getWorld('parent', 'w_foreign')).rejects.toMatchObject({ status: 404 });
  });
  it('deletes profile subcollections and its worlds and sessions', async () => {
    const child = await store.createChild('parent', {
      firstName: 'Mira',
      avatar: 'owl',
      ageBand: '8-10',
    });
    await db()
      .doc(`${paths.child('parent', child.id)}/discoveries/gravity`)
      .set({ concept: 'gravity' });
    await db().doc('worlds/w_delete').set({ ownerUid: 'parent', childId: child.id });
    await db().doc('worlds/w_delete/versions/1').set({ test: true });
    await db().doc('sessions/s_delete').set({ uid: 'parent', childId: child.id });
    await db()
      .doc('builderJobs/j_child_delete')
      .set({ uid: 'parent', childId: child.id, worldId: 'w_delete', status: 'running' });
    await store.deleteChild('parent', child.id);
    expect((await db().doc('builderJobs/j_child_delete').get()).exists).toBe(false);
    expect((await db().doc(paths.child('parent', child.id)).get()).exists).toBe(false);
    expect((await db().collection('worlds').get()).empty).toBe(true);
    expect((await db().collection('sessions').get()).empty).toBe(true);
    expect((await db().collection('worlds/w_delete/versions').get()).empty).toBe(true);
    await store.deleteChild('parent', child.id);
  });
});
