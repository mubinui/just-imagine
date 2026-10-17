import { z } from 'zod';
import { AgeBandSchema, TierSchema } from './bands';
import { PlanLimitsSchema, PlanTierSchema } from './plans';
import { SubscriptionDocSchema, UsageDailyDocSchema, WorldStatusSchema } from './firestore';
import { DateKeySchema, DocumentIdSchema, EpochMsSchema } from './primitives';

/*
 * Super admin contract (quality program spec 9b). Every admin response is aggregate or
 * operational: parent emails are visible because admins run billing and support, but child
 * names, photos, generated art, transcripts and world content (beyond titles) never appear.
 * Zod objects strip unknown keys, so a field that slips into a source document is dropped
 * at this boundary rather than forwarded.
 */

/** Error code the api returns on parent routes for a suspended account. */
export const ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED' as const;
export const AccountSuspendedErrorSchema = z.object({
  error: z.object({ code: z.literal(ACCOUNT_SUSPENDED), message: z.string() }),
});

/**
 * Estimated model cost per unit of usage, in US dollars. This is the single table the
 * Overview cost estimate uses; update it from the Cloud Billing export when prices change.
 *
 * | Unit          | Counter source                      | Model                                   | USD   |
 * |---------------|-------------------------------------|-----------------------------------------|-------|
 * | voiceMinute   | usageDaily.voiceSeconds / 60        | gemini-3.8-live (audio in and out)      | 0.05  |
 * | worldBuild    | usageDaily.worlds                   | gemini-4-argon scene + flash checks     | 0.02  |
 * | image         | usageDaily.images                   | gemini-nano-banana-2.1 / flash-lite img | 0.04  |
 */
export const ADMIN_COST_PER_UNIT_USD = {
  voiceMinute: 0.05,
  worldBuild: 0.02,
  image: 0.04,
} as const;

export function estimateCostUsd(usage: {
  voiceSeconds: number;
  worlds: number;
  images: number;
}): number {
  const c = ADMIN_COST_PER_UNIT_USD;
  const total =
    (usage.voiceSeconds / 60) * c.voiceMinute +
    usage.worlds * c.worldBuild +
    usage.images * c.image;
  return Math.round(total * 10000) / 10000;
}

const count = z.number().int().nonnegative();
const reason = z.string().trim().min(3).max(500);
const scalar = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().toLowerCase().min(1).max(254).optional(),
);

// ---------- Firestore documents written by admin routes (server only; rules deny clients) ----------

export const AdminFlagsDocSchema = z.object({
  suspended: z.boolean().default(false),
  suspendedReason: z.string().nullable().default(null),
  /** A comped plan. Billing reconciliation keeps this tier while it is set. */
  compPlan: PlanTierSchema.nullable().default(null),
  updatedAt: EpochMsSchema,
});
export type AdminFlagsDoc = z.infer<typeof AdminFlagsDocSchema>;

export const AdminAuditActionSchema = z.enum([
  'plan.override',
  'quota.reset',
  'account.suspend',
  'account.reinstate',
  'account.delete',
  'world.hide',
  'world.unhide',
  'killSwitch.set',
  'appearance.set',
  'school.create',
  'school.update',
  'school.suspend',
  'school.reinstate',
  'school.invite',
  'school.inviteRevoke',
  'catalog.create',
  'catalog.update',
  'catalog.publish',
  'catalog.retire',
  'lesson.publish',
  'lesson.save',
  'lesson.approve',
  'lesson.archive',
]);
export type AdminAuditAction = z.infer<typeof AdminAuditActionSchema>;

export const AdminAuditDocSchema = z.object({
  actorUid: z.string(),
  actorEmail: z.string().nullable(),
  action: AdminAuditActionSchema,
  target: z.object({
    kind: z.enum(['family', 'world', 'system', 'school', 'catalog', 'lesson']),
    id: z.string(),
  }),
  before: z.record(z.string(), scalar).nullable(),
  after: z.record(z.string(), scalar).nullable(),
  reason: z.string(),
  at: EpochMsSchema,
});
export type AdminAuditDoc = z.infer<typeof AdminAuditDocSchema>;

/** Optional producer contracts: the gateway and builder may write these; admin reads them if present. */
export const ModerationEventDocSchema = z.object({
  sessionId: z.string(),
  uid: z.string(),
  category: z.enum(['block', 'redirect']),
  source: z.enum(['transcript', 'image']),
  at: EpochMsSchema,
});
export type ModerationEventDoc = z.infer<typeof ModerationEventDocSchema>;
export const GameSmokeRunDocSchema = z.object({
  passed: z.boolean(),
  failureReason: z.string().max(120).nullable(),
  at: EpochMsSchema,
});
export const LibraryAssetQaDocSchema = z.object({
  qaStatus: z.enum(['approved', 'rejected', 'pending']),
});

const segment = (value: string): string => DocumentIdSchema.parse(value);
export const adminPaths = {
  flagsCollection: () => 'adminFlags',
  flags: (uid: string) => `adminFlags/${segment(uid)}`,
  auditCollection: () => 'adminAudit',
  audit: (id: string) => `adminAudit/${segment(id)}`,
  moderationEvents: () => 'moderationEvents',
  gameSmokeRuns: () => 'gameSmokeRuns',
  libraryAssets: () => 'libraryAssets',
} as const;

// ---------- Overview ----------

export const AdminWindowSchema = z.object({ today: count, last7: count, last30: count });
const money = z.number().nonnegative();
export const AdminOverviewResponseSchema = z.object({
  generatedAt: EpochMsSchema,
  families: count,
  children: count,
  childrenByAgeBand: z.record(AgeBandSchema, count),
  /** family: paying Stripe subscriptions (active or trialing); comped: admin comps; free: everyone else. */
  subscriptions: z.object({ family: count, comped: count, free: count }),
  sessions: AdminWindowSchema,
  voiceMinutes: AdminWindowSchema,
  worldsBuilt: AdminWindowSchema,
  images: AdminWindowSchema,
  moderationBlocks: AdminWindowSchema,
  builder: z.object({
    finished30: count,
    failed30: count,
    failureRate: z.number().min(0).max(1),
  }),
  /** Most recent day last; seven UTC days. */
  daily: z.array(
    z.object({
      date: DateKeySchema,
      sessions: count,
      voiceMinutes: count,
      worlds: count,
      images: count,
      estimatedCostUsd: money,
    }),
  ),
  estimatedCostUsd: z.object({ today: money, last7: money, last30: money }),
});
export type AdminOverviewResponse = z.infer<typeof AdminOverviewResponseSchema>;

// ---------- Families ----------

export const AdminFamilyListQuerySchema = z.object({
  q: optionalText,
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: DocumentIdSchema.optional(),
});
export type AdminFamilyListQuery = z.infer<typeof AdminFamilyListQuerySchema>;

export const AdminFamilyRowSchema = z.object({
  uid: z.string(),
  email: z.string(),
  displayName: z.string(),
  plan: PlanTierSchema,
  compPlan: PlanTierSchema.nullable(),
  subscriptionStatus: SubscriptionDocSchema.shape.status.nullable(),
  suspended: z.boolean(),
  childrenCount: count,
  createdAt: EpochMsSchema,
});
export type AdminFamilyRow = z.infer<typeof AdminFamilyRowSchema>;
export const AdminFamilyListResponseSchema = z.object({
  families: z.array(AdminFamilyRowSchema),
  nextCursor: z.string().nullable(),
});
export type AdminFamilyListResponse = z.infer<typeof AdminFamilyListResponseSchema>;

const usageCounters = UsageDailyDocSchema.pick({ voiceSeconds: true, worlds: true, images: true });
export const AdminFamilyDetailSchema = AdminFamilyRowSchema.extend({
  suspendedReason: z.string().nullable(),
  deletionPending: z.boolean(),
  hasBillingAccount: z.boolean(),
  /** Age bands and tiers only. Never names, avatars or companions. */
  children: z.array(
    z.object({ ageBand: AgeBandSchema, tier: TierSchema, createdAt: EpochMsSchema }),
  ),
  limits: PlanLimitsSchema,
  usageToday: usageCounters,
  usage7: usageCounters,
  worlds: count,
  sessions30: count,
});
export type AdminFamilyDetail = z.infer<typeof AdminFamilyDetailSchema>;

export const AdminPlanBodySchema = z.strictObject({ plan: PlanTierSchema, reason });
export type AdminPlanBody = z.infer<typeof AdminPlanBodySchema>;
export const AdminQuotaResetBodySchema = z.strictObject({ reason });
export type AdminQuotaResetBody = z.infer<typeof AdminQuotaResetBodySchema>;
export const AdminSuspensionBodySchema = z.strictObject({ suspended: z.boolean(), reason });
export type AdminSuspensionBody = z.infer<typeof AdminSuspensionBodySchema>;
export const AdminDeleteFamilyBodySchema = z.strictObject({
  confirmation: z.string().max(300),
  reason,
});
export type AdminDeleteFamilyBody = z.infer<typeof AdminDeleteFamilyBodySchema>;

/** The exact phrase an admin types to confirm a family deletion. */
export function deletionConfirmationFor(email: string): string {
  return `delete ${email.trim().toLowerCase()}`;
}

export const AdminWriteResponseSchema = z.object({ ok: z.literal(true), auditId: z.string() });
export type AdminWriteResponse = z.infer<typeof AdminWriteResponseSchema>;

// ---------- Safety ----------

export const AdminModerationEntrySchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  category: z.enum(['block', 'redirect']),
  /** session: a session the gateway ended for moderation; transcript/image: a recorded event. */
  source: z.enum(['session', 'transcript', 'image']),
  at: EpochMsSchema,
});
export type AdminModerationEntry = z.infer<typeof AdminModerationEntrySchema>;

export const AdminSafetyWorldSchema = z.object({
  worldId: z.string(),
  ownerUid: z.string(),
  title: z.string(),
  status: WorldStatusSchema,
  failedAssets: count,
  hidden: z.boolean(),
  updatedAt: EpochMsSchema,
});
export type AdminSafetyWorld = z.infer<typeof AdminSafetyWorldSchema>;

export const AdminSafetyResponseSchema = z.object({
  moderation: z.array(AdminModerationEntrySchema),
  /** Worlds where at least one image failed the safety or background check. */
  imageRejections: z.array(AdminSafetyWorldSchema),
  /** Worlds whose build failed validation or generation. */
  failedWorlds: z.array(AdminSafetyWorldSchema),
  hiddenWorlds: z.array(AdminSafetyWorldSchema),
});
export type AdminSafetyResponse = z.infer<typeof AdminSafetyResponseSchema>;

export const AdminWorldVisibilityBodySchema = z.strictObject({ hidden: z.boolean(), reason });
export type AdminWorldVisibilityBody = z.infer<typeof AdminWorldVisibilityBodySchema>;

// ---------- Content ----------

export const AdminContentResponseSchema = z.object({
  worlds: z.object({ total: count, ready: count, building: count, failed: count, hidden: count }),
  packs: z.object({
    connected: z.boolean(),
    items: z.array(
      z.object({ id: z.string(), title: z.string(), version: z.string(), challenges: count }),
    ),
  }),
  gameSmoke: z.object({
    runs: count,
    passed: count,
    passRate: z.number().min(0).max(1).nullable(),
    topFailures: z.array(z.object({ reason: z.string(), count })),
  }),
  assetLibrary: z.object({ total: count, approved: count, rejected: count, pending: count }),
});
export type AdminContentResponse = z.infer<typeof AdminContentResponseSchema>;

// ---------- System ----------

export const AdminKillSwitchBodySchema = z.strictObject({ on: z.boolean(), reason });
export type AdminKillSwitchBody = z.infer<typeof AdminKillSwitchBodySchema>;

export const AdminServiceHealthSchema = z.object({
  name: z.string(),
  status: z.enum(['ok', 'down', 'unconfigured']),
  version: z.string().nullable(),
  checkedAt: EpochMsSchema,
});
export const AdminSystemStatusSchema = z.object({
  killSwitch: z.object({
    on: z.boolean(),
    reason: z.string().nullable(),
    updatedAt: EpochMsSchema.nullable(),
    updatedBy: z.string().nullable(),
  }),
  services: z.array(AdminServiceHealthSchema),
  models: z.array(z.object({ role: z.string(), id: z.string() })),
  versions: z.object({
    api: z.string(),
    revision: z.string().nullable(),
    commit: z.string().nullable(),
  }),
});
export type AdminSystemStatus = z.infer<typeof AdminSystemStatusSchema>;

// ---------- Audit ----------

export const AdminAuditQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: DocumentIdSchema.optional(),
});
export const AdminAuditEntrySchema = AdminAuditDocSchema.extend({ id: z.string() });
export type AdminAuditEntry = z.infer<typeof AdminAuditEntrySchema>;
export const AdminAuditResponseSchema = z.object({
  entries: z.array(AdminAuditEntrySchema),
  nextCursor: z.string().nullable(),
});
export type AdminAuditResponse = z.infer<typeof AdminAuditResponseSchema>;

export const ADMIN_ROUTES = {
  overview: { method: 'GET', path: '/v1/admin/overview' },
  families: { method: 'GET', path: '/v1/admin/families' },
  family: { method: 'GET', path: '/v1/admin/families/:uid' },
  setPlan: { method: 'POST', path: '/v1/admin/families/:uid/plan' },
  resetQuota: { method: 'POST', path: '/v1/admin/families/:uid/quota-reset' },
  setSuspension: { method: 'POST', path: '/v1/admin/families/:uid/suspension' },
  deleteFamily: { method: 'POST', path: '/v1/admin/families/:uid/delete' },
  safety: { method: 'GET', path: '/v1/admin/safety' },
  setWorldVisibility: { method: 'POST', path: '/v1/admin/worlds/:worldId/visibility' },
  content: { method: 'GET', path: '/v1/admin/content' },
  system: { method: 'GET', path: '/v1/admin/system' },
  killSwitch: { method: 'POST', path: '/v1/admin/system/kill-switch' },
  appearance: { method: 'GET', path: '/v1/admin/appearance' },
  setAppearance: { method: 'POST', path: '/v1/admin/appearance' },
  audit: { method: 'GET', path: '/v1/admin/audit' },
} as const satisfies Record<string, { method: 'GET' | 'POST'; path: string }>;
export type AdminRouteKey = keyof typeof ADMIN_ROUTES;
