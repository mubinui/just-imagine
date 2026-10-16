import { z } from 'zod';
import { CONCEPTS, DIALS } from './concepts';
import { LIMITS } from './limits';

const ID_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
export const IdSchema = z.string().regex(ID_PATTERN, 'ids are lowercase snake_case, max 32 chars');
export const TagSchema = z
  .string()
  .regex(ID_PATTERN, 'tags are lowercase snake_case, max 32 chars');
const unit = z.number().min(0).max(1);
export const Vec2Schema = z.object({ x: z.number(), y: z.number() });
export type Vec2 = z.infer<typeof Vec2Schema>;

export const ConceptSchema = z.enum(CONCEPTS);
export const DialSchema = z.enum(DIALS);

/** Optional presentation metadata; old worlds keep their original physics and art. */
export const MotionAtlasSchema = z
  .object({
    columns: z.number().int().min(1).max(8),
    rows: z.number().int().min(1).max(8),
    frames: z.number().int().min(2).max(32),
    anchor: z.object({ x: unit, y: unit }).optional(),
    content: z
      .object({ width: z.number().positive().max(1), height: z.number().positive().max(1) })
      .optional(),
  })
  .refine((a) => a.frames <= a.columns * a.rows, 'frames exceed atlas cells');
export const LocomotionSchema = z.object({
  kind: z.enum(['walk', 'run', 'swim', 'fly', 'roll']),
  /** World metres per complete stride or propulsion cycle. */
  stride: z.number().min(0.1).max(8),
  facing: z.enum(['right', 'left']),
  /** Vehicle wheel centres/radii, as fractions of the unscaled body dimensions. */
  wheels: z
    .array(
      z.object({
        x: z.number().min(-0.5).max(0.5),
        y: z.number().min(-0.5).max(0.5),
        radius: z.number().min(0.03).max(0.3),
      }),
    )
    .min(1)
    .max(6)
    .optional(),
});
export type Locomotion = z.infer<typeof LocomotionSchema>;

export const AssetRefSchema = z.object({
  url: z.string(),
  colliderUrl: z.string().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  status: z.enum(['placeholder', 'ready']),
  animation: MotionAtlasSchema.optional(),
});
export type AssetRef = z.infer<typeof AssetRefSchema>;

export const MaterialSchema = z.object({
  density: z.number().min(LIMITS.density.min).max(LIMITS.density.max),
  friction: unit,
  restitution: unit,
  softness: unit,
  buoyant: z.boolean(),
  breakable: z.boolean(),
  pretend: z.boolean(),
});
export type Material = z.infer<typeof MaterialSchema>;

export const ParticleKindSchema = z.enum(['sparkle', 'bubble', 'smoke', 'leaf']);

export const BehaviorSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('wander'), speed: z.number().min(0).max(5) }),
  z.object({
    type: z.literal('float'),
    amplitude: z.number().min(0).max(2),
    period: z.number().min(0.5).max(20),
  }),
  z.object({ type: z.literal('bounceIdle') }),
  z.object({ type: z.literal('glow'), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }),
  z.object({
    type: z.literal('emit'),
    particle: ParticleKindSchema,
    rate: z.number().min(0).max(50),
  }),
  z.object({ type: z.literal('face'), target: z.enum(['pointer', 'hero']) }),
]);
export type Behavior = z.infer<typeof BehaviorSchema>;

const SizeSchema = z.object({
  width: z.number().min(LIMITS.minEntitySize).max(LIMITS.maxTerrainSize),
  height: z.number().min(LIMITS.minEntitySize).max(LIMITS.maxTerrainSize),
});

export const BodySchema = z
  .object({
    shape: z.enum(['auto', 'circle', 'box', 'polygon']),
    material: z.string().min(1),
    isStatic: z.boolean(),
    size: SizeSchema,
    vertices: z.array(Vec2Schema).min(3).max(16).optional(),
  })
  .refine((body) => body.shape !== 'polygon' || body.vertices !== undefined, {
    message: 'polygon bodies require vertices',
    path: ['vertices'],
  });
export type Body = z.infer<typeof BodySchema>;

export const EntityKindSchema = z.enum(['sprite', 'ground', 'water', 'particle']);

/** A character created for this world, rather than a fixed member of the app's cast. */
export const SceneCharacterSchema = z.object({
  name: z.string().trim().min(1).max(40),
  personality: z.string().trim().min(1).max(240),
  greeting: z.string().trim().min(1).max(160),
  topic: z.string().trim().min(1).max(160),
});
export type SceneCharacter = z.infer<typeof SceneCharacterSchema>;

export const EntitySchema = z.object({
  id: IdSchema,
  kind: EntityKindSchema,
  name: z.string().min(1).max(40),
  description: z.string().min(1).max(200),
  asset: AssetRefSchema.optional(),
  body: BodySchema,
  transform: z.object({ x: z.number(), y: z.number(), rotation: z.number() }),
  tags: z.array(TagSchema).max(8),
  behaviors: z.array(BehaviorSchema).max(4),
  pretend: z.boolean(),
  character: SceneCharacterSchema.optional(),
  locomotion: LocomotionSchema.optional(),
});
export type Entity = z.infer<typeof EntitySchema>;

export const JointSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('spring'),
    a: IdSchema,
    b: IdSchema,
    stiffness: z.number().min(0).max(1000),
    damping: z.number().min(0).max(100),
    restLength: z.number().min(0).max(16),
  }),
  z.object({ type: z.literal('pin'), a: IdSchema, b: IdSchema, anchor: Vec2Schema }),
]);
export type Joint = z.infer<typeof JointSchema>;

export const RuleWhenSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('collision'),
    a: TagSchema,
    b: TagSchema,
    minImpulse: z.number().min(0).optional(),
  }),
  z.object({ event: z.literal('tap'), target: TagSchema }),
  z.object({ event: z.literal('enterMedium'), target: TagSchema, medium: z.literal('water') }),
  z.object({ event: z.literal('timer'), everySeconds: z.number().min(1).max(120) }),
  z.object({ event: z.literal('dial'), dial: DialSchema, value: z.string().min(1).max(32) }),
  z.object({ event: z.literal('challengeComplete'), id: IdSchema }),
]);
export type RuleWhen = z.infer<typeof RuleWhenSchema>;

export const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('spawn'),
    template: IdSchema,
    at: z.union([z.literal('hero'), z.literal('pointer'), Vec2Schema]),
    count: z.number().int().min(1).max(10),
  }),
  z.object({ action: z.literal('applyImpulse'), target: TagSchema, impulse: Vec2Schema }),
  z.object({ action: z.literal('setMaterial'), target: TagSchema, material: z.string().min(1) }),
  z.object({ action: z.literal('remove'), target: TagSchema }),
  z.object({ action: z.literal('celebrate'), style: z.enum(['confetti', 'sparkle', 'splash']) }),
  z.object({ action: z.literal('say'), text: z.string().min(1).max(200) }),
  z.object({
    action: z.literal('sound'),
    cue: z.enum(['boing', 'splat', 'splash', 'whoosh', 'ding']),
  }),
  z.object({ action: z.literal('launch'), target: TagSchema }),
  z.object({ action: z.literal('setGravity'), y: z.number().min(-30).max(30) }),
  z.object({ action: z.literal('setTimeScale'), value: z.number().min(0.1).max(2) }),
  z.object({
    action: z.literal('scaleEntity'),
    target: TagSchema,
    factor: z.number().min(0.5).max(2),
  }),
]);
export type Action = z.infer<typeof ActionSchema>;

export const LAB_LIMITS = { maxVariables: 6, maxVisuals: 6, maxChallenges: 3 } as const;

export const VariableBindSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('game') }),
  z.object({ kind: z.literal('gravity') }),
  z.object({ kind: z.literal('wind') }),
  z.object({ kind: z.literal('timeScale') }),
  z.object({
    kind: z.literal('material'),
    entity: IdSchema,
    prop: z.enum(['density', 'friction', 'restitution']),
  }),
  z.object({ kind: z.literal('launch'), entity: IdSchema, prop: z.enum(['speed', 'angle']) }),
  z.object({ kind: z.literal('scale'), entity: IdSchema }),
]);
export type VariableBind = z.infer<typeof VariableBindSchema>;

export const VariableSchema = z.object({
  label: z.string().min(1).max(30),
  min: z.number(),
  max: z.number(),
  step: z.number().positive(),
  value: z.number(),
  unit: z.string().max(8),
  binds: VariableBindSchema,
});
export type Variable = z.infer<typeof VariableSchema>;

export const VariablesSchema = z
  .record(IdSchema, VariableSchema)
  .refine((variables) => Object.keys(variables).length <= LAB_LIMITS.maxVariables, {
    message: `at most ${LAB_LIMITS.maxVariables} variables`,
  });

const EntityPropSchema = z.enum(['x', 'y', 'speed', 'height']);

export const VisualSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('plot'),
    id: IdSchema,
    title: z.string().min(1).max(40),
    x: z.literal('time'),
    y: z.object({ entity: IdSchema, prop: EntityPropSchema }),
    maxSeconds: z.number().min(1).max(60),
  }),
  z.object({
    type: z.literal('vector'),
    entity: IdSchema,
    show: z.enum(['velocity', 'gravity', 'net']),
  }),
  z.object({ type: z.literal('ruler'), from: Vec2Schema, to: Vec2Schema }),
  z.object({
    type: z.literal('stopwatch'),
    startOn: z.enum(['launch', 'tap']),
    stopOn: z.object({ event: z.literal('collision'), a: TagSchema, b: TagSchema }),
  }),
  z.object({
    type: z.literal('numberLine'),
    from: z.number(),
    to: z.number(),
    step: z.number().positive(),
    marker: z.object({ entity: IdSchema, prop: z.literal('x') }),
  }),
  z.object({
    type: z.literal('histogram'),
    id: IdSchema,
    title: z.string().min(1).max(40),
    bins: z.number().int().min(2).max(12),
    source: z.object({ tag: TagSchema, prop: z.literal('x') }),
  }),
  z.object({
    type: z.literal('fraction'),
    id: IdSchema,
    numerator: z.number().int().min(0).max(12),
    denominator: z.number().int().min(1).max(12),
    style: z.enum(['bar', 'pie']),
    at: Vec2Schema,
  }),
  z.object({ type: z.literal('label'), entity: IdSchema, text: z.string().min(1).max(40) }),
]);
export type Visual = z.infer<typeof VisualSchema>;

export const ChallengeCheckSchema = z.discriminatedUnion('event', [
  z.object({ event: z.literal('collision'), a: TagSchema, b: TagSchema }),
  z.object({
    event: z.literal('histogramFilled'),
    id: IdSchema,
    count: z.number().int().min(1).max(500),
  }),
]);

export const ChallengeSchema = z.object({
  id: IdSchema,
  goal: z.string().min(1).max(120),
  check: ChallengeCheckSchema,
  hint: z.string().min(1).max(160),
  concept: ConceptSchema,
  reward: z.array(ActionSchema).min(1).max(3),
});
export type Challenge = z.infer<typeof ChallengeSchema>;

export const RuleSchema = z.object({
  id: IdSchema,
  when: RuleWhenSchema,
  then: z.array(ActionSchema).min(1).max(5),
  concept: ConceptSchema.optional(),
  once: z.boolean(),
});
export type Rule = z.infer<typeof RuleSchema>;

export const PredictionSchema = z
  .object({
    question: z.string().min(1).max(160),
    options: z.array(z.string().min(1).max(40)).min(2).max(3),
    correctIndex: z.number().int().min(0).max(2),
    concept: ConceptSchema,
  })
  .refine((prediction) => prediction.correctIndex < prediction.options.length, {
    message: 'correctIndex must refer to a supplied option',
    path: ['correctIndex'],
  });
export type Prediction = z.infer<typeof PredictionSchema>;

export const LearningSchema = z.object({
  /** Creative play does not require a ground or a scripted teaching rule. */
  mode: z.enum(['guided', 'incidental']).optional(),
  concepts: z.array(ConceptSchema).min(1).max(LIMITS.maxConcepts),
  prediction: PredictionSchema,
  dials: z.array(DialSchema).max(LIMITS.maxDials),
  heroEntityId: IdSchema,
});
export type Learning = z.infer<typeof LearningSchema>;

export const ThemeSchema = z.object({
  paletteHint: z.string().max(60),
  timeOfDay: z.enum(['day', 'sunset', 'night']),
  backdropDescription: z.string().min(1).max(200),
  backdrop: AssetRefSchema,
  midLayerDescription: z.string().min(1).max(200).optional(),
  midLayer: AssetRefSchema.optional(),
});

export const EnvironmentSchema = z.object({
  gravity: Vec2Schema,
  wind: Vec2Schema,
  medium: z.enum(['air', 'water', 'space']),
  bounds: z.object({
    width: z.literal(LIMITS.bounds.width),
    height: z.literal(LIMITS.bounds.height),
  }),
  seed: z.number().int().min(0),
});
export type Environment = z.infer<typeof EnvironmentSchema>;

export const TierSchema = z.enum(['playground', 'lab']);
export type Tier = z.infer<typeof TierSchema>;

export const SceneDocObjectSchema = z.object({
  schemaVersion: z.literal(1),
  worldId: z.string().min(1),
  tier: TierSchema.default('playground'),
  title: z.string().min(1).max(60),
  theme: ThemeSchema,
  environment: EnvironmentSchema,
  materials: z
    .record(IdSchema, MaterialSchema)
    .refine(
      (materials) =>
        Object.keys(materials).length >= 1 && Object.keys(materials).length <= LIMITS.maxMaterials,
      { message: `between 1 and ${LIMITS.maxMaterials} materials are required` },
    ),
  entities: z.array(EntitySchema).min(1).max(LIMITS.maxEntities),
  joints: z.array(JointSchema).max(LIMITS.maxJoints),
  rules: z.array(RuleSchema).max(LIMITS.maxRules),
  learning: LearningSchema,
  narration: z.object({ intro: z.string().min(1).max(240) }),
  variables: VariablesSchema.optional(),
  visuals: z.array(VisualSchema).max(LAB_LIMITS.maxVisuals).optional(),
  challenges: z.array(ChallengeSchema).max(LAB_LIMITS.maxChallenges).optional(),
});
/** Largest generated game script, in UTF-8 bytes (the game runtime's budget). */
export const GAME_SCRIPT_MAX_BYTES = 20 * 1024;

/**
 * A generated game programme written against Game API version 1. The scene
 * schema checks shape and size only; the game runtime's static check and
 * sandbox decide whether it may run.
 */
export const GameScriptSchema = z.object({
  apiVersion: z.literal(1),
  source: z.string().min(1).max(GAME_SCRIPT_MAX_BYTES),
  /** Hex digest of the source (the builder writes SHA-256). */
  hash: z.string().regex(/^[a-f0-9]{16,64}$/),
});
export type GameScript = z.infer<typeof GameScriptSchema>;
export const GameSchema = z.object({
  script: GameScriptSchema,
  /** Older saved scripts are goal-based games. Open play may have no score or ending. */
  mode: z.enum(['game', 'freeplay']).optional(),
});
export type Game = z.infer<typeof GameSchema>;

// `game` sits outside SceneDocObjectSchema so the scene model's output contract never offers it.
export const SceneDocSchema = SceneDocObjectSchema.extend({ game: GameSchema.optional() });
export type SceneDoc = z.infer<typeof SceneDocSchema>;
