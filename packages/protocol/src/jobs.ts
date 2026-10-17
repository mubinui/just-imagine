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
  description: z.string().min(1).max(4000),
  // Server-captured moderated child words; an assistant summary must not drop exclusions.
  childRequest: z.string().min(1).max(4000).optional(),
  concepts: z.array(ConceptSchema).max(LIMITS.maxConcepts),
  ageBand: AgeBandSchema,
  tier: TierSchema,
  // The child's language for titles, narration and say lines; jobs queued before it existed are English.
  language: LanguageSchema.optional(),
  experience: z.enum(['game', 'freeplay']).optional(),
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
  instruction: z.string().min(1).max(2000),
  childRequest: z.string().min(1).max(2000).optional(),
  promptVersion: z.string().min(1),
});
export type PatchWorldJob = z.infer<typeof PatchWorldJobSchema>;

export const UndoWorldJobSchema = JobBase.extend({ kind: z.literal('undo') });
export type UndoWorldJob = z.infer<typeof UndoWorldJobSchema>;

export const BuilderJobSchema = z.discriminatedUnion('kind', [
  BuildWorldJobSchema,
  PatchWorldJobSchema,
  UndoWorldJobSchema,
]);
export type BuilderJob = z.infer<typeof BuilderJobSchema>;
