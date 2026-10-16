import type { FastifyInstance, FastifyReply } from 'fastify';
import { FieldPath, type DocumentSnapshot } from 'firebase-admin/firestore';
import { monotonicFactory } from 'ulid';
import { z } from 'zod';
import {
  ADMIN_ROUTES,
  APPEARANCE_PATH,
  AppearanceSchema,
  SetAppearanceSchema,
  type Appearance,
  AdminAuditDocSchema,
  AdminAuditQuerySchema,
  AdminDeleteFamilyBodySchema,
  AdminFamilyListQuerySchema,
  AdminFlagsDocSchema,
  AdminKillSwitchBodySchema,
  AdminPlanBodySchema,
  AdminQuotaResetBodySchema,
  AdminSuspensionBodySchema,
  AdminWorldVisibilityBodySchema,
  ChildDocSchema,
  DocumentIdSchema,
  GameSmokeRunDocSchema,
  LibraryAssetQaDocSchema,
  ModerationEventDocSchema,
  PLAN_LIMITS,
  SubscriptionDocSchema,
  UsageDailyDocSchema,
  UserDocSchema,
  adminPaths,
  deletionConfirmationFor,
  estimateCostUsd,
  paths,
  yyyymmdd,
  type AdminAuditAction,
  type AdminAuditDoc,
  type AdminAuditResponse,
  type AdminContentResponse,
  type AdminFamilyDetail,
  type AdminFamilyListQuery,
  type AdminFamilyListResponse,
  type AdminFamilyRow,
  type AdminFlagsDoc,
  type AdminModerationEntry,
  type AdminOverviewResponse,
  type AdminSafetyResponse,
  type AdminSafetyWorld,
  type AdminSystemStatus,
  type AdminWriteResponse,
  type AgeBand,
  type PlanTier,
  type UsageDailyDoc,
} from '@just-imagine/protocol';
import {
  AdminRequiredError,
  db,
  isAccountSuspended,
  requireAdmin,
} from '@just-imagine/server-core';
import { ApiFault } from './errors';
import { FirestoreApiStore, type ApiStore } from './store';

export interface AdminActor {
  uid: string;
  email: string | null;
}
export interface AdminPackSummary {
  id: string;
  title: string;
  version: string;
  challenges: number;
}
export interface AdminRouteOptions {
  /** Verifies the bearer token and the admin claim. Defaults to server-core `requireAdmin`. */
  verifyAdmin?: (token: string) => Promise<AdminActor>;
  /** Health probes for the System page. Defaults to `ADMIN_HEALTH_TARGETS` (name=url,...). */
  health?: () => Promise<AdminSystemStatus['services']>;
  /** Learning World pack catalogue; the api does not bundle the content package. */
  packs?: () => AdminPackSummary[];
  now?: () => number;
}
interface AdminDeps {
  store: ApiStore;
  billingConfigured: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
const auditId = (() => {
  const ulid = monotonicFactory();
  // Lexicographic order of these ids is creation order, so the log pages by document id.
  return () => `a_${ulid().toLowerCase()}`;
})();
const missing = () => new ApiFault(404, 'NOT_FOUND', 'This item is no longer available.');
const deleting = () =>
  new ApiFault(403, 'FORBIDDEN', 'This account is being deleted; it can no longer be changed.');
const docId = (params: unknown, key: string) =>
  DocumentIdSchema.parse(z.record(z.string(), z.unknown()).parse(params)[key]);

function startOfUtcDay(ms: number) {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
const dateKey = (ms: number) => yyyymmdd(new Date(ms));
const ACTIVE_STATUSES = ['active', 'trialing'];

function flagsOf(snap: DocumentSnapshot, now: number): AdminFlagsDoc {
  return snap.exists
    ? AdminFlagsDocSchema.parse(snap.data())
    : AdminFlagsDocSchema.parse({ updatedAt: now });
}

function auditDoc(
  actor: AdminActor,
  action: AdminAuditAction,
  target: AdminAuditDoc['target'],
  before: AdminAuditDoc['before'],
  after: AdminAuditDoc['after'],
  reason: string,
  at: number,
): AdminAuditDoc {
  return AdminAuditDocSchema.parse({
    actorUid: actor.uid,
    actorEmail: actor.email,
    action,
    target,
    before,
    after,
    reason,
    at,
  });
}

/** Firestore-backed reads and audited writes for the super admin panel. */
export class FirestoreAdminStore {
  constructor(
    private deps: AdminDeps,
    private options: Pick<AdminRouteOptions, 'health' | 'packs' | 'now'> = {},
  ) {}
  private now() {
    return this.options.now?.() ?? Date.now();
  }

  async overview(): Promise<AdminOverviewResponse> {
    const now = this.now();
    const today = startOfUtcDay(now);
    const start7 = today - 6 * DAY;
    const start30 = today - 29 * DAY;
    const [families, free, comped, children, subs, usage, sessions, events, jobs] =
      await Promise.all([
        db().collection('users').count().get(),
        db().collection('users').where('plan', '==', 'free').count().get(),
        db()
          .collection(adminPaths.flagsCollection())
          .where('compPlan', '==', 'family')
          .count()
          .get(),
        db().collectionGroup('children').select('ageBand').get(),
        db()
          .collection('subscriptions')
          .where('status', 'in', ACTIVE_STATUSES)
          .select('tier')
          .get(),
        db().collection('usageDaily').where('date', '>=', dateKey(start30)).get(),
        db()
          .collection(paths.sessions())
          .where('startedAt', '>=', start30)
          .select('startedAt', 'endReason')
          .get(),
        db().collection(adminPaths.moderationEvents()).where('at', '>=', start30).get(),
        db().collection('builderJobs').where('finishedAt', '>=', start30).select('status').get(),
      ]);

    const bands: Record<AgeBand, number> = { '6-7': 0, '8-10': 0, '11-13': 0 };
    for (const doc of children.docs) {
      const band = ChildDocSchema.shape.ageBand.safeParse(doc.get('ageBand'));
      if (band.success) bands[band.data]++;
    }
    const windowOf = (pairs: { at: number; n: number }[]) => ({
      today: pairs.filter((p) => p.at >= today).reduce((s, p) => s + p.n, 0),
      last7: pairs.filter((p) => p.at >= start7).reduce((s, p) => s + p.n, 0),
      last30: pairs.filter((p) => p.at >= start30).reduce((s, p) => s + p.n, 0),
    });
    const usageByDay = new Map<string, { voiceSeconds: number; worlds: number; images: number }>();
    for (const doc of usage.docs) {
      const parsed = UsageDailyDocSchema.safeParse(doc.data());
      if (!parsed.success) continue;
      const day = usageByDay.get(parsed.data.date) ?? { voiceSeconds: 0, worlds: 0, images: 0 };
      day.voiceSeconds += parsed.data.voiceSeconds;
      day.worlds += parsed.data.worlds;
      day.images += parsed.data.images;
      usageByDay.set(parsed.data.date, day);
    }
    const days = Array.from({ length: 30 }, (_, i) => {
      const at = start30 + i * DAY;
      return { at, ...(usageByDay.get(dateKey(at)) ?? { voiceSeconds: 0, worlds: 0, images: 0 }) };
    });
    const sessionTimes = sessions.docs.map((d) => ({
      at: Number(d.get('startedAt')) || 0,
      moderated: d.get('endReason') === 'moderation',
    }));
    const blocks = [
      ...sessionTimes.filter((s) => s.moderated).map((s) => ({ at: s.at, n: 1 })),
      ...events.docs
        .map((d) => ModerationEventDocSchema.safeParse(d.data()))
        .filter((e) => e.success && e.data.category === 'block')
        .map((e) => ({ at: e.data!.at, n: 1 })),
    ];
    const failed = jobs.docs.filter((d) => d.get('status') === 'failed').length;
    const cost = (from: number) =>
      estimateCostUsd(
        days
          .filter((d) => d.at >= from)
          .reduce(
            (s, d) => ({
              voiceSeconds: s.voiceSeconds + d.voiceSeconds,
              worlds: s.worlds + d.worlds,
              images: s.images + d.images,
            }),
            { voiceSeconds: 0, worlds: 0, images: 0 },
          ),
      );
    return {
      generatedAt: now,
      families: families.data().count,
      children: children.size,
      childrenByAgeBand: bands,
      subscriptions: {
        family: subs.docs.filter((d) => d.get('tier') === 'family').length,
        comped: comped.data().count,
        free: free.data().count,
      },
      sessions: windowOf(sessionTimes.map((s) => ({ at: s.at, n: 1 }))),
      voiceMinutes: (() => {
        const w = windowOf(days.map((d) => ({ at: d.at, n: d.voiceSeconds })));
        return {
          today: Math.round(w.today / 60),
          last7: Math.round(w.last7 / 60),
          last30: Math.round(w.last30 / 60),
        };
      })(),
      worldsBuilt: windowOf(days.map((d) => ({ at: d.at, n: d.worlds }))),
      images: windowOf(days.map((d) => ({ at: d.at, n: d.images }))),
      moderationBlocks: windowOf(blocks),
      builder: {
        finished30: jobs.size,
        failed30: failed,
        failureRate: jobs.size ? Math.round((failed / jobs.size) * 1000) / 1000 : 0,
      },
      daily: days.slice(-7).map((d) => ({
        date: dateKey(d.at),
        sessions: sessionTimes.filter((s) => s.at >= d.at && s.at < d.at + DAY).length,
        voiceMinutes: Math.round(d.voiceSeconds / 60),
        worlds: d.worlds,
        images: d.images,
        estimatedCostUsd: estimateCostUsd(d),
      })),
      estimatedCostUsd: { today: cost(today), last7: cost(start7), last30: cost(start30) },
    };
  }

  private async row(snap: DocumentSnapshot): Promise<AdminFamilyRow | null> {
    const user = UserDocSchema.safeParse(snap.data());
    if (!user.success) return null;
    const [count, sub, flags] = await Promise.all([
      db().collection(paths.children(snap.id)).count().get(),
      db().doc(paths.subscription(snap.id)).get(),
      db().doc(adminPaths.flags(snap.id)).get(),
    ]);
    const subscription = SubscriptionDocSchema.safeParse(sub.data());
    const flag = flagsOf(flags, this.now());
    return {
      uid: snap.id,
      email: user.data.email,
      displayName: user.data.displayName,
      plan: user.data.plan,
      compPlan: flag.compPlan,
      subscriptionStatus: sub.exists && subscription.success ? subscription.data.status : null,
      suspended: flag.suspended,
      childrenCount: count.data().count,
      createdAt: user.data.createdAt,
    };
  }

  async families(query: AdminFamilyListQuery): Promise<AdminFamilyListResponse> {
    let q = db().collection('users').orderBy('email').orderBy(FieldPath.documentId());
    const after = query.cursor ? await db().doc(paths.user(query.cursor)).get() : null;
    if (after?.exists) q = q.startAfter(after);
    else if (query.q) q = q.startAt(query.q);
    if (query.q) q = q.endAt(`${query.q}`);
    const snap = await q.limit(query.limit + 1).get();
    const page = snap.docs.slice(0, query.limit);
    const rows = (await Promise.all(page.map((d) => this.row(d)))).filter(
      (r): r is AdminFamilyRow => r !== null,
    );
    return {
      families: rows,
      nextCursor: snap.size > query.limit ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async family(uid: string): Promise<AdminFamilyDetail> {
    const now = this.now();
    const userSnap = await db().doc(paths.user(uid)).get();
    if (!userSnap.exists) throw missing();
    const row = await this.row(userSnap);
    if (!row) throw missing();
    const user = UserDocSchema.parse(userSnap.data());
    const start7 = startOfUtcDay(now) - 6 * DAY;
    const start30 = startOfUtcDay(now) - 29 * DAY;
    const usageRefs = Array.from({ length: 7 }, (_, i) =>
      db().doc(paths.usageDaily(uid, dateKey(start7 + i * DAY))),
    );
    const [children, flags, lock, usage, worlds, sessions] = await Promise.all([
      db().collection(paths.children(uid)).select('ageBand', 'tier', 'createdAt').get(),
      db().doc(adminPaths.flags(uid)).get(),
      db().doc(`deletionLocks/${uid}`).get(),
      db().getAll(...usageRefs),
      db().collection(paths.worlds()).where('ownerUid', '==', uid).count().get(),
      db().collection(paths.sessions()).where('uid', '==', uid).select('startedAt').get(),
    ]);
    const counters = (doc?: UsageDailyDoc) => ({
      voiceSeconds: doc?.voiceSeconds ?? 0,
      worlds: doc?.worlds ?? 0,
      images: doc?.images ?? 0,
    });
    const parsedUsage = usage.map((d) =>
      d.exists ? UsageDailyDocSchema.safeParse(d.data()).data : undefined,
    );
    const usage7 = parsedUsage.reduce(
      (s, d) => {
        const c = counters(d);
        return {
          voiceSeconds: s.voiceSeconds + c.voiceSeconds,
          worlds: s.worlds + c.worlds,
          images: s.images + c.images,
        };
      },
      { voiceSeconds: 0, worlds: 0, images: 0 },
    );
    const flag = flagsOf(flags, now);
    return {
      ...row,
      suspendedReason: flag.suspendedReason,
      deletionPending: lock.exists,
      hasBillingAccount: user.stripeCustomerId !== null,
      children: children.docs
        .map((d) =>
          ChildDocSchema.pick({ ageBand: true, tier: true, createdAt: true }).safeParse(d.data()),
        )
        .filter((c) => c.success)
        .map((c) => c.data!)
        .sort((a, b) => a.createdAt - b.createdAt),
      limits: PLAN_LIMITS[user.plan],
      usageToday: counters(parsedUsage.at(-1)),
      usage7,
      worlds: worlds.data().count,
      sessions30: sessions.docs.filter((d) => Number(d.get('startedAt')) >= start30).length,
    };
  }

  private async audited(
    run: (
      tx: FirebaseFirestore.Transaction,
      now: number,
    ) => Promise<Omit<AdminAuditDoc, 'actorUid' | 'actorEmail' | 'at' | 'reason'>>,
    actor: AdminActor,
    reason: string,
  ): Promise<AdminWriteResponse> {
    const id = auditId();
    await db().runTransaction(async (tx) => {
      const now = this.now();
      const change = await run(tx, now);
      tx.create(
        db().doc(adminPaths.audit(id)),
        auditDoc(actor, change.action, change.target, change.before, change.after, reason, now),
      );
    });
    return { ok: true, auditId: id };
  }
  private async family_(tx: FirebaseFirestore.Transaction, uid: string) {
    const [user, lock] = await Promise.all([
      tx.get(db().doc(paths.user(uid))),
      tx.get(db().doc(`deletionLocks/${uid}`)),
    ]);
    if (!user.exists) throw missing();
    if (lock.exists) throw deleting();
    return UserDocSchema.parse(user.data());
  }

  setPlan(actor: AdminActor, uid: string, plan: PlanTier, reason: string) {
    return this.audited(
      async (tx, now) => {
        const flagsRef = db().doc(adminPaths.flags(uid));
        const [flagsSnap, subSnap] = await Promise.all([
          tx.get(flagsRef),
          tx.get(db().doc(paths.subscription(uid))),
        ]);
        const user = await this.family_(tx, uid);
        const flags = flagsOf(flagsSnap, now);
        const sub = SubscriptionDocSchema.safeParse(subSnap.data());
        const paid =
          subSnap.exists &&
          sub.success &&
          sub.data.tier === 'family' &&
          ACTIVE_STATUSES.includes(sub.data.status);
        const compPlan: PlanTier | null = plan === 'family' ? 'family' : null;
        const next: PlanTier = compPlan ?? (paid ? 'family' : 'free');
        tx.update(db().doc(paths.user(uid)), { plan: next });
        tx.set(flagsRef, { ...flags, compPlan, updatedAt: now });
        return {
          action: 'plan.override',
          target: { kind: 'family', id: uid },
          before: { plan: user.plan, compPlan: flags.compPlan },
          after: { plan: next, compPlan },
        };
      },
      actor,
      reason,
    );
  }

  resetQuota(actor: AdminActor, uid: string, reason: string) {
    return this.audited(
      async (tx, now) => {
        const date = dateKey(now);
        const ref = db().doc(paths.usageDaily(uid, date));
        const snap = await tx.get(ref);
        await this.family_(tx, uid);
        const before = snap.exists ? UsageDailyDocSchema.parse(snap.data()) : undefined;
        const after = { voiceSeconds: 0, worlds: 0, images: 0 };
        tx.set(ref, UsageDailyDocSchema.parse({ uid, date, ...after }));
        return {
          action: 'quota.reset',
          target: { kind: 'family', id: uid },
          before: {
            voiceSeconds: before?.voiceSeconds ?? 0,
            worlds: before?.worlds ?? 0,
            images: before?.images ?? 0,
          },
          after,
        };
      },
      actor,
      reason,
    );
  }

  setSuspension(actor: AdminActor, uid: string, suspended: boolean, reason: string) {
    return this.audited(
      async (tx, now) => {
        const ref = db().doc(adminPaths.flags(uid));
        const snap = await tx.get(ref);
        await this.family_(tx, uid);
        const flags = flagsOf(snap, now);
        tx.set(ref, {
          ...flags,
          suspended,
          suspendedReason: suspended ? reason : null,
          updatedAt: now,
        });
        return {
          action: suspended ? 'account.suspend' : 'account.reinstate',
          target: { kind: 'family', id: uid },
          before: { suspended: flags.suspended },
          after: { suspended },
        };
      },
      actor,
      reason,
    );
  }

  async deleteFamily(actor: AdminActor, uid: string, confirmation: string, reason: string) {
    const snap = await db().doc(paths.user(uid)).get();
    if (!snap.exists) throw missing();
    const user = UserDocSchema.parse(snap.data());
    if (confirmation.trim().toLowerCase() !== deletionConfirmationFor(user.email))
      throw new ApiFault(
        400,
        'INVALID_ARGUMENT',
        'Type the confirmation phrase exactly to delete this family.',
      );
    if (user.stripeCustomerId && !this.deps.billingConfigured)
      throw new ApiFault(503, 'INTERNAL', 'Billing must be available to close this account.');
    const result = await this.audited(
      async (tx) => {
        const fresh = await this.family_(tx, uid);
        return {
          action: 'account.delete',
          target: { kind: 'family', id: uid },
          before: { plan: fresh.plan, deletionRequested: false },
          after: { deletionRequested: true },
        };
      },
      actor,
      reason,
    );
    // The same durable deletion job a parent's own request uses (queue in production).
    await this.deps.store.deleteAccountData(uid);
    return result;
  }

  setWorldHidden(actor: AdminActor, worldId: string, hidden: boolean, reason: string) {
    return this.audited(
      async (tx) => {
        const ref = db().doc(paths.world(worldId));
        const snap = await tx.get(ref);
        if (!snap.exists) throw missing();
        const before = snap.get('hidden') === true;
        tx.update(ref, { hidden });
        return {
          action: hidden ? 'world.hide' : 'world.unhide',
          target: { kind: 'world', id: worldId },
          before: { hidden: before },
          after: { hidden },
        };
      },
      actor,
      reason,
    );
  }

  setKillSwitch(actor: AdminActor, on: boolean, reason: string) {
    return this.audited(
      async (tx, now) => {
        const ref = db().doc(paths.runtimeConfig());
        const snap = await tx.get(ref);
        const before = {
          on: snap.get('killSwitch') === true,
          reason: typeof snap.get('reason') === 'string' ? (snap.get('reason') as string) : null,
        };
        tx.set(ref, {
          killSwitch: on,
          updatedAt: now,
          reason,
          updatedBy: actor.email ?? actor.uid,
        });
        return {
          action: 'killSwitch.set',
          target: { kind: 'system', id: 'runtime' },
          before,
          after: { on, reason },
        };
      },
      actor,
      reason,
    );
  }

  async appearance(): Promise<Appearance> {
    const snap = await db().doc(APPEARANCE_PATH).get();
    return AppearanceSchema.parse(snap.exists ? snap.data() : {});
  }

  setAppearance(actor: AdminActor, body: ReturnType<typeof SetAppearanceSchema.parse>) {
    return this.audited(
      async (tx) => {
        const ref = db().doc(APPEARANCE_PATH);
        const snap = await tx.get(ref);
        const before = AppearanceSchema.parse(snap.exists ? snap.data() : {});
        if (before.revision !== body.revision)
          throw new ApiFault(
            409,
            'INVALID_ARGUMENT',
            'Another operator changed the theme. Refresh before applying yours.',
          );
        const after = { theme: body.theme, revision: before.revision + 1 };
        tx.set(ref, after);
        return {
          action: 'appearance.set',
          target: { kind: 'system', id: 'appearance' },
          before,
          after,
        };
      },
      actor,
      body.reason,
    );
  }

  async safety(): Promise<AdminSafetyResponse> {
    const now = this.now();
    const start30 = startOfUtcDay(now) - 29 * DAY;
    const [moderatedSessions, events, failed, recent, hidden] = await Promise.all([
      db()
        .collection(paths.sessions())
        .where('endReason', '==', 'moderation')
        .select('startedAt', 'endedAt')
        .limit(200)
        .get(),
      db().collection(adminPaths.moderationEvents()).orderBy('at', 'desc').limit(200).get(),
      db().collection(paths.worlds()).where('status', '==', 'failed').limit(100).get(),
      db().collection(paths.worlds()).where('updatedAt', '>=', start30).limit(500).get(),
      db().collection(paths.worlds()).where('hidden', '==', true).limit(100).get(),
    ]);
    const moderation: AdminModerationEntry[] = [
      ...moderatedSessions.docs.map((d) => ({
        id: d.id,
        sessionId: d.id,
        category: 'block' as const,
        source: 'session' as const,
        at: Number(d.get('endedAt')) || Number(d.get('startedAt')) || 0,
      })),
      ...events.docs.flatMap((d) => {
        const e = ModerationEventDocSchema.safeParse(d.data());
        return e.success
          ? [
              {
                id: d.id,
                sessionId: e.data.sessionId,
                category: e.data.category,
                source: e.data.source,
                at: e.data.at,
              },
            ]
          : [];
      }),
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, 200);
    const world = (d: DocumentSnapshot): AdminSafetyWorld => {
      const assets = d.get('assets');
      const failedAssets =
        assets && typeof assets === 'object'
          ? Object.values(assets as Record<string, { status?: unknown }>).filter(
              (a) => a?.status === 'failed',
            ).length
          : 0;
      const status = d.get('status');
      return {
        worldId: d.id,
        ownerUid: String(d.get('ownerUid') ?? ''),
        title: String(d.get('title') ?? ''),
        status: status === 'ready' || status === 'building' ? status : 'failed',
        failedAssets,
        hidden: d.get('hidden') === true,
        updatedAt: Number(d.get('updatedAt')) || 0,
      };
    };
    const newest = (a: AdminSafetyWorld, b: AdminSafetyWorld) => b.updatedAt - a.updatedAt;
    return {
      moderation,
      imageRejections: recent.docs
        .map(world)
        .filter((w) => w.failedAssets > 0)
        .sort(newest),
      failedWorlds: failed.docs.map(world).sort(newest),
      hiddenWorlds: hidden.docs.map(world).sort(newest),
    };
  }

  async content(): Promise<AdminContentResponse> {
    const worlds = db().collection(paths.worlds());
    const [total, ready, building, failed, hidden, smoke, library] = await Promise.all([
      worlds.count().get(),
      worlds.where('status', '==', 'ready').count().get(),
      worlds.where('status', '==', 'building').count().get(),
      worlds.where('status', '==', 'failed').count().get(),
      worlds.where('hidden', '==', true).count().get(),
      db().collection(adminPaths.gameSmokeRuns()).orderBy('at', 'desc').limit(500).get(),
      db().collection(adminPaths.libraryAssets()).select('qaStatus').get(),
    ]);
    const runs = smoke.docs.flatMap((d) => {
      const run = GameSmokeRunDocSchema.safeParse(d.data());
      return run.success ? [run.data] : [];
    });
    const reasons = new Map<string, number>();
    for (const run of runs)
      if (!run.passed && run.failureReason)
        reasons.set(run.failureReason, (reasons.get(run.failureReason) ?? 0) + 1);
    const qa = library.docs.flatMap((d) => {
      const asset = LibraryAssetQaDocSchema.safeParse(d.data());
      return asset.success ? [asset.data.qaStatus] : [];
    });
    const passed = runs.filter((r) => r.passed).length;
    const packs = this.options.packs?.();
    return {
      worlds: {
        total: total.data().count,
        ready: ready.data().count,
        building: building.data().count,
        failed: failed.data().count,
        hidden: hidden.data().count,
      },
      packs: { connected: packs !== undefined, items: packs ?? [] },
      gameSmoke: {
        runs: runs.length,
        passed,
        passRate: runs.length ? Math.round((passed / runs.length) * 1000) / 1000 : null,
        topFailures: [...reasons]
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
      },
      assetLibrary: {
        total: qa.length,
        approved: qa.filter((s) => s === 'approved').length,
        rejected: qa.filter((s) => s === 'rejected').length,
        pending: qa.filter((s) => s === 'pending').length,
      },
    };
  }

  async system(): Promise<AdminSystemStatus> {
    const snap = await db().doc(paths.runtimeConfig()).get();
    const env = process.env;
    return {
      killSwitch: {
        on: snap.get('killSwitch') === true,
        reason: typeof snap.get('reason') === 'string' ? (snap.get('reason') as string) : null,
        updatedAt:
          typeof snap.get('updatedAt') === 'number' ? (snap.get('updatedAt') as number) : null,
        updatedBy:
          typeof snap.get('updatedBy') === 'string' ? (snap.get('updatedBy') as string) : null,
      },
      services: await (this.options.health ?? defaultHealth)(),
      // The api's view of configured model ids; defaults are the spec's model table.
      models: [
        { role: 'voice', id: env['LIVE_MODEL'] || 'gemini-3.8-live' },
        { role: 'world builder', id: env['SCENE_MODEL'] || 'gemini-4-argon' },
        { role: 'patches, summaries, moderation', id: env['FAST_MODEL'] || 'gemini-3.8-flash' },
        { role: 'hero sprites and backdrops', id: env['HERO_MODEL'] || 'gemini-nano-banana-2.1' },
        { role: 'props', id: env['PROP_MODEL'] || 'gemini-3.1-flash-lite-image' },
        {
          role: 'companion portraits',
          id: env['COMPANION_IMAGE_MODEL'] || 'gemini-nano-banana-2.1',
        },
      ],
      versions: {
        api: env['APP_VERSION'] || '0.1.0',
        revision: env['K_REVISION'] || null,
        commit: env['COMMIT_SHA'] || null,
      },
    };
  }

  async audit(query: z.infer<typeof AdminAuditQuerySchema>): Promise<AdminAuditResponse> {
    // Newest first; ULID ids break ties between writes in the same millisecond.
    let q = db()
      .collection(adminPaths.auditCollection())
      .orderBy('at', 'desc')
      .orderBy(FieldPath.documentId(), 'desc');
    const after = query.cursor ? await db().doc(adminPaths.audit(query.cursor)).get() : null;
    if (after?.exists) q = q.startAfter(after);
    const snap = await q.limit(query.limit + 1).get();
    const page = snap.docs.slice(0, query.limit);
    return {
      entries: page.flatMap((d) => {
        const entry = AdminAuditDocSchema.safeParse(d.data());
        return entry.success ? [{ ...entry.data, id: d.id }] : [];
      }),
      nextCursor: snap.size > query.limit ? (page.at(-1)?.id ?? null) : null,
    };
  }
}

/** `ADMIN_HEALTH_TARGETS=builder=http://builder:3302/health,gateway=http://gateway:8788/` */
async function defaultHealth(): Promise<AdminSystemStatus['services']> {
  const checkedAt = Date.now();
  const configured = new Map(
    (process.env['ADMIN_HEALTH_TARGETS'] ?? '')
      .split(',')
      .map((pair) => pair.trim().split('='))
      .filter((pair): pair is [string, string] => pair.length === 2 && !!pair[0] && !!pair[1]),
  );
  const names = [...new Set(['builder', 'gateway', ...configured.keys()])];
  const probes = names.map(async (name) => {
    const url = configured.get(name);
    if (!url) return { name, status: 'unconfigured' as const, version: null, checkedAt };
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
      const body = (await res.json().catch(() => null)) as { version?: unknown } | null;
      return {
        name,
        // Any answer below 500 means the process is up (the gateway answers plain GETs with 426).
        status: res.status < 500 ? ('ok' as const) : ('down' as const),
        version: typeof body?.version === 'string' ? body.version : null,
        checkedAt,
      };
    } catch {
      return { name, status: 'down' as const, version: null, checkedAt };
    }
  });
  return [
    { name: 'api', status: 'ok', version: process.env['APP_VERSION'] || '0.1.0', checkedAt },
    ...(await Promise.all(probes)),
  ];
}

/** Registers every `/v1/admin/*` route behind the admin-claim guard. */
export function registerAdminRoutes(
  app: FastifyInstance,
  deps: AdminDeps,
  options: AdminRouteOptions = {},
) {
  const verify = options.verifyAdmin ?? requireAdmin;
  const store = new FirestoreAdminStore(deps, options);
  app.get('/v1/appearance', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store');
    return store.appearance();
  });
  app.register(async (routes) => {
    routes.decorateRequest('adminActor', null);
    routes.addHook('preHandler', async (req) => {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer '))
        throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in to continue.');
      try {
        req.adminActor = await verify(header.slice(7));
      } catch (error) {
        if (error instanceof AdminRequiredError)
          throw new ApiFault(403, 'FORBIDDEN', 'This account is not an administrator.');
        throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in again to continue.');
      }
    });
    const actor = (req: { adminActor: AdminActor | null }) => {
      if (!req.adminActor) throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in to continue.');
      return req.adminActor;
    };
    const R = ADMIN_ROUTES;
    routes.get(R.overview.path, () => store.overview());
    routes.get(R.families.path, (req) =>
      store.families(AdminFamilyListQuerySchema.parse(req.query)),
    );
    routes.get(R.family.path, (req) => store.family(docId(req.params, 'uid')));
    routes.post(R.setPlan.path, (req) => {
      const body = AdminPlanBodySchema.parse(req.body);
      return store.setPlan(actor(req), docId(req.params, 'uid'), body.plan, body.reason);
    });
    routes.post(R.resetQuota.path, (req) => {
      const body = AdminQuotaResetBodySchema.parse(req.body);
      return store.resetQuota(actor(req), docId(req.params, 'uid'), body.reason);
    });
    routes.post(R.setSuspension.path, (req) => {
      const body = AdminSuspensionBodySchema.parse(req.body);
      return store.setSuspension(actor(req), docId(req.params, 'uid'), body.suspended, body.reason);
    });
    routes.post(R.deleteFamily.path, async (req, reply: FastifyReply) => {
      const body = AdminDeleteFamilyBodySchema.parse(req.body);
      const result = await store.deleteFamily(
        actor(req),
        docId(req.params, 'uid'),
        body.confirmation,
        body.reason,
      );
      return reply.status(202).send(result);
    });
    routes.get(R.safety.path, () => store.safety());
    routes.post(R.setWorldVisibility.path, (req) => {
      const body = AdminWorldVisibilityBodySchema.parse(req.body);
      return store.setWorldHidden(
        actor(req),
        docId(req.params, 'worldId'),
        body.hidden,
        body.reason,
      );
    });
    routes.get(R.content.path, () => store.content());
    routes.get(R.appearance.path, () => store.appearance());
    routes.post(R.setAppearance.path, (req) =>
      store.setAppearance(actor(req), SetAppearanceSchema.parse(req.body)),
    );
    routes.get(R.system.path, () => store.system());
    routes.post(R.killSwitch.path, (req) => {
      const body = AdminKillSwitchBodySchema.parse(req.body);
      return store.setKillSwitch(actor(req), body.on, body.reason);
    });
    routes.get(R.audit.path, (req) => store.audit(AdminAuditQuerySchema.parse(req.query)));
  });
}

declare module 'fastify' {
  interface FastifyRequest {
    adminActor: AdminActor | null;
  }
}

/**
 * The parent-route suspension check. A Firestore-backed store reads `adminFlags/{uid}`
 * (failing closed on read errors); injected test stores have no suspension source.
 */
export function suspensionCheckFor(
  store: ApiStore,
): ((uid: string) => Promise<boolean>) | undefined {
  return store instanceof FirestoreApiStore ? isAccountSuspended : undefined;
}
