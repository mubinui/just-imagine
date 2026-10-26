import { z } from 'zod';
import { StoryPreferencesSchema } from './stories';
import {
  ConceptSchema,
  PatchOpSchema,
  SceneDocSchema,
  MotionAtlasSchema,
} from '@just-imagine/scene-schema';
import { PlanTierSchema } from './plans';
import { CharacterIdSchema, CompanionSchema } from './characters';
import { AgeBandSchema, TierSchema } from './bands';
import { ByeReasonSchema } from './ws';
import { DateKeySchema, DocumentIdSchema, EpochMsSchema } from './primitives';
import { PetListSchema, PointsSchema } from './learn';

const epochMs = EpochMsSchema;

export const AvatarSchema = z.enum(['fox', 'owl', 'panda', 'bunny', 'whale', 'robot']);

export const LanguageSchema = z.enum(['en', 'bn']);
export type Language = z.infer<typeof LanguageSchema>;
export const DEFAULT_LANGUAGE: Language = 'en';

/** The language a child profile or builder job speaks. Records written before the field existed are English. */
export function languageOf(record: { language?: Language | null }): Language {
  return record.language === 'bn' ? 'bn' : DEFAULT_LANGUAGE;
}

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
  // Absent on profiles created before the language setting existed; read it through languageOf().
  language: LanguageSchema.optional(),
  // Learning Worlds: absent on older profiles; read through pointsOf() and petsOf() (0 and []).
  points: PointsSchema.optional(),
  storyPreferences: StoryPreferencesSchema.optional(),
  pets: PetListSchema.optional(),
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

/** The child's idea and successive requests, independent of the compiled scene. */
export const CreationSchema = z.object({
  originalWish: z.string().min(1).max(4000),
  changes: z.array(z.string().min(1).max(2000)).max(100),
  mode: z.enum(['game', 'freeplay']),
  // Set when the world fell back to a template or sample game instead of a generated one.
  fallback: z.enum(['template', 'sample']).optional(),
});
export type Creation = z.infer<typeof CreationSchema>;

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
  creation: CreationSchema.optional(),
  revisionId: DocumentIdSchema.optional(),
});
export type WorldDoc = z.infer<typeof WorldDocSchema>;

export const WorldVersionDocSchema = z.object({
  doc: SceneDocSchema,
  patch: z.array(PatchOpSchema).nullable(),
  reason: z.string(),
  createdAt: epochMs,
  /** Atomic pre-edit snapshot; its revisionId forms the undo chain. */
  previousWorld: WorldDocSchema.optional(),
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
  /** `no-payment`: started without a payment while the deployment takes no payments. */
  source: z.enum(['stripe', 'no-payment']).optional(),
  /** The family offer chosen from PLAN_CATALOGUE, for example `family-year`. */
  planId: z.enum(['family-month', 'family-year']).optional(),
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
  animation: MotionAtlasSchema.optional(),
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
