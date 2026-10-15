import { it, expect, vi } from 'vitest';
import { SoundCues } from '../src/sound';
it('unlocks generated sound on gesture, schedules a short cue and closes audio once', async () => {
  const frequency = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    oscillator = {
      frequency,
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as null | (() => void),
    },
    gain = { gain: { ...frequency }, connect: vi.fn(), disconnect: vi.fn() };
  const close = vi.fn(async () => {}),
    resume = vi.fn(async () => {});
  class Context {
    state = 'running';
    currentTime = 2;
    destination = {};
    resume = resume;
    close = close;
    createOscillator = () => oscillator;
    createGain = () => gain;
  }
  vi.stubGlobal('AudioContext', Context);
  try {
    const sounds = new SoundCues();
    sounds.unlock();
    sounds.play('boing');
    await Promise.resolve();
    expect(oscillator.start).toHaveBeenCalledWith(2);
    expect(oscillator.stop).toHaveBeenCalledWith(2.3);
    oscillator.onended?.();
    expect(oscillator.disconnect).toHaveBeenCalledOnce();
    sounds.dispose();
    sounds.dispose();
    expect(close).toHaveBeenCalledOnce();
  } finally {
    vi.unstubAllGlobals();
  }
});
