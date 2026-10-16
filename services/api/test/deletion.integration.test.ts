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

it('deletes only owned builder jobs for a world and preserves durable fences', async () => {
  await db()
    .doc('builderJobs/j_remove_owned')
    .set({ uid: 'cleanup_parent', childId: 'c_cleanup', worldId: 'w_cleanup', status: 'running' });
  await db()
    .doc('builderJobs/j_keep_other')
    .set({ uid: 'other_parent', childId: 'c_other', worldId: 'w_cleanup', status: 'failed' });
  await db()
    .doc('localBuildTasks/j_remove_owned')
    .set({ uid: 'cleanup_parent', childId: 'c_cleanup', worldId: 'w_cleanup' });
  const id = await requestDeletion('cleanup_parent', null, 'w_cleanup');
  await processDeletion(id);
  expect((await db().doc('builderJobs/j_remove_owned').get()).exists).toBe(false);
  expect((await db().doc('localBuildTasks/j_remove_owned').get()).exists).toBe(false);
  expect((await db().doc('builderJobs/j_keep_other').get()).exists).toBe(true);
  expect((await db().doc('worldDeletionLocks/w_cleanup').get()).exists).toBe(true);
});
