import { expect, it, vi } from 'vitest';
import { db } from '@just-imagine/server-core';
import { startLocalQueue } from '../src/local-queue';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
it('reclaims expired work, retries failures, and removes delivered payloads', async () => {
  const ref = db().doc('localBuildTasks/j_local_retry');
  await ref.set({
    state: 'running',
    owner: 'dead-process',
    leaseUntil: 1,
    nextAt: 0,
    attempts: 1,
    payload: { jobId: 'j_local_retry' },
  });
  const run = vi
    .fn()
    .mockRejectedValueOnce(new Error('temporary'))
    .mockResolvedValue({ status: 'complete' });
  const stop = startLocalQueue({ run });
  try {
    await vi.waitFor(() => expect(run).toHaveBeenCalledOnce(), { timeout: 3000 });
    await vi.waitFor(async () => expect((await ref.get()).data()?.['state']).toBe('queued'));
    await ref.update({ nextAt: 0 });
    await vi.waitFor(async () => expect((await ref.get()).exists).toBe(false), { timeout: 3000 });
    expect(run).toHaveBeenCalledTimes(2);
  } finally {
    await stop();
    await ref.delete();
  }
});
it('does not resurrect a task deleted while its worker is running', async () => {
  const ref = db().doc('localBuildTasks/j_local_deleted');
  await ref.set({ state: 'queued', leaseUntil: 0, nextAt: 0, payload: {} });
  let release!: () => void;
  const run = vi.fn(
    () =>
      new Promise<{ status: 'complete' }>((resolve) => {
        release = () => resolve({ status: 'complete' });
      }),
  );
  const stop = startLocalQueue({ run });
  try {
    await vi.waitFor(() => expect(run).toHaveBeenCalledOnce(), { timeout: 3000 });
    await ref.delete();
  } finally {
    release?.();
    await stop();
  }
  expect((await ref.get()).exists).toBe(false);
});
