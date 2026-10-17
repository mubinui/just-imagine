import { z } from 'zod';
import { DocumentIdSchema } from './primitives';

const smallData = z.unknown().refine((value) => {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? null)).length <= 2048;
  } catch {
    return false;
  }
}, 'Tutor context must be at most 2 KB.');
export const TutorHelloSchema = z.strictObject({
  type: z.literal('tutorHello'),
  idToken: z.string().min(1).max(10000),
  lessonId: DocumentIdSchema,
  stepIndex: z.number().int().min(0).max(19),
  sessionId: DocumentIdSchema.optional(),
});
export const TutorStateSchema = z.strictObject({
  type: z.literal('tutorState'),
  simId: z.string().regex(/^[a-z0-9-]{1,64}$/),
  observable: z
    .record(z.string().max(40), z.unknown())
    .refine((v) => smallData.safeParse(v).success),
});
export const TutorEventSchema = z.strictObject({
  type: z.literal('tutorEvent'),
  kind: z.enum(['taskMet', 'reaction', 'checkAnswered', 'stepChanged']),
  data: smallData,
});
export const TutorActionSchema = z.strictObject({
  type: z.literal('tutorAction'),
  kind: z.enum(['highlightParam', 'suggestParam']),
  paramId: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/),
  value: z.number().finite().optional(),
});
