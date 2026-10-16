import { useMemo } from 'react';
import { DSL_CUES, ENGINE_CUES, impactCue, type CueHit, type CueName } from './manifest';
import { createMixer, type Mixer } from './mixer';

export * from './manifest';
export {
  createMixer,
  DUCK_GAIN,
  DUCK_IN_SECONDS,
  DUCK_OUT_SECONDS,
  MAX_VOICES,
  type CueOptions,
  type Mixer,
  type MixerOptions,
} from './mixer';

let shared: Mixer | undefined;

/** The app-wide mixer. It creates its AudioContext on the first `unlock()`. */
export function getMixer(): Mixer {
  return (shared ??= createMixer());
}

export function releaseMixer() {
  shared?.dispose();
  shared = undefined;
}

/** The shape of an engine event the sound layer cares about; `EngineEvent` satisfies it. */
export interface SoundEngineEvent {
  type: string;
  value?: unknown;
  target?: string;
  concept?: unknown;
  time?: number;
  say?: string;
  ruleId?: string;
}

const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value));

function field(value: unknown, key: string): unknown {
  return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
}
function text(value: unknown, key: string): string | undefined {
  if (typeof value === 'string') return value;
  const inner = field(value, key);
  return typeof inner === 'string' ? inner : undefined;
}
function number(value: unknown, key: string): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const inner = field(value, key);
  return typeof inner === 'number' && Number.isFinite(inner) ? inner : undefined;
}
function has<T extends object>(table: T, key: string | undefined): key is string & keyof T {
  return key !== undefined && Object.prototype.hasOwnProperty.call(table, key);
}
const hit = (name: CueName, gain: number): CueHit => ({ name, gain });

/**
 * Maps an engine event to a cue and gain, or null for silent events. Pure, so
 * the Studio and the generation show can share one table. Value shapes follow
 * the simulation: rule actions arrive as the action object, inputs as their
 * payload (`flick` velocity, `dial` value, `spell` name).
 */
export function cueForEvent(event: SoundEngineEvent): CueHit | null {
  const { type, value } = event;
  switch (type) {
    case 'sound': {
      const cue = text(value, 'cue');
      return has(DSL_CUES, cue) ? hit(DSL_CUES[cue], 1) : null;
    }
    case 'celebrate': {
      const style = text(value, 'style');
      const name = has(ENGINE_CUES.celebrate, style)
        ? ENGINE_CUES.celebrate[style]
        : ENGINE_CUES.celebrate.sparkle;
      return hit(name, 0.9);
    }
    case 'spawn':
      return hit(ENGINE_CUES.spawn, clamp(0.5 + 0.05 * (number(value, 'count') ?? 1), 0.5, 1));
    case 'impact':
    case 'collision': {
      const impulse = number(value, 'impulse');
      return impulse === undefined ? null : impactCue(impulse);
    }
    case 'enterMedium':
    case 'waterEntry': {
      const medium = text(value, 'medium') ?? 'water';
      return medium === 'water' ? hit(ENGINE_CUES.waterEntry, 0.9) : null;
    }
    case 'dial':
      return hit(ENGINE_CUES.dial, 0.8);
    case 'variable':
      return hit(ENGINE_CUES.variable, 0.4);
    case 'spell': {
      const spell = typeof value === 'string' ? value : undefined;
      const name =
        has(ENGINE_CUES.spell, spell) && spell !== 'default'
          ? ENGINE_CUES.spell[spell]
          : ENGINE_CUES.spell.default;
      return hit(name, 0.9);
    }
    case 'rule':
      return event.concept ? hit(ENGINE_CUES.discovery, 0.9) : null;
    case 'challengeComplete':
      return hit(ENGINE_CUES.challengeComplete, 1);
    case 'tap':
      return hit(ENGINE_CUES.tap, 0.7);
    case 'flick': {
      const speed = Math.hypot(number(value, 'x') ?? 0, number(value, 'y') ?? 0);
      return hit(ENGINE_CUES.flick, clamp(0.4 + speed / 15, 0.4, 1));
    }
    case 'launch':
      return hit(ENGINE_CUES.launch, 1);
    case 'land':
      return hit(ENGINE_CUES.land, 0.8);
    case 'applyImpulse':
      return hit(ENGINE_CUES.bounce, 0.7);
    case 'remove':
      return hit(ENGINE_CUES.remove, 0.7);
    case 'scaleEntity':
      return hit((number(value, 'factor') ?? 1) >= 1 ? 'swoosh_up' : 'swoosh_down', 0.7);
    case 'setGravity':
      return hit('swoosh_down', 0.6);
    case 'setTimeScale':
      return hit(ENGINE_CUES.show.chime, 0.6);
    case 'setMaterial':
      return hit('tock', 0.6);
    case 'drawStart':
      return hit(ENGINE_CUES.draw.start, 0.6);
    case 'drawEnd':
      return hit(ENGINE_CUES.draw.end, 0.6);
    default:
      return null;
  }
}

export interface EngineSoundOptions {
  /** Clock in milliseconds; defaults to `performance.now`. */
  now?: () => number;
  /** Repeats of one cue inside this window are dropped (a launch rule emits twice). */
  debounceMs?: number;
}

/** Builds an `onEvent` handler for `mountEngine` that plays the mapped cue on the mixer. */
export function soundForEngineEvents(
  mixer: Pick<Mixer, 'playCue'>,
  options: EngineSoundOptions = {},
): (event: SoundEngineEvent) => void {
  const now =
    options.now ?? (() => (typeof performance === 'undefined' ? Date.now() : performance.now()));
  const debounce = options.debounceMs ?? 60;
  const last = new Map<CueName, number>();
  return (event) => {
    const cue = cueForEvent(event);
    if (!cue) return;
    const t = now();
    const previous = last.get(cue.name);
    if (previous !== undefined && t - previous < debounce) return;
    last.set(cue.name, t);
    mixer.playCue(cue.name, { gain: cue.gain });
  };
}

/** React hook form of `soundForEngineEvents`, memoised per mixer; defaults to the shared mixer. */
export function useSoundForEngineEvents(mixer?: Mixer) {
  return useMemo(() => soundForEngineEvents(mixer ?? getMixer()), [mixer]);
}
