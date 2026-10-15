import { describe, it, expect } from 'vitest';
import { int16ToBytes, pcm16Tone, splitPcm16Frames } from '../src/audio';

describe('pcm16Tone', () => {
  it('produces the right number of samples and stays within amplitude', () => {
    const tone = pcm16Tone({ sampleRate: 16000, seconds: 0.5, frequency: 440, amplitude: 0.5 });
    expect(tone.length).toBe(8000);
    let max = 0;
    for (const s of tone) max = Math.max(max, Math.abs(s));
    expect(max).toBeLessThanOrEqual(16384);
    expect(max).toBeGreaterThan(16000);
  });
});

describe('splitPcm16Frames', () => {
  it('splits bytes into frames of samplesPerFrame samples and pads the last frame with silence', () => {
    const bytes = int16ToBytes(pcm16Tone({ sampleRate: 16000, seconds: 0.05, frequency: 440 }));
    const frames = splitPcm16Frames(bytes, 320);
    expect(frames.length).toBe(3);
    expect(frames.every((f) => f.byteLength === 640)).toBe(true);
    expect(Array.from(frames[2]!.slice(640 - 4))).toEqual([0, 0, 0, 0]);
  });
  it('throws on an odd byte length', () => {
    expect(() => splitPcm16Frames(new Uint8Array(641), 320)).toThrow(/multiple of 2/);
  });
});
