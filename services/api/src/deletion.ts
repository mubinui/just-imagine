import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { paths } from '@just-imagine/protocol';
import { db, adminAuth } from '@just-imagine/server-core';
const Job = z.object({
  uid: z.string(),
  childId: z.string().nullable(),
  worldId: z.string().nullable().default(null),
  status: z.enum(['queued', 'running', 'complete']),
  createdAt: z.number(),
  lease: z.string().optional(),
  expiresAt: z.number().optional(),
});
export async function requestDeletion(
  uid: string,
  childId: string | null,
  worldId: string | null = null,
): Promise<string> {
  const id = createHash('sha256')
    .update(JSON.stringify([uid, childId, worldId]))
    .digest('hex');
  await db().runTransaction(async (tx) => {
    const ref = db().doc(`deletionJobs/${id}`);
    const existing = await tx.get(ref);
    if (existing.exists) return;
    tx.create(ref, { uid, childId, worldId, status: 'queued', createdAt: Date.now() });
    tx.set(
      db().doc(
        worldId
          ? `worldDeletionLocks/${worldId}`
          : childId
            ? `users/${uid}/deletionLocks/${childId}`
            : `deletionLocks/${uid}`,
      ),
      { requestedAt: Date.now() },
    );
  });
  return id;
}
export async function processDeletion(
  id: string,
  cancelBilling?: (uid: string) => Promise<void>,
): Promise<void> {
  const ref = db().doc(
      `deletionJobs/${z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .parse(id)}`,
    ),
    lease = randomUUID();
  const job = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = Job.parse(snap.data());
    if (data.status === 'complete') return null;
    if (data.status === 'running' && (data.expiresAt ?? 0) > Date.now())
      throw new Error('Deletion is running');
    tx.update(ref, { status: 'running', lease, expiresAt: Date.now() + 300000 });
    return data;
  });
  if (!job) return;
  try {
    if (job.worldId) {
      await db().recursiveDelete(db().doc(paths.world(job.worldId)));
      await db().runTransaction(async (tx) => {
        if ((await tx.get(ref)).data()?.['lease'] !== lease) throw new Error('Deletion lease lost');
        tx.update(ref, { status: 'complete', finishedAt: Date.now() });
      });
      return;
    }
    if (job.childId === null) await cancelBilling?.(job.uid);
    for (const [collection, owner] of [
      ['worlds', 'ownerUid'],
      ['sessions', 'uid'],
    ] as const) {
      const base = db().collection(collection).where(owner, '==', job.uid);
      const query = job.childId ? base.where('childId', '==', job.childId) : base;
      for (const doc of (await query.get()).docs) await db().recursiveDelete(doc.ref);
    }
    if (job.childId) await db().recursiveDelete(db().doc(paths.child(job.uid, job.childId)));
    else {
      for (const doc of (await db().collection('usageDaily').where('uid', '==', job.uid).get())
        .docs)
        await doc.ref.delete();
      await db().doc(paths.subscription(job.uid)).delete();
      await db().doc(`billingState/${job.uid}`).delete();
      // Auth failure leaves durable intent; retry does not depend on a user document.
      try {
        await adminAuth().deleteUser(job.uid);
      } catch (error) {
        if (!(
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'auth/user-not-found'
        ))
          throw error;
      }
      await db().recursiveDelete(db().doc(paths.user(job.uid)));
    }
    await db().runTransaction(async (tx) => {
      if ((await tx.get(ref)).data()?.['lease'] !== lease) throw new Error('Deletion lease lost');
      tx.update(ref, { status: 'complete', finishedAt: Date.now() });
    });
  } catch (error) {
    await db().runTransaction(async (tx) => {
      if ((await tx.get(ref)).data()?.['lease'] === lease)
        tx.update(ref, { status: 'queued', expiresAt: 0 });
    });
    throw error;
  }
}
export async function retryDeletions(cancelBilling?: (uid: string) => Promise<void>) {
  const docs = await db()
    .collection('deletionJobs')
    .where('status', 'in', ['queued', 'running'])
    .limit(20)
    .get();
  const results = await Promise.allSettled(
    docs.docs.map((doc) => processDeletion(doc.id, cancelBilling)),
  );
  if (results.some((result) => result.status === 'rejected'))
    throw new Error('Some deletion jobs require another retry');
}
