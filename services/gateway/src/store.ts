import type { ByeReason } from './contracts';
import { createHash, randomUUID } from 'node:crypto';
import { CloudTasksClient } from '@google-cloud/tasks';
import { z } from 'zod';
import {
  ChildDocSchema,
  UserDocSchema,
  WorldDocSchema,
  SessionDocSchema,
  DiscoveryDocSchema,
  conceptCard,
  paths,
  UsageDailyDocSchema,
  PLAN_LIMITS,
  yyyymmdd,
  type BuilderJob,
  type WorldDoc,
} from '@just-imagine/protocol';
import { ConceptSchema, findBlockedTerm } from '@just-imagine/scene-schema';
import {
  db,
  verifyIdToken,
  readDoc,
  voiceSecondsLeft,
  reserveWorld,
  isKillSwitchOn,
} from '@just-imagine/server-core';
import type { SessionStore, SessionRecord, Identity } from './contracts';
export class FirestoreSessionStore implements SessionStore {
  private owner = randomUUID();
  private tasks = new CloudTasksClient();
  constructor(
    private queue: { project: string; queue: string; builderUrl: string; serviceAccount: string },
  ) {}
  private lock(record: SessionRecord) {
    return db().doc(
      `sessionLocks/${createHash('sha256')
        .update(JSON.stringify([record.identity.uid, record.identity.childId]))
        .digest('hex')}`,
    );
  }
  async authorize(token: string, childId: string): Promise<Identity> {
    const { uid } = await verifyIdToken(token);
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
    await db().runTransaction(async (tx) => {
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
    return db().runTransaction(async (tx) => {
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
  async finish(record: SessionRecord, summary: string, reason: ByeReason) {
    const { uid, childId } = record.identity;
    await db().runTransaction(async (tx) => {
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
    return world;
  }
  async enqueue(job: BuilderJob) {
    if (await isKillSwitchOn()) throw new Error('KILL_SWITCH');
    if (job.kind === 'build') await reserveWorld(job.uid, job.plan);
    const parent = this.tasks.queuePath(this.queue.project, 'us-central1', this.queue.queue);
    await this.tasks.createTask({
      parent,
      task: {
        name: `${parent}/tasks/${job.jobId}`,
        dispatchDeadline: { seconds: 300 },
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
    await db().runTransaction(async (tx) => {
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
  watchJob(id: string, callback: (status: string) => void) {
    return db()
      .doc(`builderJobs/${id}`)
      .onSnapshot(
        (snap) => {
          const status = snap.data()?.['status'];
          if (typeof status === 'string') callback(status);
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
