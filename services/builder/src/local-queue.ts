import { randomUUID } from 'node:crypto';
import { db, logEvent } from '@just-imagine/server-core';
import type { BuilderWorker } from './worker';

/** Firestore-backed local task delivery. The production Cloud Tasks path is unchanged. */
export function startLocalQueue(worker: Pick<BuilderWorker, 'run'>) {
  let stopped = false,
    active: Promise<void> | undefined;
  const owner = randomUUID();
  async function tick() {
    const tasks = await db()
      .collection('localBuildTasks')
      .where('state', 'in', ['queued', 'running'])
      .limit(50)
      .get();
    for (const task of tasks.docs) {
      if (stopped) break;
      const claimed = await db().runTransaction(async (tx) => {
        const current = await tx.get(task.ref),
          data = current.data();
        if (
          !data ||
          Number(data['nextAt']) > Date.now() ||
          Number(data['leaseUntil']) > Date.now() ||
          !['queued', 'running'].includes(data['state'])
        )
          return undefined;
        const attempts = Number(data['attempts'] ?? 0) + 1;
        tx.update(task.ref, { state: 'running', owner, leaseUntil: Date.now() + 120000, attempts });
        return { payload: data['payload'], attempts };
      });
      if (!claimed) continue;
      const renew = setInterval(() => {
        void db()
          .runTransaction(async (tx) => {
            const current = await tx.get(task.ref);
            if (current.data()?.['owner'] === owner)
              tx.update(task.ref, { leaseUntil: Date.now() + 120000 });
          })
          .catch(() => {});
      }, 30000);
      let retry = false;
      try {
        await worker.run(claimed.payload);
      } catch (error) {
        retry = !(
          error &&
          typeof error === 'object' &&
          'retryable' in error &&
          error.retryable === false
        );
        logEvent(retry ? 'local_build_retry' : 'local_build_failed', {
          jobId: task.id,
          count: claimed.attempts,
        });
      } finally {
        clearInterval(renew);
      }
      await db().runTransaction(async (tx) => {
        const current = await tx.get(task.ref);
        if (current.data()?.['owner'] !== owner) return;
        // Delete payload after completion or exhausted retries; builderJobs retains the diagnostic outcome.
        if (!retry || claimed.attempts >= 5) tx.delete(task.ref);
        else
          tx.update(task.ref, {
            state: 'queued',
            owner: '',
            leaseUntil: 0,
            nextAt: Date.now() + Math.min(30000, 1000 * 2 ** claimed.attempts),
          });
      });
    }
  }
  const poll = () => {
    if (!stopped && !active)
      active = tick()
        .catch(() => logEvent('local_queue_unavailable', {}, 'ERROR'))
        .finally(() => {
          active = undefined;
        });
  };
  const timer = setInterval(poll, 500);
  poll();
  return async () => {
    stopped = true;
    clearInterval(timer);
    await active;
  };
}
