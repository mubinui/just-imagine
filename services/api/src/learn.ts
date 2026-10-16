import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ADVENTURES, storyChapter } from '@just-imagine/learning-content';
import {
  ChildDocSchema,
  DocumentIdSchema,
  LEARN_ROUTES,
  LearnProgressDocSchema,
  UserDocSchema,
  learnPaths,
  paths,
  petsOf,
  pointsOf,
  type LearnSummaryResponse,
  AdventureProgressSchema,
  CompleteChapterSchema,
  adventurePaths,
  type AdventureProgress,
} from '@just-imagine/protocol';
import { db, readDoc } from '@just-imagine/server-core';
import { ApiFault } from './errors';

// Learning Worlds (spec 6b): points, pets and pack progress for the child's Learn Map and the
// parent dashboard. Read-only by design: only the gateway writes points, after it has checked a
// challenge against its authored maximum.
export interface LearnStore {
  summary(uid: string, childId: string): Promise<LearnSummaryResponse>;
  adventures?(uid: string, childId: string): Promise<{ progress: AdventureProgress[] }>;
  completeChapter?(
    uid: string,
    childId: string,
    packId: string,
    chapterId: string,
  ): Promise<AdventureProgress>;
}

const missing = () => new ApiFault(404, 'NOT_FOUND', 'This item is no longer available.');

export class FirestoreLearnStore implements LearnStore {
  async adventures(uid: string, childId: string): Promise<{ progress: AdventureProgress[] }> {
    return db().runTransaction(async (tx) => {
      const [lock, childLock, user, child, progress] = await Promise.all([
        tx.get(db().doc(`deletionLocks/${uid}`)),
        tx.get(db().doc(`users/${uid}/deletionLocks/${childId}`)),
        tx.get(db().doc(paths.user(uid))),
        tx.get(db().doc(paths.child(uid, childId))),
        tx.get(db().collection(adventurePaths.all(uid, childId))),
      ]);
      if (lock.exists || !user.exists || !UserDocSchema.parse(user.data()).consentAt)
        throw new ApiFault(403, 'FORBIDDEN', 'Complete parent sign-up first.');
      if (childLock.exists || !child.exists) throw missing();
      return {
        progress: progress.docs
          .map((d) => AdventureProgressSchema.parse(d.data()))
          .filter((p) => Object.hasOwn(ADVENTURES, p.packId)),
      };
    });
  }
  async completeChapter(
    uid: string,
    childId: string,
    packId: string,
    chapterId: string,
  ): Promise<AdventureProgress> {
    if (!storyChapter(packId, chapterId))
      throw new ApiFault(400, 'INVALID_ARGUMENT', 'Choose a chapter from this adventure.');
    return db().runTransaction(async (tx) => {
      const ref = db().doc(adventurePaths.pack(uid, childId, packId));
      const [lock, childLock, user, child, previous] = await Promise.all([
        tx.get(db().doc(`deletionLocks/${uid}`)),
        tx.get(db().doc(`users/${uid}/deletionLocks/${childId}`)),
        tx.get(db().doc(paths.user(uid))),
        tx.get(db().doc(paths.child(uid, childId))),
        tx.get(ref),
      ]);
      if (lock.exists || !user.exists || !UserDocSchema.parse(user.data()).consentAt)
        throw new ApiFault(403, 'FORBIDDEN', 'Complete parent sign-up first.');
      if (childLock.exists || !child.exists) throw missing();
      const old = previous.exists ? AdventureProgressSchema.parse(previous.data()) : undefined;
      if (old?.chaptersDone.includes(chapterId)) return old;
      const chaptersDone = [...(old?.chaptersDone ?? []), chapterId];
      const next = AdventureProgressSchema.parse({ packId, chaptersDone, updatedAt: Date.now() });
      tx.set(ref, next);
      return next;
    });
  }
  async summary(uid: string, childId: string): Promise<LearnSummaryResponse> {
    const [userLock, childLock] = await Promise.all([
      db().doc(`deletionLocks/${uid}`).get(),
      db().doc(`users/${uid}/deletionLocks/${childId}`).get(),
    ]);
    if (userLock.exists)
      throw new ApiFault(403, 'FORBIDDEN', 'This item is not available to this account.');
    if (childLock.exists) throw missing();
    const user = await readDoc(paths.user(uid), UserDocSchema);
    if (!user?.consentAt) throw new ApiFault(403, 'FORBIDDEN', 'Complete parent sign-up first.');
    const child = await readDoc(paths.child(uid, childId), ChildDocSchema);
    if (!child) throw missing();
    const progress = await db().collection(learnPaths.progressAll(uid, childId)).get();
    return {
      points: pointsOf(child),
      pets: petsOf(child),
      progress: progress.docs
        .map((doc) => LearnProgressDocSchema.parse(doc.data()))
        .sort((a, b) => a.packId.localeCompare(b.packId)),
    };
  }
}

/** Registers the Learning Worlds routes inside the api's authenticated scope. */
export function learnRoutes(routes: FastifyInstance, store: LearnStore) {
  if (store.adventures && store.completeChapter) {
    const params = (raw: unknown) =>
      z.object({ childId: DocumentIdSchema, packId: DocumentIdSchema.optional() }).parse(raw);
    routes.get('/v1/children/:childId/adventures', (req) =>
      store.adventures!(req.parentUid, params(req.params).childId),
    );
    routes.post('/v1/children/:childId/adventures/:packId', (req) => {
      const p = params(req.params),
        body = CompleteChapterSchema.parse(req.body);
      return store.completeChapter!(req.parentUid, p.childId, p.packId!, body.chapterId);
    });
  }
  routes.get(LEARN_ROUTES.summary.path, (req) =>
    store.summary(
      req.parentUid,
      DocumentIdSchema.parse(z.record(z.string(), z.unknown()).parse(req.params)['childId']),
    ),
  );
}
