import { z } from 'zod';
import { ConceptSchema, DialSchema, IdSchema, TagSchema } from '@just-imagine/scene-schema';
import { CharacterIdSchema, EmotionSchema, GuideIdSchema, SpellSchema } from './characters';
import { DocumentIdSchema } from './primitives';

export const AUDIO_IN = {
  sampleRate: 16000,
  channels: 1,
  frameMs: 20,
  samplesPerFrame: 320,
  mimeType: 'audio/pcm;rate=16000',
} as const;
export const AUDIO_OUT = {
  sampleRate: 24000,
  channels: 1,
  frameMs: 20,
  samplesPerFrame: 480,
  mimeType: 'audio/pcm;rate=24000',
} as const;

export const InteractionKindSchema = z.enum(['tap', 'drag', 'flick', 'dial']);
export const WorldJobStatusSchema = z.enum([
  'queued',
  'building',
  'placeholders',
  'hero',
  'ready',
  'failed',
]);
export const ErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'QUOTA_EXHAUSTED',
  'SESSION_ACTIVE_ELSEWHERE',
  'KILL_SWITCH',
  'INTERNAL',
]);
export const ByeReasonSchema = z.enum(['ended', 'quota', 'target_reached', 'moderation', 'error']);

export const ClientMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('hello'),
    idToken: z.string().min(1),
    childId: DocumentIdSchema,
    characterId: CharacterIdSchema,
    worldId: DocumentIdSchema.optional(),
    sessionId: DocumentIdSchema.optional(),
  }),
  z.strictObject({ type: z.literal('text'), text: z.string().min(1).max(500) }),
  z
    .strictObject({
      type: z.literal('interaction'),
      kind: InteractionKindSchema,
      entityId: IdSchema.optional(),
      entityName: z.string().max(40).optional(),
      dial: DialSchema.optional(),
      value: z.string().min(1).max(32).optional(),
    })
    .refine(
      (message) =>
        message.kind === 'dial'
          ? message.dial !== undefined && message.value !== undefined
          : message.entityId !== undefined,
      'an interaction needs its entity or dial and value',
    ),
  z.strictObject({
    type: z.literal('simEvent'),
    ruleId: IdSchema,
    concept: ConceptSchema.optional(),
    say: z.string().max(200).optional(),
  }),
  z.strictObject({
    type: z.literal('predictionAnswer'),
    answerIndex: z.number().int().min(0).max(2),
  }),
  z.strictObject({ type: z.literal('switchCharacter'), characterId: CharacterIdSchema }),
  z.strictObject({ type: z.literal('variable'), name: IdSchema, value: z.number() }),
  z.strictObject({
    type: z.literal('challengeResult'),
    challengeId: IdSchema,
    completed: z.boolean(),
  }),
  z.strictObject({ type: z.literal('end') }),
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export const ServerMessageSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('ready'),
    sessionId: DocumentIdSchema,
    characterId: CharacterIdSchema,
    worldId: DocumentIdSchema.optional(),
  }),
  z.strictObject({ type: z.literal('interrupted') }),
  z.strictObject({
    type: z.literal('transcript'),
    role: z.enum(['child', 'character']),
    text: z.string(),
    final: z.boolean(),
  }),
  z.strictObject({
    type: z.literal('characterState'),
    characterId: CharacterIdSchema,
    emotion: EmotionSchema,
    speaking: z.boolean(),
  }),
  z.strictObject({
    type: z.literal('worldJob'),
    jobId: DocumentIdSchema,
    worldId: DocumentIdSchema,
    status: WorldJobStatusSchema,
  }),
  z.strictObject({
    type: z.literal('prediction'),
    question: z.string(),
    options: z.array(z.string()).min(2).max(3),
  }),
  z.strictObject({
    type: z.literal('discovery'),
    concept: ConceptSchema,
    title: z.string(),
    kidExplanation: z.string(),
    realLifeNote: z.string(),
  }),
  z.strictObject({ type: z.literal('dial'), dial: DialSchema, value: z.string() }),
  z.strictObject({ type: z.literal('summon'), characterId: GuideIdSchema }),
  z
    .strictObject({ type: z.literal('spell'), spell: SpellSchema, target: TagSchema.optional() })
    .refine(
      (message) => !['grow', 'shrink'].includes(message.spell) || message.target !== undefined,
      'grow and shrink need a target tag',
    ),
  z.strictObject({ type: z.literal('variable'), name: IdSchema, value: z.number() }),
  z.strictObject({ type: z.literal('challenge'), challengeId: IdSchema }),
  z.strictObject({ type: z.literal('quota'), voiceSecondsLeft: z.number().int().nonnegative() }),
  z.strictObject({ type: z.literal('error'), code: ErrorCodeSchema, message: z.string() }),
  z.strictObject({ type: z.literal('bye'), reason: ByeReasonSchema }),
]);
export type ServerMessage = z.infer<typeof ServerMessageSchema>;

export function encodeMessage(m: ClientMessage | ServerMessage): string {
  return JSON.stringify(m);
}
export function parseClientMessage(raw: string): ClientMessage {
  return ClientMessageSchema.parse(JSON.parse(raw));
}
export function parseServerMessage(raw: string): ServerMessage {
  return ServerMessageSchema.parse(JSON.parse(raw));
}
