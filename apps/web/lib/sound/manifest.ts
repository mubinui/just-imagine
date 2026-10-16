import type { Action } from '@just-imagine/scene-schema';

/**
 * The sound pack contract. Every name here is a file produced by
 * `scripts/make-sounds.mjs` under `public/sound/<name>.{ogg,m4a}`; the manifest
 * test checks the two lists agree and that the files exist.
 */
export const CUE_NAMES = [
  'boing',
  'splat',
  'splash',
  'whoosh',
  'ding',
  'pop',
  'pop_soft',
  'thud',
  'thud_big',
  'chime',
  'chime_magic',
  'sparkle',
  'confetti',
  'tick',
  'tock',
  'swoosh_up',
  'swoosh_down',
  'bubble',
  'drip',
  'rustle',
  'click',
  'tap',
  'tap_soft',
  'select',
  'deselect',
  'open',
  'close',
  'success',
  'fail_soft',
  'level_up',
  'star',
  'star_3',
  'drumroll_short',
  'wind_gust',
  'rain_soft',
  'snow_soft',
  'launch',
  'land',
  'draw_start',
  'draw_end',
] as const;
export type CueName = (typeof CUE_NAMES)[number];

const cueSet: ReadonlySet<string> = new Set(CUE_NAMES);
export function isCueName(value: unknown): value is CueName {
  return typeof value === 'string' && cueSet.has(value);
}

export const SOUND_FORMATS = ['ogg', 'm4a', 'wav'] as const;
export type SoundFormat = (typeof SOUND_FORMATS)[number];
export const FORMAT_MIME: Record<SoundFormat, string> = {
  ogg: 'audio/ogg; codecs="opus"',
  m4a: 'audio/mp4; codecs="mp4a.40.2"',
  wav: 'audio/wav',
};
export const SOUND_PATH = '/sound';
export const MUSIC_PATH = '/music';

/** Candidate URLs for a cue in preference order; the mixer takes the first that decodes. */
export function cueUrls(name: CueName, formats: readonly SoundFormat[] = SOUND_FORMATS) {
  return formats.map((format) => `${SOUND_PATH}/${name}.${format}`);
}

/** The `sound` action's cue vocabulary from the Scene DSL. */
export type DslCue = Extract<Action, { action: 'sound' }>['cue'];
export const DSL_CUES: Record<DslCue, CueName> = {
  boing: 'boing',
  splat: 'splat',
  splash: 'splash',
  whoosh: 'whoosh',
  ding: 'ding',
};

export interface CueHit {
  name: CueName;
  gain: number;
}

/**
 * Collision impulses in the engine are accumulated contact force times the step
 * (newton seconds). Fixture rules use thresholds of 0.5, 1 and 2, so resting
 * contact stays silent, a light touch is a soft tap and anything over six is a
 * big thud. Gain grows inside a band towards the next band's floor.
 */
export const IMPACT_BANDS: readonly {
  minImpulse: number;
  name: CueName;
  gain: [number, number];
}[] = [
  { minImpulse: 0.5, name: 'tap_soft', gain: [0.35, 0.6] },
  { minImpulse: 2, name: 'thud', gain: [0.6, 0.85] },
  { minImpulse: 6, name: 'thud_big', gain: [0.85, 1] },
];

export function impactCue(impulse: number): CueHit | null {
  if (!Number.isFinite(impulse)) return null;
  let index = -1;
  for (let i = 0; i < IMPACT_BANDS.length; i++)
    if (impulse >= IMPACT_BANDS[i]!.minImpulse) index = i;
  if (index < 0) return null;
  const band = IMPACT_BANDS[index]!;
  const ceiling = IMPACT_BANDS[index + 1]?.minImpulse ?? band.minImpulse * 2;
  const t = Math.min(1, (impulse - band.minImpulse) / (ceiling - band.minImpulse));
  return { name: band.name, gain: band.gain[0] + (band.gain[1] - band.gain[0]) * t };
}

/**
 * Engine effects and UI moments mapped to cues. Impacts are banded by
 * `impactCue`; everything else is a direct lookup so the Studio and the
 * generation show can pick a cue without knowing file names.
 */
export const ENGINE_CUES = {
  waterEntry: 'splash',
  spawn: 'pop',
  celebrate: { confetti: 'confetti', sparkle: 'chime_magic', splash: 'splash' },
  dial: 'tick',
  variable: 'tock',
  spell: {
    default: 'chime_magic',
    grow: 'swoosh_up',
    shrink: 'swoosh_down',
    restore: 'swoosh_down',
  },
  discovery: 'star',
  challengeComplete: 'level_up',
  launch: 'launch',
  land: 'land',
  flick: 'whoosh',
  tap: 'tap',
  bounce: 'boing',
  remove: 'pop_soft',
  draw: { start: 'draw_start', end: 'draw_end' },
  ui: {
    tap: 'tap',
    tapSoft: 'tap_soft',
    click: 'click',
    select: 'select',
    deselect: 'deselect',
    open: 'open',
    close: 'close',
    success: 'success',
    fail: 'fail_soft',
    tick: 'tick',
  },
  ambience: {
    wind: 'wind_gust',
    rain: 'rain_soft',
    snow: 'snow_soft',
    bubble: 'bubble',
    drip: 'drip',
    rustle: 'rustle',
  },
  show: {
    drumroll: 'drumroll_short',
    star: 'star',
    star3: 'star_3',
    sparkle: 'sparkle',
    chime: 'chime',
    levelUp: 'level_up',
  },
} as const satisfies CueTree;

type CueTree = { readonly [key: string]: CueName | CueTree };

export const MUSIC_THEMES = ['meadow', 'pond', 'sky', 'moon', 'lab', 'room'] as const;
export type MusicTheme = (typeof MUSIC_THEMES)[number];

/** Tempo and bar count per bed; loop length is bars of 4/4 at the tempo, never over 30 s. */
export const MUSIC_TEMPO: Record<MusicTheme, { bpm: number; bars: number }> = {
  meadow: { bpm: 80, bars: 10 },
  pond: { bpm: 72, bars: 9 },
  sky: { bpm: 90, bars: 11 },
  moon: { bpm: 75, bars: 9 },
  lab: { bpm: 88, bars: 11 },
  room: { bpm: 76, bars: 9 },
};

export function loopSeconds(tempo: { bpm: number; bars: number }) {
  return (tempo.bars * 4 * 60) / tempo.bpm;
}

export const MUSIC_LOOP_SECONDS: Record<MusicTheme, number> = Object.fromEntries(
  MUSIC_THEMES.map((theme) => [theme, loopSeconds(MUSIC_TEMPO[theme])]),
) as Record<MusicTheme, number>;

export function musicUrls(theme: MusicTheme, formats: readonly SoundFormat[] = SOUND_FORMATS) {
  return formats.map((format) => `${MUSIC_PATH}/${theme}.${format}`);
}
