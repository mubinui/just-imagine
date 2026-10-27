import type { ByeReason } from './contracts';
import { createHash, randomUUID } from 'node:crypto';
import { CloudTasksClient } from '@google-cloud/tasks';
import { z } from 'zod';
import { PACKS, WorldPackSchema } from '@just-imagine/learning-content';
import {
  ChildDocSchema,
  CatalogEntryDocSchema,
  StoryDocSchema,
  UserDocSchema,
  WorldDocSchema,
  SessionDocSchema,
  DiscoveryDocSchema,
  conceptCard,
  languageOf,
  contentTexts,
  textUsesLanguage,
  paths,
  UsageDailyDocSchema,
  PLAN_LIMITS,
  yyyymmdd,
  type BuilderJob,
  type WorldDoc,
  LearnProgressDocSchema,
  learnPaths,
  petsOf,
  pointsOf,
} from '@just-imagine/protocol';
import { ConceptSchema, findBlockedTerm } from '@just-imagine/scene-schema';
import {
  db,
  ContentEditions,
  localDevelopment,
  requireParent,
  readDoc,
  voiceSecondsLeft,
  reserveWorld,
  isKillSwitchOn,
  transaction,
} from '@just-imagine/server-core';
import type { SessionStore, SessionRecord, Identity, PointsAward } from './contracts';
import { petsUnlocked, ToolRefusal } from './learn';
export class FirestoreSessionStore implements SessionStore {
  private owner = randomUUID();
  private tasks = new CloudTasksClient();
  constructor(
    private queue: { project: string; queue: string; builderUrl: string; serviceAccount: string },
  ) {}
  async learningPacks(identity: Identity) {
    const published = await db()
      .collection('catalog')
      .where('status', '==', 'published')
      .limit(100)
      .get();
    return published.docs.flatMap((snapshot) => {
      const entry = CatalogEntryDocSchema.safeParse(snapshot.data());
      if (
        !entry.success ||
        entry.data.kind !== 'storyPack' ||
        !entry.data.ageBands.includes(identity.child.ageBand)
      )
        return [];
      const pack = WorldPackSchema.safeParse(entry.data.pack);
      return pack.success &&
        /^catalog_[a-z0-9_]+$/.test(pack.data.id) &&
        !Object.hasOwn(PACKS, pack.data.id)
        ? [pack.data]
        : [];
    });
  }
  private lock(record: SessionRecord) {
    return db().doc(
      `sessionLocks/${createHash('sha256')
        .update(JSON.stringify([record.identity.uid, record.identity.childId]))
        .digest('hex')}`,
    );
  }
  async authorize(token: string, childId: string): Promise<Identity> {
    const { uid } = await requireParent(token);
    const [user, child, deleting, childDeleting] = await Promise.all([
      readDoc(paths.user(uid), UserDocSchema),
      readDoc(paths.child(uid, childId), ChildDocSchema),
      db().doc(`deletionLocks/${uid}`).get(),
      db().doc(`users/${uid}/deletionLocks/${childId}`).get(),
    ]);
    if (!user?.consentAt || !child || deleting.exists || childDeleting.exists)
      throw new Error('FORBIDDEN');
    return {
      uid,
      childId,
      child,
      plan: user.plan,
      remaining: await voiceSecondsLeft(uid, user.plan),
    };
  }
  async claim(record: SessionRecord) {
    const { uid, childId } = record.identity;
    await transaction(async (tx) => {
      const [lock, userDelete, childDelete, child] = await Promise.all([
        tx.get(this.lock(record)),
        tx.get(db().doc(`deletionLocks/${uid}`)),
        tx.get(db().doc(`users/${uid}/deletionLocks/${childId}`)),
        tx.get(db().doc(paths.child(uid, childId))),
      ]);
      if (userDelete.exists || childDelete.exists || !child.exists) throw new Error('FORBIDDEN');
      if ((lock.data()?.['expiresAt'] ?? 0) > Date.now())
        throw new Error('SESSION_ACTIVE_ELSEWHERE');
      tx.set(this.lock(record), {
        sessionId: record.id,
        owner: this.owner,
        expiresAt: Date.now() + 65000,
      });
      tx.create(
        db().doc(paths.session(record.id)),
        SessionDocSchema.parse({
          uid,
          childId,
          characterIds: [record.characterId],
          worldIds: record.worldId ? [record.worldId] : [],
          startedAt: record.startedAt,
          endedAt: null,
          voiceSeconds: 0,
          turns: 0,
          beats: 0,
          summary: null,
          discoveries: [],
          predictions: [],
          endReason: null,
          active: true,
        }),
      );
    });
  }
  async meter(record: SessionRecord, totalSeconds: number) {
    if (!Number.isSafeInteger(totalSeconds) || totalSeconds < 0)
      throw new Error('Invalid metering checkpoint');
    const { uid, childId } = record.identity,
      date = yyyymmdd(new Date()),
      usageRef = db().doc(paths.usageDaily(uid, date));
    return transaction(async (tx) => {
      const [lock, userDelete, childDelete, session, usageSnap] = await Promise.all([
        tx.get(this.lock(record)),
        tx.get(db().doc(`deletionLocks/${uid}`)),
        tx.get(db().doc(`users/${uid}/deletionLocks/${childId}`)),
        tx.get(db().doc(paths.session(record.id))),
        tx.get(usageRef),
      ]);
      if (
        lock.data()?.['sessionId'] !== record.id ||
        lock.data()?.['owner'] !== this.owner ||
        userDelete.exists ||
        childDelete.exists ||
        !session.exists
      )
        throw new Error('FORBIDDEN');
      const current = SessionDocSchema.parse(session.data());
      const usage = UsageDailyDocSchema.parse(
        usageSnap.exists ? usageSnap.data() : { uid, date, voiceSeconds: 0, worlds: 0, images: 0 },
      );
      if (usage.uid !== uid || usage.date !== date) throw new Error('Usage identity mismatch');
      const delta = Math.max(0, totalSeconds - current.voiceSeconds);
      tx.update(this.lock(record), { expiresAt: Date.now() + 65000 });
      tx.set(session.ref, {
        ...current,
        ...record.stats,
        voiceSeconds: Math.max(current.voiceSeconds, totalSeconds),
        characterIds: [...new Set([...current.characterIds, record.characterId])],
        worldIds: [...new Set([...current.worldIds, ...(record.worldId ? [record.worldId] : [])])],
      });
      tx.set(usageRef, { ...usage, voiceSeconds: usage.voiceSeconds + delta });
      return PLAN_LIMITS[record.identity.plan].voiceSecondsPerDay - usage.voiceSeconds - delta;
    });
  }
  async release(record: SessionRecord) {
    await transaction(async (tx) => {
      const lock = await tx.get(this.lock(record));
      if (lock.data()?.['sessionId'] === record.id && lock.data()?.['owner'] === this.owner)
        tx.delete(lock.ref);
    });
  }
  async finish(record: SessionRecord, summary: string, reason: ByeReason) {
    const { uid, childId } = record.identity;
    await transaction(async (tx) => {
      const [lock, userDelete, childDelete, session, child] = await Promise.all([
        tx.get(this.lock(record)),
        tx.get(db().doc(`deletionLocks/${uid}`)),
        tx.get(db().doc(`users/${uid}/deletionLocks/${childId}`)),
        tx.get(db().doc(paths.session(record.id))),
        tx.get(db().doc(paths.child(uid, childId))),
      ]);
      if (lock.data()?.['sessionId'] === record.id) tx.delete(this.lock(record));
      if (userDelete.exists || childDelete.exists || !session.exists) return;
      const current = SessionDocSchema.parse(session.data());
      if (!current.active) return;
      if (child.exists && (record.completedLoops ?? 0) > 0) {
        const profile = ChildDocSchema.parse(child.data()),
          loops = profile.loopsCompleted + (record.completedLoops ?? 0),
          increase = 2 * (Math.floor(loops / 3) - Math.floor(profile.loopsCompleted / 3));
        tx.set(child.ref, {
          ...profile,
          loopsCompleted: loops,
          sessionTargetMinutes: Math.min(20, profile.sessionTargetMinutes + increase),
        });
      }
      tx.set(session.ref, {
        ...current,
        ...record.stats,
        summary: summary.slice(0, 1500),
        endedAt: Date.now(),
        endReason: reason,
        active: false,
      });
    });
  }
  killSwitch = isKillSwitchOn;
  async world(record: SessionRecord, id: string) {
    if ((await db().doc(`worldDeletionLocks/${id}`).get()).exists) throw new Error('FORBIDDEN');
    const world = await readDoc(paths.world(id), WorldDocSchema);
    if (
      !world ||
      world.ownerUid !== record.identity.uid ||
      world.childId !== record.identity.childId
    )
      throw new Error('FORBIDDEN');
    const translated = await new ContentEditions().cached(
      {
        kind: 'world',
        path: paths.world(id),
        uid: record.identity.uid,
        childId: record.identity.childId,
      },
      languageOf(record.identity.child),
      world,
    );
    return translated ?? world;
  }
  async story(record: SessionRecord, id: string) {
    const { uid, childId } = record.identity;
    const [book, user, child, ud, cd, sd] = await Promise.all([
      db().doc(`stories/${id}`).get(),
      db().doc(paths.user(uid)).get(),
      db().doc(paths.child(uid, childId)).get(),
      db().doc(`deletionLocks/${uid}`).get(),
      db().doc(`users/${uid}/deletionLocks/${childId}`).get(),
      db().doc(`storyDeletionLocks/${id}`).get(),
    ]);
    if (!book.exists || !user.exists || !child.exists || ud.exists || cd.exists || sd.exists)
      throw new Error('FORBIDDEN');
    const value = StoryDocSchema.parse(book.data());
    if (value.ownerUid !== uid || value.childId !== childId || !value.manuscript)
      throw new Error('FORBIDDEN');
    const language = languageOf(record.identity.child);
    const translated = await new ContentEditions().cached(
      { kind: 'story', path: `stories/${id}`, uid, childId },
      language,
      value,
    );
    if (translated) return { ...translated, language };
    if (contentTexts('story', value).every((entry) => textUsesLanguage(entry.text, language)))
      return { ...value, language };
    throw new Error('Open this story in the selected language before calling Katha.');
  }
  async enqueue(job: BuilderJob) {
    if (await isKillSwitchOn()) throw new Error('KILL_SWITCH');
    if (job.kind === 'build') await reserveWorld(job.uid, job.plan);
    if (localDevelopment()) {
      const ref = db().doc(`localBuildTasks/${job.jobId}`);
      await transaction(async (tx) => {
        const [task, deleting, childDeleting] = await Promise.all([
          tx.get(ref),
          tx.get(db().doc(`deletionLocks/${job.uid}`)),
          tx.get(db().doc(`users/${job.uid}/deletionLocks/${job.childId}`)),
        ]);
        if (deleting.exists || childDeleting.exists) throw new Error('FORBIDDEN');
        if (!task.exists)
          tx.create(ref, {
            uid: job.uid,
            childId: job.childId,
            worldId: job.worldId,
            payload: JSON.parse(JSON.stringify(job)),
            state: 'queued',
            attempts: 0,
            nextAt: Date.now(),
            leaseUntil: 0,
          });
      });
      return;
    }
    const parent = this.tasks.queuePath(this.queue.project, 'us-central1', this.queue.queue);
    await this.tasks.createTask({
      parent,
      task: {
        name: `${parent}/tasks/${job.jobId}`,
        dispatchDeadline: { seconds: 900 },
        httpRequest: {
          httpMethod: 'POST',
          url: `${this.queue.builderUrl}/jobs`,
          headers: { 'content-type': 'application/json' },
          body: Buffer.from(JSON.stringify(job)),
          oidcToken: {
            serviceAccountEmail: this.queue.serviceAccount,
            audience: this.queue.builderUrl,
          },
        },
      },
    });
  }
  async discover(record: SessionRecord, rawConcept: string, explanation: string) {
    const concept = ConceptSchema.parse(rawConcept);
    z.string().min(1).max(200).parse(explanation);
    if (findBlockedTerm(explanation)) throw new Error('Unsafe discovery');
    if (!record.worldId) throw new Error('No world');
    const world = await this.world(record, record.worldId);
    if (!world.concepts.includes(concept)) throw new Error('Concept absent from world');
    const card = conceptCard(concept);
    const { uid, childId } = record.identity;
    await transaction(async (tx) => {
      const ref = db().doc(paths.discovery(uid, childId, concept));
      const [snap, parentDelete, childDelete] = await Promise.all([
        tx.get(ref),
        tx.get(db().doc(`deletionLocks/${uid}`)),
        tx.get(db().doc(`users/${uid}/deletionLocks/${childId}`)),
      ]);
      if (parentDelete.exists || childDelete.exists) throw new Error('FORBIDDEN');
      const prior = snap.exists ? DiscoveryDocSchema.parse(snap.data()) : null;
      if (prior?.worldIds.includes(record.worldId!)) return;
      tx.set(
        ref,
        DiscoveryDocSchema.parse({
          concept,
          firstAt: prior?.firstAt ?? Date.now(),
          count: (prior?.count ?? 0) + 1,
          worldIds: [...(prior?.worldIds ?? []), record.worldId],
          title: card.title,
          kidExplanation: explanation,
          realLifeNote: card.realLifeNote,
        }),
      );
    });
    return {
      type: 'discovery' as const,
      concept,
      title: card.title,
      kidExplanation: explanation,
      realLifeNote: card.realLifeNote,
    };
  }
  // The gateway has already checked the challenge, its maximum and once-per-session; this adds the
  // points to the profile, unlocks pets and records the pack's progress in one transaction.
  async awardPoints(record: SessionRecord, award: PointsAward) {
    const { uid, childId } = record.identity;
    const childRef = db().doc(paths.child(uid, childId)),
      progressRef = db().doc(learnPaths.progress(uid, childId, award.packId));
    return transaction(async (tx) => {
      const [userDelete, childDelete, child, progress] = await Promise.all([
        tx.get(db().doc(`deletionLocks/${uid}`)),
        tx.get(db().doc(`users/${uid}/deletionLocks/${childId}`)),
        tx.get(childRef),
        tx.get(progressRef),
      ]);
      if (userDelete.exists || childDelete.exists || !child.exists) throw new Error('FORBIDDEN');
      const profile = ChildDocSchema.parse(child.data()),
        total = pointsOf(profile) + award.points,
        unlocked = petsUnlocked(petsOf(profile), total, award.petReward);
      const prior = progress.exists ? LearnProgressDocSchema.parse(progress.data()) : undefined;
      if (prior?.challengesDone.includes(award.challengeId))
        throw new ToolRefusal('This challenge has already earned points. Try another one.');
      tx.set(childRef, { ...profile, points: total, pets: [...petsOf(profile), ...unlocked] });
      tx.set(
        progressRef,
        LearnProgressDocSchema.parse({
          packId: award.packId,
          challengesDone: [...new Set([...(prior?.challengesDone ?? []), award.challengeId])],
          updatedAt: Date.now(),
        }),
      );
      return { total, unlocked };
    });
  }
  watchJob(
    id: string,
    callback: (status: string, detail?: { fallbackReason?: 'template' | 'sample' }) => void,
  ) {
    return db()
      .doc(`builderJobs/${id}`)
      .onSnapshot(
        (snap) => {
          const data = snap.data();
          const status = data?.['status'];
          const reason = data?.['fallbackReason'];
          if (typeof status !== 'string') return;
          if (reason === 'template' || reason === 'sample')
            callback(status, { fallbackReason: reason });
          else callback(status);
        },
        () => {},
      );
  }
  watchWorld(id: string, callback: (world: WorldDoc) => void) {
    return db()
      .doc(paths.world(id))
      .onSnapshot(
        (snap) => {
          const world = WorldDocSchema.safeParse(snap.data());
          if (world.success) callback(world.data);
        },
        () => {},
      );
  }
}
