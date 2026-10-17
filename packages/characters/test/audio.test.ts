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
    expect(playback.read(8000).some((x) => x > 0)).toBe(true);
    playback.clear();
    expect(playback.queuedSamples).toBe(0);
    playback.read(240);
    expect([...playback.read(128)]).toEqual(new Array(128).fill(0));
  });
  it('bounds playback memory and maps amplitude to mouth state', () => {
    const playback = new PcmPlayback(24000, 480);
    expect(playback.push(new Int16Array(960))).toBe(false);
    expect(playback.queuedSamples).toBeLessThanOrEqual(480);
    expect(mouthOpen(0)).toBe(0);
    expect(mouthOpen(1)).toBe(1);
    expect(mouthOpen(Number.NaN)).toBe(0);
  });
});

for (const rate of [44100, 48000]) {
  it(`smooths packet jitter at ${rate}Hz without gaps after startup`, () => {
    const playback = new PcmPlayback(rate);
    const output: number[] = [];
    // Equal average arrival/playback rate; alternate20ms and140ms packet spacing.
    for (let ms = 0; ms < 1600; ms += 10) {
      if (ms % 160 === 0 || ms % 160 === 140)
        expect(playback.push(new Int16Array(1920).fill(16000))).toBe(true);
      output.push(...playback.read(rate / 100));
    }
    const steady = output.slice(Math.round(rate * 0.17));
    expect(steady.every((sample) => sample > 0.4)).toBe(true);
    expect(playback.queuedSamples).toBeLessThan(24000 / 2);
  });
  it(`preserves fractional resampling and fades interruptions at ${rate}Hz`, () => {
    const playback = new PcmPlayback(rate);
    const input = Int16Array.from({ length: 24000 }, (_, i) =>
      Math.round(12000 * Math.sin(i * 0.03)),
    );
    expect(playback.push(input)).toBe(true);
    const out = playback.read(Math.round(rate / 2));
    for (let i = Math.round(rate * 0.01); i < out.length - 1; i++) {
      const phase = (i * 24000) / rate;
      const low = Math.floor(phase),
        fraction = phase - low;
      const expected = (input[low]! + (input[low + 1]! - input[low]!) * fraction) / 32768;
      expect(out[i]).toBeCloseTo(expected, 5);
    }
    const prior = out.at(-1)!;
    playback.clear();
    const tail = playback.read(Math.ceil(rate * 0.01));
    expect(Math.abs(tail[0]! - prior)).toBeLessThan(0.01);
    expect(tail.at(-1)).toBe(0);
    expect(playback.queuedSamples).toBe(0);
  });
}
it('preserves a fast six-second burst in order and rejects overflow without corrupting the queue', () => {
  const playback = new PcmPlayback(24000);
  for (let i = 0; i < 6; i++)
    expect(playback.push(new Int16Array(24000).fill(2000 + i * 1000))).toBe(true);
  expect(playback.queuedSamples).toBe(144000);
  expect(playback.push(new Int16Array(24000 * 30))).toBe(false);
  expect(playback.queuedSamples).toBe(144000);
  const out = playback.read(144000);
  for (let i = 0; i < 6; i++) expect(out[i * 24000 + 12000]).toBeCloseTo((2000 + i * 1000) / 32768);
});
it('plays a short reply within150ms and smooths starvation rather than clicking to silence', () => {
  const playback = new PcmPlayback(48000);
  playback.push(new Int16Array(480).fill(16000));
  const out = playback.read(48000 / 4);
  const first = out.findIndex((value) => value > 0);
  expect(first).toBeLessThanOrEqual(7200);
  expect(first).toBeGreaterThanOrEqual(4800);
  expect(out.at(-1)).toBe(0);
  let maxJump = 0;
  for (let i = 1; i < out.length; i++) maxJump = Math.max(maxJump, Math.abs(out[i]! - out[i - 1]!));
  expect(maxJump).toBeLessThan(0.01);
});

it('grows its cushion when speech resumes soon after running dry, up to 400 ms', () => {
  const playback = new PcmPlayback(48000);
  expect(playback.cushionMs).toBe(150);
  // Speech runs dry mid-reply on a busy device and resumes a moment later, three times.
  // Each reply part plays out and runs dry within the second; the next part follows quickly.
  for (let gap = 0; gap < 4; gap++) {
    playback.push(new Int16Array(24000 / 4).fill(12000));
    playback.read(48000 * 0.8);
  }
  playback.push(new Int16Array(240).fill(12000));
  expect(playback.cushionMs).toBe(400);
});

it('waits for the grown cushion before starting a reply that arrives in small packets', () => {
  const playback = new PcmPlayback(48000);
  for (let gap = 0; gap < 4; gap++) {
    playback.push(new Int16Array(24000 / 4).fill(12000));
    playback.read(48000 * 0.8);
  }
  playback.read(48000 * 2);
  expect(playback.cushionMs).toBe(400);
  playback.push(new Int16Array(2400).fill(12000));
  const out = playback.read(48000);
  const first = out.findIndex((value) => value > 0);
  expect(first).toBeGreaterThanOrEqual(48000 * 0.39);
  expect(first).toBeLessThanOrEqual(48000 * 0.41);
});

it('does not grow at the natural end of a reply, and keeps the cushion across interruptions', () => {
  const playback = new PcmPlayback(48000);
  playback.push(new Int16Array(24000 / 4).fill(12000));
  playback.read(48000 * 2);
  // A new reply well over half a second later is a new turn, not a hiccup.
  playback.push(new Int16Array(240).fill(12000));
  expect(playback.cushionMs).toBe(150);
  playback.read(48000 * 2);
  playback.push(new Int16Array(24000 / 4).fill(12000));
  playback.read(48000 / 2);
  playback.push(new Int16Array(240).fill(12000));
  expect(playback.cushionMs).toBe(250);
  playback.clear();
  expect(playback.cushionMs).toBe(250);
});

it('counts queued and heard speech so a handoff mark knows when earlier words have played', () => {
  const playback = new PcmPlayback(48000);
  playback.push(new Int16Array(4800).fill(12000));
  const mark = playback.pushed;
  playback.push(new Int16Array(4800).fill(12000));
  expect(playback.played).toBe(0);
  playback.read(48000 * 0.21);
  expect(playback.played).toBeGreaterThanOrEqual(mark);
  expect(playback.played).toBeLessThan(playback.pushed);
  playback.clear();
  expect(playback.played).toBe(playback.pushed);
});
