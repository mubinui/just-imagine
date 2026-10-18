import {
  ChildDocSchema,
  DiscoveryDocSchema,
  SessionDocSchema,
  SubscriptionDocSchema,
  UserDocSchema,
  WorldDocSchema,
  PLAN_LIMITS,
  paths,
  yyyymmdd,
  defaultTierFor,
  type CreateChildBody,
  type UpdateChildBody,
  type MeResponse,
  type ChildResponse,
  type WorldResponse,
  type WorldListResponse,
  type SessionListResponse,
  type DiscoveryListResponse,
  type UsageTodayResponse,
  UsageDailyDocSchema,
} from '@just-imagine/protocol';
import { db, newId, readDoc, transaction } from '@just-imagine/server-core';
import { ApiFault } from './errors';
import { writeStarterContent } from './starter';
import { requestDeletion, processDeletion } from './deletion';

export interface ApiStore {
  me(uid: string): Promise<MeResponse>;
  createChild(uid: string, body: CreateChildBody): Promise<ChildResponse>;
  updateChild(uid: string, id: string, body: UpdateChildBody): Promise<ChildResponse>;
  deleteChild(uid: string, id: string): Promise<void>;
  deleteAccountData(uid: string): Promise<void>;
  listWorlds(uid: string, id: string): Promise<WorldListResponse>;
  listSessions(uid: string, id: string): Promise<SessionListResponse>;
  listDiscoveries(uid: string, id: string): Promise<DiscoveryListResponse>;
  getWorld(uid: string, id: string): Promise<WorldResponse>;
  deleteWorld(uid: string, id: string): Promise<void>;
  usageToday(uid: string): Promise<UsageTodayResponse>;
}
const missing = () => new ApiFault(404, 'NOT_FOUND', 'This item is no longer available.');
const forbidden = () =>
  new ApiFault(403, 'FORBIDDEN', 'This item is not available to this account.');

export class FirestoreApiStore implements ApiStore {
  constructor(private deletion?: { enqueue: (id: string) => Promise<void> }) {}
  private async user(uid: string) {
    if ((await db().doc(`deletionLocks/${uid}`).get()).exists) throw forbidden();
    const user = await readDoc(paths.user(uid), UserDocSchema);
    if (!user || !user.consentAt)
      throw new ApiFault(403, 'FORBIDDEN', 'Complete parent sign-up first.');
    return user;
  }
  private async child(uid: string, id: string) {
    await this.user(uid);
    if ((await db().doc(`users/${uid}/deletionLocks/${id}`).get()).exists) throw missing();
    const child = await readDoc(paths.child(uid, id), ChildDocSchema);
    if (!child) throw missing();
    return child;
  }
  async me(uid: string): Promise<MeResponse> {
    const user = await this.user(uid);
    const children = await db().collection(paths.children(uid)).get();
    return {
      uid,
      user,
      children: children.docs.map((d) => ({ ...ChildDocSchema.parse(d.data()), id: d.id })),
      subscription: await readDoc(paths.subscription(uid), SubscriptionDocSchema),
    };
  }
  async createChild(uid: string, body: CreateChildBody): Promise<ChildResponse> {
    const id = newId('c');
    return transaction(async (tx) => {
      const userRef = db().doc(paths.user(uid));
      const userSnap = await tx.get(userRef);
      if ((await tx.get(db().doc(`deletionLocks/${uid}`))).exists) throw forbidden();
      if (!userSnap.exists) throw forbidden();
      const user = UserDocSchema.parse(userSnap.data());
      if (!user.consentAt) throw forbidden();
      const children = await tx.get(db().collection(paths.children(uid)));
      if (children.size >= PLAN_LIMITS[user.plan].children)
        throw new ApiFault(409, 'PLAN_LIMIT', 'Your plan has reached its child profile limit.');
      const child = ChildDocSchema.parse({
        ...body,
        tier: defaultTierFor(body.ageBand),
        labsUnlocked: false,
        captions: body.ageBand !== '6-7',
        sessionTargetMinutes: 8,
        loopsCompleted: 0,
        createdAt: Date.now(),
      });
      tx.set(userRef, user); // Serialize profile changes across competing requests.
      tx.create(db().doc(paths.child(uid, id)), child);
      writeStarterContent(tx, uid, id, child);
      return { ...child, id };
    });
  }
  async updateChild(uid: string, id: string, body: UpdateChildBody): Promise<ChildResponse> {
    await this.user(uid);
    return transaction(async (tx) => {
      const ref = db().doc(paths.child(uid, id));
      const snap = await tx.get(ref);
      if (
        (await tx.get(db().doc(`deletionLocks/${uid}`))).exists ||
        (await tx.get(db().doc(`users/${uid}/deletionLocks/${id}`))).exists
      )
        throw forbidden();
      if (!snap.exists) throw missing();
      const merged = ChildDocSchema.parse({ ...snap.data(), ...body });
      if (merged.ageBand === '6-7' && merged.tier === 'lab' && !merged.labsUnlocked) {
        throw new ApiFault(
          400,
          'INVALID_ARGUMENT',
          'Unlock Labs before selecting it for this age band.',
        );
      }
      if (Object.hasOwn(body, 'companion')) {
        const requestRef = ref.collection('companionRequests').doc('current');
        const request = await tx.get(requestRef);
        if (request.exists) tx.update(requestRef, { requestId: '', until: 0 });
      }
      tx.set(ref, merged);
      return { ...merged, id };
    });
  }
  async getWorld(uid: string, id: string): Promise<WorldResponse> {
    await this.user(uid);
    if ((await db().doc(`worldDeletionLocks/${id}`).get()).exists) throw missing();
    const snapshot = await db().doc(paths.world(id)).get();
    if (!snapshot.exists || snapshot.data()?.['ownerUid'] !== uid) throw missing();
    const world = WorldDocSchema.parse(snapshot.data());
    return { ...world, id };
  }
  async listWorlds(uid: string, id: string): Promise<WorldListResponse> {
    await this.child(uid, id);
    const docs = await db()
      .collection(paths.worlds())
      .where('ownerUid', '==', uid)
      .where('childId', '==', id)
      .get();
    return {
      worlds: docs.docs
        .map((d) => {
          const w = WorldDocSchema.parse(d.data());
          return {
            id: d.id,
            title: w.title,
            status: w.status,
            concepts: w.concepts,
            thumbnailUrl: w.thumbnailUrl,
            createdAt: w.createdAt,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt),
    };
  }
  async listSessions(uid: string, id: string): Promise<SessionListResponse> {
    await this.child(uid, id);
    const docs = await db()
      .collection(paths.sessions())
      .where('uid', '==', uid)
      .where('childId', '==', id)
      .get();
    return {
      sessions: docs.docs
        .map((d) => ({ ...SessionDocSchema.parse(d.data()), id: d.id }))
        .sort((a, b) => b.startedAt - a.startedAt),
    };
  }
  async listDiscoveries(uid: string, id: string): Promise<DiscoveryListResponse> {
    await this.child(uid, id);
    const docs = await db().collection(paths.discoveries(uid, id)).get();
    return { discoveries: docs.docs.map((d) => DiscoveryDocSchema.parse(d.data())) };
  }
  async usageToday(uid: string): Promise<UsageTodayResponse> {
    const user = await this.user(uid);
    const used = await readDoc(paths.usageDaily(uid, yyyymmdd(new Date())), UsageDailyDocSchema);
    return {
      plan: user.plan,
      limits: PLAN_LIMITS[user.plan],
      used: used
        ? { voiceSeconds: used.voiceSeconds, worlds: used.worlds, images: used.images }
        : { voiceSeconds: 0, worlds: 0, images: 0 },
    };
  }
  async deleteWorld(uid: string, id: string): Promise<void> {
    await this.getWorld(uid, id);
    const jobId = await requestDeletion(uid, null, id);
    if (this.deletion) await this.deletion.enqueue(jobId);
    else await processDeletion(jobId);
  }
  async deleteChild(uid: string, id: string): Promise<void> {
    await this.user(uid);
    const jobId = await requestDeletion(uid, id);
    if (this.deletion) await this.deletion.enqueue(jobId);
    else await processDeletion(jobId);
  }
  async deleteAccountData(uid: string): Promise<void> {
    const jobId = await requestDeletion(uid, null);
    if (this.deletion) await this.deletion.enqueue(jobId);
    else await processDeletion(jobId);
  }
}
