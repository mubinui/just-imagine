import { z } from 'zod';
import { ConceptSchema, PatchOpSchema, SceneDocSchema } from '@just-imagine/scene-schema';
import { PlanTierSchema } from './plans';
import { CharacterIdSchema, CompanionSchema } from './characters';
import { AgeBandSchema, TierSchema } from './bands';
import { ByeReasonSchema } from './ws';
import { DateKeySchema, DocumentIdSchema, EpochMsSchema } from './primitives';

const epochMs = EpochMsSchema;

export const AvatarSchema = z.enum(['fox', 'owl', 'panda', 'bunny', 'whale', 'robot']);

export const UserDocSchema = z.object({
  email: z.string(),
  displayName: z.string(),
  consentAt: epochMs,
  plan: PlanTierSchema,
  stripeCustomerId: z.string().nullable(),
  createdAt: epochMs,
});
export type UserDoc = z.infer<typeof UserDocSchema>;

export const ChildDocSchema = z.object({
  firstName: z.string().trim().min(1).max(30),
  avatar: AvatarSchema,
  companion: CompanionSchema.nullable().optional(),
  ageBand: AgeBandSchema,
  tier: TierSchema,
  labsUnlocked: z.boolean(),
  captions: z.boolean(),
  sessionTargetMinutes: z.number().int().min(8).max(20),
  loopsCompleted: z.number().int().min(0),
  createdAt: epochMs,
});
export type ChildDoc = z.infer<typeof ChildDocSchema>;

export const DiscoveryDocSchema = z.object({
  concept: ConceptSchema,
  firstAt: epochMs,
  count: z.number().int().min(1),
  worldIds: z.array(z.string()),
  title: z.string(),
  kidExplanation: z.string(),
  realLifeNote: z.string(),
});
export type DiscoveryDoc = z.infer<typeof DiscoveryDocSchema>;

export const AssetStatusSchema = z.enum(['placeholder', 'generating', 'ready', 'failed']);
export const WorldStatusSchema = z.enum(['building', 'ready', 'failed']);

export const WorldDocSchema = z.object({
  ownerUid: z.string(),
  childId: z.string(),
  title: z.string(),
  status: WorldStatusSchema,
  doc: SceneDocSchema,
  schemaVersion: z.literal(1),
  promptVersion: z.string(),
  styleVersion: z.string(),
  assets: z.record(
    z.string(),
    z.object({
      status: AssetStatusSchema,
      url: z.string().optional(),
      colliderUrl: z.string().optional(),
    }),
  ),
  concepts: z.array(ConceptSchema),
  thumbnailUrl: z.string().nullable(),
  jobId: z.string(),
  createdAt: epochMs,
  updatedAt: epochMs,
});
export type WorldDoc = z.infer<typeof WorldDocSchema>;

export const WorldVersionDocSchema = z.object({
  doc: SceneDocSchema,
  patch: z.array(PatchOpSchema).nullable(),
  reason: z.string(),
  createdAt: epochMs,
});
export type WorldVersionDoc = z.infer<typeof WorldVersionDocSchema>;

export const SessionDocSchema = z.object({
  uid: z.string(),
  childId: z.string(),
  characterIds: z.array(CharacterIdSchema),
  worldIds: z.array(z.string()),
  startedAt: epochMs,
  endedAt: epochMs.nullable(),
  voiceSeconds: z.number().int().min(0),
  turns: z.number().int().min(0),
  beats: z.number().int().min(0),
  summary: z.string().nullable(),
  discoveries: z.array(ConceptSchema),
  predictions: z.array(
    z.object({
      question: z.string(),
      answerIndex: z.number().int().nullable(),
      correctIndex: z.number().int(),
    }),
  ),
  endReason: ByeReasonSchema.nullable(),
  active: z.boolean(),
});
export type SessionDoc = z.infer<typeof SessionDocSchema>;

export const UsageDailyDocSchema = z.object({
  uid: z.string(),
  date: DateKeySchema,
  voiceSeconds: z.number().int().min(0),
  worlds: z.number().int().min(0),
  images: z.number().int().min(0),
});
export type UsageDailyDoc = z.infer<typeof UsageDailyDocSchema>;

export const SubscriptionDocSchema = z.object({
  stripeSubscriptionId: z.string(),
  status: z.enum(['active', 'past_due', 'canceled', 'trialing', 'incomplete']),
  tier: PlanTierSchema,
  currentPeriodEnd: epochMs,
});
export type SubscriptionDoc = z.infer<typeof SubscriptionDocSchema>;

export const AssetCacheDocSchema = z.object({
  url: z.string(),
  colliderUrl: z.string().nullable(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  safetyChecked: z.boolean(),
  createdAt: epochMs,
});
export type AssetCacheDoc = z.infer<typeof AssetCacheDocSchema>;

export const RuntimeConfigDocSchema = z.object({ killSwitch: z.boolean(), updatedAt: epochMs });
export type RuntimeConfigDoc = z.infer<typeof RuntimeConfigDocSchema>;

const segment = (value: string): string => DocumentIdSchema.parse(value);
const versionNumber = z.number().int().nonnegative();

export const paths = {
  user: (uid: string) => `users/${segment(uid)}`,
  children: (uid: string) => `users/${segment(uid)}/children`,
  child: (uid: string, childId: string) => `users/${segment(uid)}/children/${segment(childId)}`,
  discoveries: (uid: string, childId: string) =>
    `users/${segment(uid)}/children/${segment(childId)}/discoveries`,
  discovery: (uid: string, childId: string, concept: string) =>
    `users/${segment(uid)}/children/${segment(childId)}/discoveries/${ConceptSchema.parse(concept)}`,
  worlds: () => 'worlds',
  world: (worldId: string) => `worlds/${segment(worldId)}`,
  worldVersions: (worldId: string) => `worlds/${segment(worldId)}/versions`,
  worldVersion: (worldId: string, n: number) =>
    `worlds/${segment(worldId)}/versions/${versionNumber.parse(n)}`,
  sessions: () => 'sessions',
  session: (sessionId: string) => `sessions/${segment(sessionId)}`,
  usageDaily: (uid: string, date: string) =>
    `usageDaily/${segment(uid)}_${DateKeySchema.parse(date)}`,
  subscription: (uid: string) => `subscriptions/${segment(uid)}`,
  assetCache: (hash: string) => `assetCache/${segment(hash)}`,
  runtimeConfig: () => 'config/runtime',
} as const;

export function yyyymmdd(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new RangeError('expected a valid Date');
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return DateKeySchema.parse(`${y}${m}${d}`);
}
