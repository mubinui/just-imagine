import { z } from 'zod';
import { CharacterIdSchema, GuideIdSchema, SpellSchema } from '@just-imagine/protocol';
import { ConceptSchema, DialSchema, IdSchema, TagSchema } from '@just-imagine/scene-schema';
export const toolSchemas = {
  build_world: z.object({
    description: z.string().min(1).max(1000),
    concepts: z.array(ConceptSchema).max(3),
    labKind: z.enum(['projectile', 'galton', 'fractions']).optional(),
  }),
  modify_world: z.object({ instruction: z.string().min(1).max(500) }),
  set_dial: z.object({ dial: DialSchema, value: z.string().max(32) }),
  ask_prediction: z
    .object({
      question: z.string().min(1).max(160),
      options: z.array(z.string().min(1).max(40)).min(2).max(3),
      correctIndex: z.number().int().min(0).max(2),
    })
    .refine((p) => p.correctIndex < p.options.length),
  award_discovery: z.object({
    concept: ConceptSchema,
    title: z.string().optional(),
    kidExplanation: z.string().min(1).max(200),
    realLifeNote: z.string().optional(),
  }),
  switch_character: z.object({ characterId: CharacterIdSchema }),
  summon_guide: z.object({ characterId: GuideIdSchema, topic: z.string().max(200) }),
  cast_spell: z.object({ spell: SpellSchema, target: TagSchema.optional() }),
  set_variable: z.object({ name: IdSchema, value: z.number() }),
  start_challenge: z.object({ challengeId: IdSchema }),
  end_session: z.object({ reason: z.enum(['ended', 'target_reached']).default('ended') }),
};
export const toolDeclarations = Object.entries(toolSchemas).map(([name, schema]) => ({
  name,
  description: name.replaceAll('_', ' '),
  parametersJsonSchema: z.toJSONSchema(schema, { unrepresentable: 'any' }),
}));
