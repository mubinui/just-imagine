import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { WorldPackSchema } from '@just-imagine/learning-content';
import { publicLearningPack } from '@just-imagine/learning-content/public';
import {
  CatalogEntryDocSchema,
  ChildDocSchema,
  DocumentIdSchema,
  UserDocSchema,
  WorldDocSchema,
  languageOf,
  paths,
} from '@just-imagine/protocol';
import { db, newId, transaction } from '@just-imagine/server-core';
import { ApiFault } from './errors';

const unavailable = () =>
  new ApiFault(404, 'NOT_FOUND', 'This published world is no longer available.');
export class FirestoreCatalogStore {
  private async child(uid: string, childId: string) {
    const [user, child, lock, childLock] = await Promise.all([
      db().doc(paths.user(uid)).get(),
      db().doc(paths.child(uid, childId)).get(),
      db().doc(`deletionLocks/${uid}`).get(),
      db().doc(`users/${uid}/deletionLocks/${childId}`).get(),
    ]);
    if (
      lock.exists ||
      childLock.exists ||
      !child.exists ||
      !user.exists ||
      !UserDocSchema.parse(user.data()).consentAt
    )
      throw unavailable();
    return ChildDocSchema.parse(child.data());
  }
  async list(uid: string, childId: string) {
    const child = await this.child(uid, childId);
    const entries = await db()
      .collection('catalog')
      .where('status', '==', 'published')
      .limit(100)
      .get();
    const worlds: {
      id: string;
      title: { en: string; bn: string };
      thumbnailUrl: string | null;
      concepts: string[];
    }[] = [];
    const packs: ReturnType<typeof publicLearningPack>[] = [];
    for (const snapshot of entries.docs) {
      const parsed = CatalogEntryDocSchema.safeParse(snapshot.data());
      if (!parsed.success || !parsed.data.ageBands.includes(child.ageBand)) continue;
      const entry = parsed.data;
      if (entry.kind === 'storyPack') {
        const pack = WorldPackSchema.safeParse(entry.pack);
        if (pack.success && /^catalog_[a-z0-9_]+$/.test(pack.data.id))
          packs.push(publicLearningPack(pack.data));
      } else if (entry.worldId) {
        const [source, lock] = await Promise.all([
          db().doc(paths.world(entry.worldId)).get(),
          db().doc(`worldDeletionLocks/${entry.worldId}`).get(),
        ]);
        const world = WorldDocSchema.safeParse(source.data());
        if (
          !lock.exists &&
          !source.data()?.['hidden'] &&
          world.success &&
          world.data.status === 'ready'
        )
          worlds.push({
            id: snapshot.id,
            title: entry.title,
            thumbnailUrl: world.data.thumbnailUrl,
            concepts: world.data.concepts,
          });
      }
    }
    return { worlds, packs };
  }
  async open(uid: string, childId: string, entryId: string) {
    const worldId = newId('w');
    return transaction(async (tx) => {
      const [user, child, lock, childLock, published, previous] = await Promise.all([
        tx.get(db().doc(paths.user(uid))),
        tx.get(db().doc(paths.child(uid, childId))),
        tx.get(db().doc(`deletionLocks/${uid}`)),
        tx.get(db().doc(`users/${uid}/deletionLocks/${childId}`)),
        tx.get(db().doc(`catalog/${entryId}`)),
        tx.get(db().doc(`users/${uid}/children/${childId}/catalogWorlds/${entryId}`)),
      ]);
      if (
        lock.exists ||
        childLock.exists ||
        !child.exists ||
        !user.exists ||
        !UserDocSchema.parse(user.data()).consentAt ||
        !published.exists
      )
        throw unavailable();
      const profile = ChildDocSchema.parse(child.data()),
        entry = CatalogEntryDocSchema.parse(published.data());
      if (
        entry.kind !== 'world' ||
        entry.status !== 'published' ||
        !entry.ageBands.includes(profile.ageBand) ||
        !entry.worldId
      )
        throw unavailable();
      const [source, sourceLock] = await Promise.all([
        tx.get(db().doc(paths.world(entry.worldId))),
        tx.get(db().doc(`worldDeletionLocks/${entry.worldId}`)),
      ]);
      if (!source.exists || sourceLock.exists || source.data()?.['hidden']) throw unavailable();
      const original = WorldDocSchema.parse(source.data());
      if (original.status !== 'ready') throw unavailable();
      const priorId = previous.data()?.['worldId'];
      if (typeof priorId === 'string') {
        const [prior, priorLock] = await Promise.all([
          tx.get(db().doc(paths.world(priorId))),
          tx.get(db().doc(`worldDeletionLocks/${priorId}`)),
        ]);
        if (priorLock.exists || prior.data()?.['hidden']) throw unavailable();
        if (
          prior.exists &&
          prior.data()?.['ownerUid'] === uid &&
          prior.data()?.['childId'] === childId
        )
          return { worldId: priorId };
      }
      // Explicit fields prevent private wish history, revisions, child IDs and job IDs
      // from the source family following the published scene into another account.
      const copy = WorldDocSchema.parse({
        ownerUid: uid,
        childId,
        title: entry.title[languageOf(profile)],
        status: 'ready',
        doc: { ...structuredClone(original.doc), worldId },
        schemaVersion: 1,
        promptVersion: original.promptVersion,
        styleVersion: original.styleVersion,
        assets: original.assets,
        concepts: original.concepts,
        thumbnailUrl: original.thumbnailUrl,
        jobId: newId('j'),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      tx.create(db().doc(paths.world(worldId)), copy);
      tx.set(db().doc(`users/${uid}/children/${childId}/catalogWorlds/${entryId}`), { worldId });
      return { worldId };
    });
  }
}

/** Registers inside the existing authenticated, consented family scope. */
export function catalogRoutes(routes: FastifyInstance, store = new FirestoreCatalogStore()) {
  const params = (input: unknown) =>
    z.object({ childId: DocumentIdSchema, entryId: DocumentIdSchema.optional() }).parse(input);
  routes.get('/v1/children/:childId/catalog', (request) =>
    store.list(request.parentUid, params(request.params).childId),
  );
  routes.post('/v1/children/:childId/catalog/:entryId/open', (request) => {
    const parsed = params(request.params);
    return store.open(request.parentUid, parsed.childId, parsed.entryId!);
  });
}
