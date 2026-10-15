import { describe, it, expect } from 'vitest';
import { PcmCapture, PcmPlayback, mouthOpen } from '../src/audio';
describe('audio signal processing', () => {
  it('resamples 48kHz input into exact 20ms 16kHz PCM frames across chunks', () => {
    const capture = new PcmCapture(48000);
    const frames: Int16Array[] = [];
    for (let i = 0; i < 375; i++) frames.push(...capture.push(new Float32Array(128).fill(0.5)));
    expect(frames).toHaveLength(50);
    expect(frames.every((f) => f.length === 320)).toBe(true);
    expect(frames[0]?.[0]).toBe(16384);
  });
  it('clamps microphone clipping to PCM16 and rejects invalid rates', () => {
    expect(() => new PcmCapture(0)).toThrow();
    const capture = new PcmCapture(16000);
    expect(capture.push(new Float32Array(320).fill(3))[0]?.[0]).toBe(32767);
  });
  it('flushes queued speech immediately on interruption', () => {
    const playback = new PcmPlayback(48000);
    playback.push(new Int16Array(480).fill(16000));
    expect(playback.read(128).some((x) => x > 0)).toBe(true);
    playback.clear();
    expect([...playback.read(128)]).toEqual(new Array(128).fill(0));
  });
  it('bounds playback memory and maps amplitude to mouth state', () => {
    const playback = new PcmPlayback(24000, 480);
    playback.push(new Int16Array(960));
    expect(playback.queuedSamples).toBeLessThanOrEqual(480);
    expect(mouthOpen(0)).toBe(0);
    expect(mouthOpen(1)).toBe(1);
    expect(mouthOpen(Number.NaN)).toBe(0);
  });
});
