import { z } from 'zod';
import { IdSchema } from '@just-imagine/scene-schema';
import { DocumentIdSchema, EpochMsSchema } from './primitives';

// Learning Worlds (quality spec 6b). Pack, character, challenge and pet ids are authored in
// @just-imagine/learning-content; the protocol only checks their shape so it never has to load
// the packs. The gateway and api check membership against the content package.

export const PackIdSchema = IdSchema;
export const LearnPetIdSchema = IdSchema;

/** Points live on the child profile; profiles written before Learning Worlds have none yet. */
export const PointsSchema = z.number().int().min(0);
export const PetListSchema = z
  .array(LearnPetIdSchema)
  .max(32)
  .refine((pets) => new Set(pets).size === pets.length, 'pets are unique');

export function pointsOf(child: { points?: number | null }): number {
  return child.points ?? 0;
}
export function petsOf(child: { pets?: string[] | null }): string[] {
  return child.pets ?? [];
}

// Browser to gateway: hand the voice session to a pack character, and hand it back.
export const SummonPersonaMessageSchema = z.strictObject({
  type: z.literal('summonPersona'),
  packId: PackIdSchema,
  characterId: IdSchema,
});
export const HangUpMessageSchema = z.strictObject({ type: z.literal('hangUp') });

// Gateway to browser. A quiz carries the question only: answer keys never leave the gateway.
export const PersonaMessageSchema = z.strictObject({
  type: z.literal('persona'),
  packId: PackIdSchema,
  characterId: IdSchema,
  name: z.string().min(1).max(40),
});
export const QuizMessageSchema = z.strictObject({
  type: z.literal('quiz'),
  challengeId: IdSchema,
  question: z.string().min(1).max(240),
  options: z.array(z.string().min(1).max(60)).min(2).max(4).optional(),
});
export const PointsMessageSchema = z.strictObject({
  type: z.literal('points'),
  total: PointsSchema,
  delta: z.number().int().min(1).max(10),
  reason: z.string().min(1).max(80),
});
export const PetUnlockedMessageSchema = z.strictObject({
  type: z.literal('petUnlocked'),
  petId: LearnPetIdSchema,
});

// Trusted learning context contains authored IDs and counts, never arbitrary narration or rewards.
export const LearningPlayMessageSchema = z.strictObject({
  type: z.literal('learningPlay'),
  packId: PackIdSchema,
  characterId: IdSchema,
  kind: z.enum(['activity', 'challenge']),
  challengeId: IdSchema.optional(),
  observation: z.string().max(40).optional(),
  missionId: IdSchema.optional(),
  storyPhase: z.enum(['begin', 'progress', 'complete']).optional(),
});
export const LearningMotionSchema = z.enum(['wave', 'dance', 'swim', 'spin', 'bounce', 'rest']);
export const LearningActionMessageSchema = z.strictObject({
  type: z.literal('learningAction'),
  packId: PackIdSchema,
  characterId: IdSchema,
  action: LearningMotionSchema,
});
export const LearningLookMessageSchema = z.strictObject({
  type: z.literal('learningLook'),
  packId: PackIdSchema,
  characterId: IdSchema,
  status: z.enum(['drawing', 'ready', 'failed', 'reset']),
  // Server-produced, compressed image only; never arbitrary URLs or executable SVG.
  image: z
    .string()
    .max(180000)
    .regex(/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/)
    .optional(),
  description: z.string().max(600).optional(),
});

/** users/{uid}/children/{childId}/learnProgress/{packId}: challenges answered in that pack. */
export const LearnProgressDocSchema = z.object({
  packId: PackIdSchema,
  challengesDone: z.array(IdSchema).max(64),
  updatedAt: EpochMsSchema,
});
export type LearnProgressDoc = z.infer<typeof LearnProgressDocSchema>;

const segment = (value: string): string => DocumentIdSchema.parse(value);
export const learnPaths = {
  progressAll: (uid: string, childId: string) =>
    `users/${segment(uid)}/children/${segment(childId)}/learnProgress`,
  progress: (uid: string, childId: string, packId: string) =>
    `users/${segment(uid)}/children/${segment(childId)}/learnProgress/${PackIdSchema.parse(packId)}`,
} as const;

/** What the child's Learn Map and the parent dashboard read. Points are written only by the gateway. */
export const LearnSummaryResponseSchema = z.object({
  points: PointsSchema,
  pets: PetListSchema,
  progress: z.array(LearnProgressDocSchema),
});
export type LearnSummaryResponse = z.infer<typeof LearnSummaryResponseSchema>;

export const LEARN_ROUTES = {
  summary: { method: 'GET', path: '/v1/children/:childId/learn' },
} as const satisfies Record<string, { method: 'GET'; path: string }>;

/** Game bookmarks only. They can never write challenge points or pet rewards. */
export const AdventureProgressSchema = z.strictObject({
  packId: PackIdSchema,
  chaptersDone: z.array(IdSchema).max(40),
  updatedAt: EpochMsSchema,
});
export const AdventureSummarySchema = z.strictObject({
  progress: z.array(AdventureProgressSchema).max(32),
});
export const CompleteChapterSchema = z.strictObject({ chapterId: IdSchema });
export type AdventureProgress = z.infer<typeof AdventureProgressSchema>;
export const adventurePaths = {
  all: (uid: string, childId: string) =>
    `users/${segment(uid)}/children/${segment(childId)}/adventures`,
  pack: (uid: string, childId: string, packId: string) =>
    `users/${segment(uid)}/children/${segment(childId)}/adventures/${PackIdSchema.parse(packId)}`,
};
