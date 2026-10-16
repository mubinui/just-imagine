import { z } from 'zod';
import { ConceptSchema, LIMITS } from '@just-imagine/scene-schema';
import { PlanTierSchema } from './plans';
import { AgeBandSchema, TierSchema } from './bands';
import { DocumentIdSchema } from './primitives';
import { LanguageSchema } from './firestore';

const JobBase = z.object({
  jobId: DocumentIdSchema,
  worldId: DocumentIdSchema,
  uid: DocumentIdSchema,
  childId: DocumentIdSchema,
  sessionId: DocumentIdSchema,
  plan: PlanTierSchema,
});

export const BuildWorldJobSchema = JobBase.extend({
  kind: z.literal('build'),
  description: z.string().min(1).max(1000),
  concepts: z.array(ConceptSchema).max(LIMITS.maxConcepts),
  ageBand: AgeBandSchema,
  tier: TierSchema,
  // The child's language for titles, narration and say lines; jobs queued before it existed are English.
  language: LanguageSchema.optional(),
  labKind: z.enum(['projectile', 'galton', 'fractions']).optional(),
  styleVersion: z.string().min(1),
  promptVersion: z.string().min(1),
  conversationSummary: z.string().max(2000),
}).refine((job) => job.tier === 'lab' || job.labKind === undefined, {
  message: 'labKind is only valid for lab worlds',
  path: ['labKind'],
});
export type BuildWorldJob = z.infer<typeof BuildWorldJobSchema>;

export const PatchWorldJobSchema = JobBase.extend({
  kind: z.literal('patch'),
  instruction: z.string().min(1).max(500),
  promptVersion: z.string().min(1),
});
export type PatchWorldJob = z.infer<typeof PatchWorldJobSchema>;

export const BuilderJobSchema = z.discriminatedUnion('kind', [
  BuildWorldJobSchema,
  PatchWorldJobSchema,
]);
export type BuilderJob = z.infer<typeof BuilderJobSchema>;
