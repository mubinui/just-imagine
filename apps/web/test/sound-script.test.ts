import { describe, it, expect } from 'vitest';
import {
  CUES,
  MUSIC,
  SAMPLE_RATE,
  encodeWav,
  renderCue,
  renderMusic,
  provenanceMarkdown,
} from '../scripts/make-sounds.mjs';
import { CUE_NAMES, MUSIC_THEMES } from '../lib/sound/manifest';

function peak(samples: Float32Array) {
  let max = 0;
  for (const s of samples) max = Math.max(max, Math.abs(s));
  return max;
}

describe('make-sounds synthesis', () => {
  it('renders every cue as a short, audible, clip-safe mono signal', () => {
    for (const name of CUE_NAMES) {
      const samples = renderCue(name);
      const seconds = samples.length / SAMPLE_RATE;
      expect(seconds, name).toBeGreaterThanOrEqual(0.015);
      expect(seconds, name).toBeLessThanOrEqual(2);
      const max = peak(samples);
      expect(max, name).toBeLessThanOrEqual(1);
      expect(max, name).toBeGreaterThanOrEqual(0.3);
      expect(
        samples.some((s) => Number.isNaN(s)),
        name,
      ).toBe(false);
      expect(CUES[name]?.seconds, name).toBeCloseTo(seconds, 2);
      expect(typeof CUES[name]?.recipe, name).toBe('string');
    }
  });

  it('renders deterministically', () => {
    expect(Array.from(renderCue('splash'))).toEqual(Array.from(renderCue('splash')));
    expect(Array.from(renderCue('rustle'))).toEqual(Array.from(renderCue('rustle')));
  });

  it('starts and ends near silence so cues never click', () => {
    for (const name of CUE_NAMES) {
      const samples = renderCue(name);
      expect(Math.abs(samples[0]!), name).toBeLessThan(0.05);
      expect(Math.abs(samples[samples.length - 1]!), name).toBeLessThan(0.02);
    }
  });

  it('encodes 16-bit PCM WAV with a correct header', () => {
    const wav = encodeWav([Float32Array.of(0, 0.5, -0.5, 2)], 44100);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt16LE(20)).toBe(1);
    expect(wav.readUInt16LE(22)).toBe(1);
    expect(wav.readUInt32LE(24)).toBe(44100);
    expect(wav.readUInt16LE(34)).toBe(16);
    expect(wav.readUInt32LE(40)).toBe(8);
    expect(wav.readInt16LE(44)).toBe(0);
    expect(wav.readInt16LE(46)).toBe(Math.round(0.5 * 32767));
    expect(wav.readInt16LE(48)).toBe(-Math.round(0.5 * 32767));
    expect(wav.readInt16LE(50)).toBe(32767);
    expect(wav.length).toBe(44 + 8);
  });

  it('interleaves stereo channels', () => {
    const wav = encodeWav([Float32Array.of(0.25, 0.5), Float32Array.of(-0.25, -0.5)], 44100);
    expect(wav.readUInt16LE(22)).toBe(2);
    expect(wav.readInt16LE(44)).toBe(Math.round(0.25 * 32767));
    expect(wav.readInt16LE(46)).toBe(-Math.round(0.25 * 32767));
  });

  it('renders a stereo music loop that ends exactly on a bar boundary', () => {
    const theme = 'meadow';
    const spec = MUSIC[theme]!;
    const loop = renderMusic(theme);
    const expected = Math.round((spec.bars * 4 * 60 * SAMPLE_RATE) / spec.bpm);
    expect(loop.loopSamples).toBe(expected);
    expect(loop.left.length).toBe(expected);
    expect(loop.right.length).toBe(expected);
    expect(peak(loop.left)).toBeLessThanOrEqual(1);
    expect(peak(loop.left)).toBeGreaterThanOrEqual(0.3);
    expect(loop.left.some((s) => Number.isNaN(s))).toBe(false);
    expect(Array.from(loop.left.subarray(0, 2000))).not.toEqual(
      Array.from(loop.right.subarray(0, 2000)),
    );
  });

  it('describes every theme with a tempo in range and a recipe', () => {
    for (const theme of MUSIC_THEMES) {
      const spec = MUSIC[theme]!;
      expect(spec.bpm).toBeGreaterThanOrEqual(70);
      expect(spec.bpm).toBeLessThanOrEqual(90);
      expect(spec.bars).toBeGreaterThan(0);
      expect(typeof spec.recipe).toBe('string');
    }
  });

  it('writes provenance markdown naming every cue and theme as synthesised', () => {
    const doc = provenanceMarkdown();
    expect(doc.toLowerCase()).toContain('no third-party material');
    expect(doc.toLowerCase()).toContain('lyria');
    for (const name of CUE_NAMES) expect(doc).toContain(`\`${name}\``);
    for (const theme of MUSIC_THEMES) expect(doc).toContain(`\`${theme}\``);
  });
});
