import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ActionSchema } from '@just-imagine/scene-schema';
import {
  CUE_NAMES,
  DSL_CUES,
  ENGINE_CUES,
  MUSIC_LOOP_SECONDS,
  MUSIC_THEMES,
  cueUrls,
  impactCue,
  isCueName,
  musicUrls,
} from '../lib/sound/manifest';
import { CUES, MUSIC } from '../scripts/make-sounds.mjs';

const webRoot = join(__dirname, '..');

function dslSoundCues(): string[] {
  const sound = ActionSchema.options.find((o) => o.shape.action.value === 'sound');
  if (!sound || !('cue' in sound.shape)) throw new Error('sound action missing from the DSL');
  return [...(sound.shape.cue as { options: string[] }).options];
}

function leaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(leaves);
  return [];
}

describe('sound manifest', () => {
  it('names forty distinct cues', () => {
    expect(CUE_NAMES).toHaveLength(40);
    expect(new Set(CUE_NAMES).size).toBe(40);
    expect(isCueName('boing')).toBe(true);
    expect(isCueName('kazoo')).toBe(false);
  });

  it('maps every DSL sound cue to a cue', () => {
    const cues = dslSoundCues();
    expect(cues.length).toBeGreaterThan(0);
    for (const cue of cues) {
      expect(DSL_CUES).toHaveProperty(cue);
      expect(CUE_NAMES).toContain(DSL_CUES[cue as keyof typeof DSL_CUES]);
    }
  });

  it('maps every engine effect to a cue', () => {
    for (const key of [
      'waterEntry',
      'spawn',
      'celebrate',
      'dial',
      'spell',
      'discovery',
      'challengeComplete',
      'launch',
      'land',
      'flick',
      'tap',
      'draw',
      'ui',
    ])
      expect(ENGINE_CUES).toHaveProperty(key);
    expect(ENGINE_CUES.celebrate).toEqual(
      expect.objectContaining({
        confetti: expect.any(String),
        sparkle: expect.any(String),
        splash: expect.any(String),
      }),
    );
    for (const name of leaves(ENGINE_CUES)) expect(CUE_NAMES).toContain(name);
  });

  it('bands impacts by impulse with a quiet floor', () => {
    expect(impactCue(0)).toBeNull();
    expect(impactCue(0.2)).toBeNull();
    expect(impactCue(Number.NaN)).toBeNull();
    expect(impactCue(1)?.name).toBe('tap_soft');
    expect(impactCue(3)?.name).toBe('thud');
    expect(impactCue(12)?.name).toBe('thud_big');
    expect(impactCue(100)?.name).toBe('thud_big');
    const quiet = impactCue(1)!.gain,
      mid = impactCue(3)!.gain,
      loud = impactCue(100)!.gain;
    expect(quiet).toBeLessThan(mid);
    expect(mid).toBeLessThanOrEqual(loud);
    expect(loud).toBeLessThanOrEqual(1);
  });

  it('lists candidate files ogg first, then m4a, then wav', () => {
    expect(cueUrls('boing')).toEqual(['/sound/boing.ogg', '/sound/boing.m4a', '/sound/boing.wav']);
    expect(musicUrls('meadow')).toEqual([
      '/music/meadow.ogg',
      '/music/meadow.m4a',
      '/music/meadow.wav',
    ]);
  });

  it('the synthesis script defines exactly the manifest cues', () => {
    expect(Object.keys(CUES).sort()).toEqual([...CUE_NAMES].sort());
  });

  it('the synthesis script defines every music theme with the manifest loop length', () => {
    expect(Object.keys(MUSIC).sort()).toEqual([...MUSIC_THEMES].sort());
    for (const theme of MUSIC_THEMES) {
      const spec = MUSIC[theme]!;
      expect(spec.bpm).toBeGreaterThanOrEqual(70);
      expect(spec.bpm).toBeLessThanOrEqual(90);
      const loop = (spec.bars * 4 * 60) / spec.bpm;
      expect(MUSIC_LOOP_SECONDS[theme]).toBeCloseTo(loop, 6);
      expect(loop).toBeLessThanOrEqual(30);
      expect(loop).toBeGreaterThanOrEqual(27);
    }
  });

  it('ships a file for every cue and theme under public/', () => {
    const sounds = new Set(readdirSync(join(webRoot, 'public/sound')));
    for (const name of CUE_NAMES)
      expect(
        [`${name}.ogg`, `${name}.m4a`, `${name}.wav`].some((f) => sounds.has(f)),
        `missing sound file for ${name}`,
      ).toBe(true);
    const music = new Set(readdirSync(join(webRoot, 'public/music')));
    for (const theme of MUSIC_THEMES)
      expect(
        [`${theme}.ogg`, `${theme}.m4a`, `${theme}.wav`].some((f) => music.has(f)),
        `missing music file for ${theme}`,
      ).toBe(true);
  });

  it('records provenance for every cue and theme', () => {
    const path = join(webRoot, '../../docs/art/sound-provenance.md');
    expect(existsSync(path)).toBe(true);
    const doc = readFileSync(path, 'utf8');
    expect(doc.toLowerCase()).toContain('no third-party material');
    expect(doc.toLowerCase()).toContain('lyria');
    for (const name of CUE_NAMES) expect(doc).toContain(`\`${name}\``);
    for (const theme of MUSIC_THEMES) expect(doc).toContain(`\`${theme}\``);
  });
});
