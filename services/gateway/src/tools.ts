import { z } from 'zod';
import {
  CharacterIdSchema,
  GuideIdSchema,
  SpellSchema,
  ChildDestinationSchema,
} from '@just-imagine/protocol';
import {
  ConceptSchema,
  DialSchema,
  IdSchema,
  TagSchema,
  toGeminiJsonSchema,
} from '@just-imagine/scene-schema';
export const toolSchemas = {
  navigate: z.strictObject({ destination: ChildDestinationSchema }),
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
const descriptions: Record<keyof typeof toolSchemas, string> = {
  navigate:
    'Help the child move to play (choose explorer), studio (current adventure), or gallery (saved worlds), only when they ask. The browser confirms arrival with a screen note. Parent settings and external sites are unavailable.',
  build_world:
    'Create a safe imagined world. Supply 1-3 learning concepts; labKind selects projectile, galton, or fractions only when Labs are available. Returns a job ID before the world is ready.',
  modify_world:
    'Request a bounded safe change to the current world; keep world identity and tier. Returns an asynchronous job ID.',
  set_dial:
    'Set a declared current-world dial: gravity earth/moon/jupiter/none, wind none/breeze/storm, or heroMaterial to an existing material name.',
  ask_prediction:
    'Ask one short prediction with two or three answer choices; correctIndex is zero-based. Wait for the child before explaining.',
  award_discovery:
    'Record an observed learning concept with a short child-friendly explanation. The server supplies the curated title and real-world note.',
  switch_character:
    'Hand the conversation to an age-appropriate companion or guide; preserve the learning context.',
  summon_guide:
    'Summon Pori for physics, Onko Mama for maths, or Jadu Kaka for pretend magic; supply a short safe topic.',
  cast_spell:
    'Jadu Kaka only: announce a supported pretend physics spell, use an existing target tag if needed, and explain the science.',
  set_variable:
    'Labs only: set an existing variable by its exact name and a numeric value within the declared range.',
  start_challenge: 'Labs only: start a challenge using its exact ID from the current world.',
  end_session:
    'Finish after a gentle recap, using ended for a requested stop or target_reached when the activity target is complete.',
};
export const toolDeclarations = Object.entries(toolSchemas).map(([name, schema]) => ({
  name,
  description: descriptions[name as keyof typeof toolSchemas],
  parametersJsonSchema: toGeminiJsonSchema(z.toJSONSchema(schema, { unrepresentable: 'any' })),
}));
