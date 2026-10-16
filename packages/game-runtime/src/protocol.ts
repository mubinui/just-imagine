import { z } from 'zod';
import { SOUND_CUES, CELEBRATE_STYLES, DIALS, GAME_EVENT_TYPES } from './api';

const ID = /^[a-z][a-z0-9_]{0,31}$/;
const IdSchema = z.string().regex(ID, 'ids are lowercase snake_case, max 32 chars');
const TagSchema = z.string().regex(ID, 'tags are lowercase snake_case, max 32 chars');
/** An entity id, a tag, or a library id such as `lib/meadow/acorn`. */
const TargetSchema = z.string().min(1).max(64);
const finite = z.number();

export const SpawnCommandSchema = z.object({
  type: z.literal('spawn'),
  id: IdSchema,
  template: TargetSchema,
  x: finite,
  y: finite,
  tags: z.array(TagSchema).max(8),
  material: z.string().min(1).max(32).optional(),
});

export const CommandSchema = z.discriminatedUnion('type', [
  SpawnCommandSchema,
  z.object({ type: z.literal('remove'), target: TargetSchema }),
  z.object({ type: z.literal('impulse'), target: TargetSchema, x: finite, y: finite }),
  z.object({ type: z.literal('move'), target: TargetSchema, x: finite, y: finite }),
  z.object({ type: z.literal('setGravity'), x: finite, y: finite }),
  z.object({ type: z.literal('setWind'), x: finite, y: finite }),
  z.object({
    type: z.literal('setMaterial'),
    target: TargetSchema,
    material: z.string().min(1).max(32),
  }),
  z.object({ type: z.literal('score'), delta: finite }),
  z.object({ type: z.literal('lives'), delta: finite }),
  z.object({ type: z.literal('level'), n: z.number().int().min(0).max(999) }),
  z.object({ type: z.literal('win') }),
  z.object({ type: z.literal('lose') }),
  z.object({
    type: z.literal('hud'),
    score: finite.optional(),
    lives: finite.optional(),
    timer: finite.optional(),
    label: z.string().max(40).optional(),
  }),
  z.object({ type: z.literal('say'), text: z.string().min(1).max(200) }),
  z.object({
    type: z.literal('ask'),
    id: z.number().int().min(0),
    question: z.string().min(1).max(160),
    options: z.array(z.string().min(1).max(40)).min(2).max(3),
  }),
  z.object({ type: z.literal('sound'), cue: z.enum(SOUND_CUES) }),
  z.object({ type: z.literal('celebrate'), style: z.enum(CELEBRATE_STYLES) }),
  z.object({
    type: z.literal('timer-set'),
    id: z.number().int().min(0),
    seconds: z.number().positive(),
    repeat: z.boolean(),
  }),
  z.object({ type: z.literal('timer-clear'), id: z.number().int().min(0) }),
]);
export type Command = z.infer<typeof CommandSchema>;
export type CommandType = Command['type'];

/** Events the host pushes into the worker. `timer` events are produced inside the worker. */
export const GameEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('tick'), time: finite, dt: finite }),
  z.object({ type: z.literal('collision'), a: IdSchema, b: IdSchema, impulse: finite }),
  z.object({ type: z.literal('tap'), target: IdSchema.optional(), x: finite, y: finite }),
  z.object({ type: z.literal('drag'), target: IdSchema, x: finite, y: finite }),
  z.object({ type: z.literal('flick'), target: IdSchema, vx: finite, vy: finite }),
  z.object({ type: z.literal('dial'), dial: z.enum(DIALS), value: z.string().min(1).max(32) }),
  z.object({ type: z.literal('variable'), id: IdSchema, value: finite }),
]);
export type GameEvent = z.infer<typeof GameEventSchema>;

export const EntityStateSchema = z.object({
  id: IdSchema,
  tags: z.array(TagSchema).max(16),
  x: finite,
  y: finite,
  rotation: finite,
  vx: finite,
  vy: finite,
  width: finite,
  height: finite,
  templateId: z.string().max(64).optional(),
});
export type EntityState = z.infer<typeof EntityStateSchema>;

export const GameStateSchema = z.object({
  time: finite,
  entities: z.array(EntityStateSchema).max(512),
});
export type GameState = z.infer<typeof GameStateSchema>;

export const BudgetKindSchema = z.enum([
  'bodies',
  'timers',
  'handler',
  'aggregate',
  'hang',
  'commands',
]);

/** Messages the worker sends to the host. The host validates every one. */
export const WorkerMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('ack'), seq: z.number().int().min(0), ms: z.number().min(0) }),
  z.object({ type: z.literal('commands'), commands: z.array(CommandSchema).max(5000) }),
  z.object({
    type: z.literal('budget'),
    kind: BudgetKindSchema,
    value: z.number(),
    limit: z.number(),
    where: z.string().max(80).optional(),
  }),
  z.object({
    type: z.literal('error'),
    message: z.string().max(2000),
    phase: z.enum(['init', 'handler', 'timer', 'async']),
    line: z.number().int().optional(),
    where: z.string().max(80).optional(),
  }),
  z.object({ type: z.literal('log'), args: z.array(z.string().max(500)).max(16) }),
]);
export type WorkerMessage = z.infer<typeof WorkerMessageSchema>;

/** Messages the host sends to the worker. */
export type HostMessage =
  | { type: 'start'; seed: number }
  | { type: 'event'; seq: number; event: GameEvent }
  | { type: 'state'; state: GameState }
  | { type: 'answer'; id: number; index: number }
  | { type: 'stop' };

export const GAME_EVENT_TYPE_SET: ReadonlySet<string> = new Set(GAME_EVENT_TYPES);
