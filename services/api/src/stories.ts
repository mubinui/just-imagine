import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db, localDevelopment, type ContentEditions } from '@just-imagine/server-core';
import {
  ChildDocSchema,
  UserDocSchema,
  PLAN_LIMITS,
  UsageDailyDocSchema,
  paths,
  yyyymmdd,
  languageOf,
  storyPreferencesOf,
  StoryDocSchema,
  CreateStorySchema,
  UpdateStoryProgressSchema,
  DocumentIdSchema,
  type StoryDoc,
  type StoryBuildJob,
  LanguageSchema,
  contentTexts,
  textUsesLanguage,
} from '@just-imagine/protocol';
import { ApiFault } from './errors';

const missing = () => new ApiFault(404, 'NOT_FOUND', 'This story is no longer available.');
export class FirestoreStoryStore {
  constructor(private deliver?: (job: StoryBuildJob) => Promise<void>) {}
  private async owned(uid: string, storyId: string) {
    return db().runTransaction(async (tx) => {
      const ref = db().doc(`stories/${DocumentIdSchema.parse(storyId)}`);
      const story = await tx.get(ref);
      if (!story.exists || story.data()?.['ownerUid'] !== uid) throw missing();
      const value = StoryDocSchema.parse(story.data());
      await this.family(tx, uid, value.childId);
      return value;
    });
  }
  private async family(tx: FirebaseFirestore.Transaction, uid: string, childId: string) {
    const [user, child, lock, childLock] = await Promise.all([
      tx.get(db().doc(paths.user(uid))),
      tx.get(db().doc(paths.child(uid, childId))),
      tx.get(db().doc(`deletionLocks/${uid}`)),
      tx.get(db().doc(`users/${uid}/deletionLocks/${childId}`)),
    ]);
    if (
      !user.exists ||
      !UserDocSchema.parse(user.data()).consentAt ||
      lock.exists ||
      childLock.exists ||
      !child.exists
    )
      throw missing();
    return { user: UserDocSchema.parse(user.data()), child: ChildDocSchema.parse(child.data()) };
  }
  private task(job: StoryBuildJob) {
    return {
      uid: job.uid,
      childId: job.childId,
      payload: job,
      state: 'queued',
      attempts: 0,
      nextAt: Date.now(),
      leaseUntil: 0,
    };
  }
  async create(uid: string, childId: string, raw: unknown): Promise<StoryDoc> {
    const body = CreateStorySchema.parse(raw);
    if (!localDevelopment() && !this.deliver)
      throw new ApiFault(503, 'INTERNAL', 'Story generation is not configured yet.');
    const id = `story_${createHash('sha256')
      .update(JSON.stringify([uid, childId, body.requestId]))
      .digest('hex')
      .slice(0, 40)}`;
    const job: StoryBuildJob = { kind: 'story', jobId: `${id}_0`, storyId: id, uid, childId };
    const value = await db().runTransaction(async (tx) => {
      const { user, child } = await this.family(tx, uid, childId);
      const ref = db().doc(`stories/${id}`);
      const [old, deleted] = await Promise.all([
        tx.get(ref),
        tx.get(db().doc(`storyDeletionLocks/${id}`)),
      ]);
      if (deleted.exists) throw missing();
      if (old.exists) {
        const previous = StoryDocSchema.parse(old.data());
        if (previous.topic !== body.topic)
          throw new ApiFault(400, 'INVALID_ARGUMENT', 'Use a new request for a different topic.');
        return previous;
      }
      const date = yyyymmdd(new Date()),
        usageRef = db().doc(paths.usageDaily(uid, date));
      const [usage, books] = await Promise.all([
        tx.get(usageRef),
        tx.get(db().collection('stories').where('ownerUid', '==', uid)),
      ]);
      const used = UsageDailyDocSchema.parse(
        usage.exists ? usage.data() : { uid, date, voiceSeconds: 0, worlds: 0, images: 0 },
      );
      const limits = PLAN_LIMITS[user.plan];
      if (used.worlds >= limits.worldsPerDay || books.size >= limits.savedWorlds)
        throw new ApiFault(
          429,
          'QUOTA_EXHAUSTED',
          'Your family’s creation allowance is used. Try another day or read a saved story.',
        );
      const next = StoryDocSchema.parse({
        id,
        ownerUid: uid,
        childId,
        topic: body.topic,
        generationId: job.jobId,
        language: languageOf(child),
        ageBand: child.ageBand,
        preferences: storyPreferencesOf(child),
        status: 'queued',
        manuscript: null,
        images: {},
        progress: { scene: 0, beat: 0, choices: {}, completed: false },
        revision: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      tx.create(ref, next);
      tx.set(usageRef, { ...used, worlds: used.worlds + 1 });
      if (localDevelopment()) tx.create(db().doc(`localBuildTasks/${job.jobId}`), this.task(job));
      return next;
    });
    if (!localDevelopment() && value.status === 'queued') await this.deliver!(job);
    return value;
  }
  get = (uid: string, id: string) => this.owned(uid, id);
  async list(uid: string, childId: string) {
    return db().runTransaction(async (tx) => {
      await this.family(tx, uid, childId);
      const all = await tx.get(
        db().collection('stories').where('ownerUid', '==', uid).where('childId', '==', childId),
      );
      return {
        stories: all.docs
          .map((d) => StoryDocSchema.parse(d.data()))
          .sort((a, b) => b.createdAt - a.createdAt),
      };
    });
  }
  async update(uid: string, id: string, raw: unknown) {
    const body = UpdateStoryProgressSchema.parse(raw);
    return db().runTransaction(async (tx) => {
      const ref = db().doc(`stories/${id}`),
        snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.['ownerUid'] !== uid) throw missing();
      const book = StoryDocSchema.parse(snap.data());
      await this.family(tx, uid, book.childId);
      if (body.revision !== book.revision)
        throw new ApiFault(
          409,
          'INVALID_ARGUMENT',
          'This story changed in another window. Reload it before continuing.',
        );
      const scenes = book.manuscript?.scenes;
      if (!scenes || !scenes[body.progress.scene]?.beats[body.progress.beat])
        throw new ApiFault(400, 'INVALID_ARGUMENT', 'Choose an available story page.');
      for (const [sceneId, choice] of Object.entries(body.progress.choices))
        if (!scenes.find((s) => s.id === sceneId)?.choices.some((c) => c.id === choice))
          throw new ApiFault(400, 'INVALID_ARGUMENT', 'Choose an answer from this story.');
      if (
        body.progress.completed &&
        (body.progress.scene !== scenes.length - 1 ||
          body.progress.beat !== scenes.at(-1)!.beats.length - 1 ||
          scenes.some((s) => !body.progress.choices[s.id]))
      )
        throw new ApiFault(
          400,
          'INVALID_ARGUMENT',
          'Finish the story’s passages and choices before marking its ending.',
        );
      const next = {
        ...book,
        progress: body.progress,
        revision: book.revision + 1,
        updatedAt: Date.now(),
      };
      tx.set(ref, next);
      return next;
    });
  }
  async retry(uid: string, id: string) {
    const job = await db().runTransaction(async (tx) => {
      const ref = db().doc(`stories/${id}`),
        snap = await tx.get(ref);
      if (!snap.exists || snap.data()?.['ownerUid'] !== uid) throw missing();
      const book = StoryDocSchema.parse(snap.data());
      await this.family(tx, uid, book.childId);
      // Only terminal failures can enqueue a new attempt; polling/repeated clicks cannot duplicate work.
      if (book.status === 'queued')
        return {
          kind: 'story' as const,
          jobId: book.generationId,
          storyId: id,
          uid,
          childId: book.childId,
        };
      if (book.status !== 'failed') return undefined;
      if (!book.canRetry)
        throw new ApiFault(
          400,
          'INVALID_ARGUMENT',
          'This story reached its retry allowance. Your saved pages can still be read.',
        );
      const revision = book.revision + 1;
      const job: StoryBuildJob = {
        kind: 'story',
        jobId: `${id}_${revision}`,
        storyId: id,
        uid,
        childId: book.childId,
      };
      tx.update(ref, {
        status: 'queued',
        generationId: job.jobId,
        error: '',
        revision,
        updatedAt: Date.now(),
      });
      if (localDevelopment()) tx.create(db().doc(`localBuildTasks/${job.jobId}`), this.task(job));
      return job;
    });
    if (job && !localDevelopment()) {
      if (!this.deliver) throw new ApiFault(503, 'INTERNAL', 'Story generation is unavailable.');
      await this.deliver(job);
    }
    return this.get(uid, id);
  }
  async delete(uid: string, id: string) {
    const book = await this.owned(uid, id);
    await db().runTransaction(async (tx) => {
      await this.family(tx, uid, book.childId);
      // A permanent tombstone fences late image/text writes and redelivery.
      tx.set(db().doc(`storyDeletionLocks/${id}`), {
        uid,
        childId: book.childId,
        createdAt: Date.now(),
      });
      tx.delete(db().doc(`stories/${id}`));
    });
    await db().recursiveDelete(db().doc(`stories/${id}`));
  }
}
export function storyRoutes(
  app: FastifyInstance,
  store: FirestoreStoryStore,
  editions?: ContentEditions,
) {
  const child = (p: unknown) => z.object({ childId: DocumentIdSchema }).parse(p).childId;
  const story = (p: unknown) => z.object({ storyId: DocumentIdSchema }).parse(p).storyId;
  const localize = async (uid: string, header: unknown, value: StoryDoc): Promise<StoryDoc> => {
    if (header === undefined) return value;
    const language = LanguageSchema.parse(header);
    if (!editions) {
      if (contentTexts('story', value).every((entry) => textUsesLanguage(entry.text, language)))
        return { ...value, language };
      throw new ApiFault(
        503,
        'INTERNAL',
        'This language edition is not ready. Please try again shortly.',
      );
    }
    try {
      const translated = await editions.apply(
        { uid, childId: value.childId, kind: 'story', path: `stories/${value.id}` },
        language,
        value,
      );
      return StoryDocSchema.parse({ ...translated, language });
    } catch {
      throw new ApiFault(
        503,
        'INTERNAL',
        'This language edition is not ready. Please try again shortly.',
      );
    }
  };
  app.post('/v1/children/:childId/stories', async (req) =>
    localize(
      req.parentUid,
      req.headers['x-app-language'],
      await store.create(req.parentUid, child(req.params), req.body),
    ),
  );
  app.get('/v1/children/:childId/stories', async (req) => {
    const result = await store.list(req.parentUid, child(req.params));
    return {
      stories: await Promise.all(
        result.stories.map((value) =>
          localize(req.parentUid, req.headers['x-app-language'], value),
        ),
      ),
    };
  });
  app.get('/v1/stories/:storyId', async (req) =>
    localize(
      req.parentUid,
      req.headers['x-app-language'],
      await store.get(req.parentUid, story(req.params)),
    ),
  );
  app.patch('/v1/stories/:storyId', async (req) =>
    localize(
      req.parentUid,
      req.headers['x-app-language'],
      await store.update(req.parentUid, story(req.params), req.body),
    ),
  );
  app.post('/v1/stories/:storyId/retry', async (req) =>
    localize(
      req.parentUid,
      req.headers['x-app-language'],
      await store.retry(req.parentUid, story(req.params)),
    ),
  );
  app.delete('/v1/stories/:storyId', async (req, reply) => {
    await store.delete(req.parentUid, story(req.params));
    return reply.status(204).send();
  });
}
