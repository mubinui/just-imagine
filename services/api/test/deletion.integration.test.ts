import { it, expect, vi } from 'vitest';
import { db, adminAuth } from '@just-imagine/server-core';
import { requestDeletion, processDeletion } from '../src/deletion';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
it('keeps a durable fence and retries after Auth fails even without user data', async () => {
  await db().doc('users/delete_retry').set({ name: 'Parent' });
  const id = await requestDeletion('delete_retry', null);
  expect((await db().doc('deletionLocks/delete_retry').get()).exists).toBe(true);
  const auth = vi
    .spyOn(adminAuth(), 'deleteUser')
    .mockRejectedValueOnce(new Error('temporarily unavailable'))
    .mockRejectedValueOnce({ code: 'auth/user-not-found' });
  await expect(processDeletion(id)).rejects.toThrow('temporarily');
  expect((await db().doc(`deletionJobs/${id}`).get()).data()?.['status']).toBe('queued');
  await db().doc('users/delete_retry').delete();
  await processDeletion(id);
  expect((await db().doc(`deletionJobs/${id}`).get()).data()?.['status']).toBe('complete');
  await processDeletion(id);
  expect(auth).toHaveBeenCalledTimes(2);
  auth.mockRestore();
});

it('fences individual worlds before recursively removing versions', async () => {
  await db().doc('worlds/w_delete_single').set({ ownerUid: 'delete_single' });
  await db().doc('worlds/w_delete_single/versions/j_one').set({ doc: {} });
  const id = await requestDeletion('delete_single', null, 'w_delete_single');
  expect((await db().doc('worldDeletionLocks/w_delete_single').get()).exists).toBe(true);
  await processDeletion(id);
  expect((await db().doc('worlds/w_delete_single').get()).exists).toBe(false);
  expect((await db().collection('worlds/w_delete_single/versions').get()).empty).toBe(true);
  expect((await db().doc('deletionLocks/delete_single').get()).exists).toBe(false);
});
