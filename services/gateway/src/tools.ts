import { z } from 'zod';
import {
  CharacterIdSchema,
  GuideIdSchema,
  SpellSchema,
  ChildDestinationSchema,
  LearningMotionSchema,
} from '@just-imagine/protocol';
import {
  ConceptSchema,
  DialSchema,
  IdSchema,
  TagSchema,
  toGeminiJsonSchema,
} from '@just-imagine/scene-schema';
import type { SessionRecord } from './contracts';
import { PACK_DIRECTORY } from './learn';
export const toolSchemas = {
  story_topic: z.strictObject({ topic: z.string().trim().min(3).max(600) }),
  talk_to_character: z.strictObject({ entityId: IdSchema }),
  navigate: z.strictObject({ destination: ChildDestinationSchema }),
  build_world: z.object({
    description: z.string().min(1).max(4000),
    concepts: z.array(ConceptSchema).max(3),
    labKind: z.enum(['projectile', 'galton', 'fractions']).optional(),
    experience: z.enum(['game', 'freeplay']).optional(),
  }),
  modify_world: z.object({ instruction: z.string().min(1).max(2000) }),
  undo_world: z.strictObject({}),
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
  animate_learning_character: z.strictObject({ action: LearningMotionSchema }),
  dress_learning_character: z.strictObject({ description: z.string().trim().min(3).max(600) }),
  reset_learning_look: z.strictObject({}),
  ask_quiz: z.object({ challengeId: IdSchema }),
  award_points: z.object({ challengeId: IdSchema, points: z.number().int().min(1).max(10) }),
  give_hint: z.object({ challengeId: IdSchema }),
  summon_pack_character: z.object({ packId: IdSchema, characterId: IdSchema }),
};
const descriptions: Record<keyof typeof toolSchemas, string> = {
  story_topic:
    'Story room only: send the child’s chosen original topic to the illustrated story workshop. Preserve their idea; do not claim the story is ready. The browser creates it using the parent’s saved learning goals.',
  talk_to_character:
    'Hand the conversation to a character declared in the current created world, such as Earth or a talking tree. Use its exact entityId from the current world context. The child must ask or select that character; this is not one of the fixed app guides.',
  navigate:
    'Help the child move to play (choose explorer), studio (current adventure), gallery (saved worlds), learn (fixed interactive learning worlds), or stories (Katha’s illustrated story room), only when they ask. The browser confirms arrival with a screen note. Parent settings and external sites are unavailable.',
  build_world:
    'Create what the child invents. Preserve their words, cast, setting, actions and rules. Open-ended toys, stories and role-play use experience freeplay and have generated behavior too. Only use game if they want scoring or a finite challenge. Do not add sliders, scores, collection goals or quizzes unless requested. Supply relevant incidental learning concepts; labKind only for an explicitly requested Lab. Returns a job ID before the world is ready.',
  modify_world:
    'Change the current creation according to the child: invent/add/remove characters, redesign appearance or setting, add new actions, rewrite rules, remove a score or change the goal. Describe the requested change in their words. You are not limited to its existing sliders or mechanics. Keep unrelated choices. Returns a job ID; wait for completion before claiming it changed.',
  undo_world:
    'Undo the last completed creative edit of the current world, restoring its prior characters, artwork and behavior. Use when the child says undo, put it back or changes their mind. This does not restart play or delete a world.',
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
    'Change a declared game-rule or Lab slider by its exact name within its bounds. Use this for requests such as more stars, faster orbits or stronger jumps; never invent a variable.',
  start_challenge: 'Labs only: start a challenge using its exact ID from the current world.',
  end_session:
    'Finish after a gentle recap, using ended for a requested stop or target_reached when the activity target is complete.',
  animate_learning_character:
    'Learning character only: visibly wave, dance, swim, spin, bounce or rest when the child asks or an activity benefits. Swim for land characters is explicitly pretend. Do not claim the child actually moved.',
  dress_learning_character:
    'Learning character only: draw the exact child-imagined costume or appearance, with any safe colours, clothing, accessories or silhouette they describe. No preset outfit list. It takes time; the old look stays visible until a ready event. Do not claim finished before that. Keep the learning character identity and accurate facts.',
  reset_learning_look:
    'Learning character only: return to your original authored appearance when the child asks.',
  ask_quiz:
    'Learning character only: ask one of your listed challenges by its exact id. The child sees the question; the result gives you the answer key to judge with, never to say first.',
  award_points:
    'Learning character only: after the child answers your asked challenge correctly, award its points (at most the maximum from ask_quiz). Each challenge pays once per session.',
  give_hint:
    'Learning character only: get the authored hint for a challenge you asked, once per challenge, in the child language, after a wrong answer.',
  summon_pack_character: `Hand the conversation to a Learning World character when the child asks to meet or call one. Use exact ids: ${PACK_DIRECTORY}.`,
};
export const toolDeclarations = Object.entries(toolSchemas).map(([name, schema]) => ({
  name,
  description: descriptions[name as keyof typeof toolSchemas],
  parametersJsonSchema: toGeminiJsonSchema(z.toJSONSchema(schema, { unrepresentable: 'any' })),
}));
type ToolName = keyof typeof toolSchemas;
// A pack character teaches and quizzes; it cannot build worlds or cast spells. The friend can call
// a pack character but never award points itself.
const PERSONA_TOOLS: readonly ToolName[] = [
  'animate_learning_character',
  'dress_learning_character',
  'reset_learning_look',
  'ask_quiz',
  'award_points',
  'give_hint',
  'summon_pack_character',
  'end_session',
];
const QUIZ_TOOLS: readonly ToolName[] = ['ask_quiz', 'award_points', 'give_hint'];
export function toolDeclarationsFor(
  record: Pick<SessionRecord, 'persona' | 'learningMode' | 'story'>,
) {
  return toolDeclarations.filter((tool) =>
    record.story
      ? ['story_topic', 'navigate', 'end_session'].includes(tool.name)
      : tool.name === 'story_topic'
        ? false
        : record.persona
          ? PERSONA_TOOLS.includes(tool.name as ToolName)
          : !QUIZ_TOOLS.includes(tool.name as ToolName) &&
            ![
              'animate_learning_character',
              'dress_learning_character',
              'reset_learning_look',
            ].includes(tool.name) &&
            !(record.learningMode === 'incidental' && tool.name === 'ask_prediction'),
  );
}
export function toolAllowed(
  record: Pick<SessionRecord, 'persona' | 'learningMode' | 'story'>,
  name: string,
): boolean {
  return toolDeclarationsFor(record).some((tool) => tool.name === name);
}
