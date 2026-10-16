/**
 * Runtime copy of the Game API contract in `api.d.ts`: the same types, plus the
 * constants the static checker, shim and host share.
 */
export type {
  GameApi,
  GameEntity,
  GameEventMap,
  GameEventType,
  Vector,
  SpawnOptions,
  TickEvent,
  CollisionEvent,
  TapEvent,
  DragEvent,
  FlickEvent,
  DialEvent,
  VariableEvent,
  TimerEvent,
  SoundCue,
  CelebrateStyle,
  HudState,
} from './api.d';

export const GAME_API_VERSION = 1 as const;

/** Identifiers a script may reference without declaring them. */
export const ALLOWED_GLOBALS: ReadonlySet<string> = new Set([
  'game',
  'Math',
  'Number',
  'String',
  'Array',
  'Object',
  'JSON',
  'Boolean',
  'console',
]);

/** The only member of `console` a script may use. */
export const ALLOWED_CONSOLE_MEMBERS: ReadonlySet<string> = new Set(['log']);

export const GAME_EVENT_TYPES = [
  'tick',
  'collision',
  'tap',
  'drag',
  'flick',
  'dial',
  'variable',
  'timer',
] as const;

export const GAME_API_METHODS = [
  'spawn',
  'remove',
  'find',
  'on',
  'every',
  'after',
  'cancel',
  'impulse',
  'setGravity',
  'setWind',
  'setMaterial',
  'score',
  'lives',
  'level',
  'win',
  'lose',
  'hud',
  'say',
  'ask',
  'sound',
  'celebrate',
  'random',
] as const;

export const SOUND_CUES = [
  'boing',
  'splat',
  'splash',
  'whoosh',
  'ding',
  'pop',
  'tada',
  'buzz',
] as const;

export const CELEBRATE_STYLES = ['confetti', 'sparkle', 'splash'] as const;

export const DIALS = ['gravity', 'wind', 'heroMaterial'] as const;
