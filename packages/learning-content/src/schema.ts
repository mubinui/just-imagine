import { z } from 'zod';
import { IdSchema, SceneDocSchema, validateScene } from '@just-imagine/scene-schema';

// Prebuilt Gemini Live voice names (native-audio set). The gateway passes `voice` straight through
// as `voiceName`, so a typo here would only surface at session start; the enum catches it at build.
export const LIVE_VOICES = [
  'Achernar',
  'Achird',
  'Algenib',
  'Algieba',
  'Alnilam',
  'Aoede',
  'Autonoe',
  'Callirrhoe',
  'Charon',
  'Despina',
  'Enceladus',
  'Erinome',
  'Fenrir',
  'Gacrux',
  'Iapetus',
  'Kore',
  'Laomedeia',
  'Leda',
  'Orus',
  'Puck',
  'Pulcherrima',
  'Rasalgethi',
  'Sadachbia',
  'Sadaltager',
  'Schedar',
  'Sulafat',
  'Umbriel',
  'Vindemiatrix',
  'Zephyr',
  'Zubenelgenubi',
] as const;
export const VoiceSchema = z.enum(LIVE_VOICES);
export type LiveVoice = z.infer<typeof VoiceSchema>;

export const PACK_SECTIONS = ['space', 'animals', 'body', 'food', 'hygiene', 'exercise'] as const;
export const PackSectionSchema = z.enum(PACK_SECTIONS);
export type PackSection = z.infer<typeof PackSectionSchema>;

export const PET_IDS = [
  'tuktuk',
  'chiku',
  'bubbli',
  'meghla',
  'tara',
  'golu',
  'jhilmil',
  'dhumketu',
] as const;
export const PetIdSchema = z.enum(PET_IDS);
export type PetId = z.infer<typeof PetIdSchema>;

export const PetSchema = z.object({
  id: PetIdSchema,
  name: z.string().min(1).max(24),
  nameBn: z.string().min(1).max(24),
  look: z.string().min(1).max(200),
  sound: z
    .string()
    .regex(/^assets\/sounds\/pets\/[a-z0-9_-]+\.ogg$/, 'pet sounds live in assets/sounds/pets'),
  unlockPoints: z.number().int().min(1),
});
export type Pet = z.infer<typeof PetSchema>;

const sentence = z.string().trim().min(1).max(240);
const fact = z.string().trim().min(1).max(200);

export const PackCharacterSchema = z
  .object({
    id: IdSchema,
    name: z.string().trim().min(1).max(40),
    nameBn: z.string().trim().min(1).max(40),
    look: sentence,
    voice: VoiceSchema,
    personality: z.string().trim().min(1).max(400),
    facts: z.array(fact).min(6).max(10),
    factsBn: z.array(fact).min(6).max(10),
    catchphrase: z.string().trim().min(1).max(80),
    catchphraseBn: z.string().trim().min(1).max(80),
    funnyAngle: sentence,
  })
  .refine((c) => c.facts.length === c.factsBn.length, {
    message: 'facts and factsBn must have the same number of entries',
    path: ['factsBn'],
  });
export type PackCharacter = z.infer<typeof PackCharacterSchema>;

export const ComesCloserSchema = z.enum(['swoop', 'grow', 'ring']);
export type ComesCloser = z.infer<typeof ComesCloserSchema>;

export const HotspotSchema = z.object({
  entityId: IdSchema,
  characterId: IdSchema,
  comesCloser: ComesCloserSchema,
});
export type Hotspot = z.infer<typeof HotspotSchema>;

export const SoundProvenanceSchema = z
  .object({
    source: z.string().trim().min(1),
    licence: z.string().trim(),
    url: z.string().trim(),
    author: z.string().trim().optional(),
  })
  .refine((p) => p.source === 'missing' || (p.licence.length > 0 && p.url.length > 0), {
    message: 'a sourced recording needs a licence and a url; use source "missing" otherwise',
  });
export type SoundProvenance = z.infer<typeof SoundProvenanceSchema>;

export const PackSoundSchema = z.object({
  entityId: IdSchema,
  file: z
    .string()
    .regex(/^assets\/sounds\/[a-z0-9_-]+\.ogg$/, 'sound files live in assets/sounds and are ogg'),
  provenance: SoundProvenanceSchema,
});
export type PackSound = z.infer<typeof PackSoundSchema>;

export const PackChallengeSchema = z.object({
  id: IdSchema,
  characterId: IdSchema,
  question: sentence,
  questionBn: sentence,
  answerKey: z.string().trim().min(1).max(80),
  accepted: z.array(z.string().trim().min(1).max(80)).min(6).max(40),
  hint: sentence,
  hintBn: sentence,
  points: z.number().int().min(1).max(10),
  petReward: PetIdSchema.optional(),
});
export type PackChallenge = z.infer<typeof PackChallengeSchema>;

export const ActivityKindSchema = z.enum([
  'orbit',
  'listen',
  'wash',
  'brush',
  'pulse',
  'breathe',
  'signal',
  'digest',
  'assemble',
  'plate',
  'move',
]);
export const LearningActivitySchema = z.object({
  characterId: IdSchema,
  kind: ActivityKindSchema,
  title: sentence,
  titleBn: sentence,
  explanation: sentence,
  explanationBn: sentence,
});
export type LearningActivity = z.infer<typeof LearningActivitySchema>;

export const WorldPackSchema = z.object({
  id: IdSchema,
  section: PackSectionSchema,
  title: z.string().trim().min(1).max(60),
  titleBn: z.string().trim().min(1).max(60),
  notes: z.string().trim().max(600).optional(),
  scene: SceneDocSchema,
  characters: z.array(PackCharacterSchema).min(1).max(16),
  hotspots: z.array(HotspotSchema).max(24),
  sounds: z.array(PackSoundSchema).max(24),
  challenges: z.array(PackChallengeSchema).max(20),
  activities: z.array(LearningActivitySchema).max(24).default([]),
});
export type WorldPack = z.infer<typeof WorldPackSchema>;

export type PackIssueCode =
  | 'SCHEMA_INVALID'
  | 'SCENE_ISSUE'
  | 'DUPLICATE_ID'
  | 'UNKNOWN_ENTITY_REF'
  | 'UNKNOWN_CHARACTER_REF'
  | 'DUPLICATE_ACCEPTED'
  | 'ANSWER_IN_ID';

export interface PackIssue {
  code: PackIssueCode;
  path: string;
  message: string;
}

const BANGLA_BLOCK = /[ঀ-৿]/;
export function isBanglaScript(text: string): boolean {
  return BANGLA_BLOCK.test(text);
}

export function normaliseAnswer(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function validatePack(input: unknown): PackIssue[] {
  const parsed = WorldPackSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({
      code: 'SCHEMA_INVALID',
      path: i.path.map(String).join('.'),
      message: i.message,
    }));
  }
  const pack = parsed.data;
  const issues: PackIssue[] = [];
  const report = (code: PackIssueCode, path: string, message: string): void => {
    issues.push({ code, path, message });
  };

  const scene = validateScene(pack.scene);
  for (const issue of scene.issues) {
    report('SCENE_ISSUE', `scene.${issue.path}`, `[${issue.code}] ${issue.message}`);
  }

  const entityIds = new Set(pack.scene.entities.map((e) => e.id));
  const characterIds = new Set<string>();
  pack.characters.forEach((c, i) => {
    if (characterIds.has(c.id))
      report('DUPLICATE_ID', `characters.${i}.id`, `duplicate character id "${c.id}"`);
    characterIds.add(c.id);
  });

  const hotspotEntities = new Set<string>();
  pack.hotspots.forEach((h, i) => {
    if (!entityIds.has(h.entityId))
      report('UNKNOWN_ENTITY_REF', `hotspots.${i}.entityId`, `no entity "${h.entityId}" in scene`);
    if (!characterIds.has(h.characterId))
      report(
        'UNKNOWN_CHARACTER_REF',
        `hotspots.${i}.characterId`,
        `no character "${h.characterId}"`,
      );
    if (hotspotEntities.has(h.entityId))
      report('DUPLICATE_ID', `hotspots.${i}.entityId`, `entity "${h.entityId}" has two hotspots`);
    hotspotEntities.add(h.entityId);
  });

  pack.sounds.forEach((s, i) => {
    if (!entityIds.has(s.entityId))
      report('UNKNOWN_ENTITY_REF', `sounds.${i}.entityId`, `no entity "${s.entityId}" in scene`);
  });

  const activityCharacters = new Set<string>();
  pack.activities.forEach((a, i) => {
    if (!characterIds.has(a.characterId))
      report('UNKNOWN_CHARACTER_REF', `activities.${i}.characterId`, 'Unknown activity character');
    if (activityCharacters.has(a.characterId))
      report('DUPLICATE_ID', `activities.${i}.characterId`, 'One activity per character');
    activityCharacters.add(a.characterId);
  });

  const challengeIds = new Set<string>();
  pack.challenges.forEach((c, i) => {
    const p = `challenges.${i}`;
    if (challengeIds.has(c.id))
      report('DUPLICATE_ID', `${p}.id`, `duplicate challenge id "${c.id}"`);
    challengeIds.add(c.id);
    if (!characterIds.has(c.characterId))
      report('UNKNOWN_CHARACTER_REF', `${p}.characterId`, `no character "${c.characterId}"`);
    // Challenge ids are shown to the voice model, so they must not give the answer away.
    const keyAsId = normaliseAnswer(c.answerKey).replace(/[^a-z0-9]+/g, '_');
    if (keyAsId && c.id.includes(keyAsId))
      report(
        'ANSWER_IN_ID',
        `${p}.id`,
        `challenge id "${c.id}" contains its answer "${c.answerKey}"`,
      );
    const seen = new Set<string>();
    c.accepted.forEach((answer, j) => {
      const key = normaliseAnswer(answer);
      if (seen.has(key))
        report(
          'DUPLICATE_ACCEPTED',
          `${p}.accepted.${j}`,
          `"${answer}" repeats an accepted answer`,
        );
      seen.add(key);
    });
  });

  return issues;
}
