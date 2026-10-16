import { describe, it, expect } from 'vitest';
import { createMixer } from '../lib/sound/mixer';
import { FakeAudioContext, fakeLoader, flush, reaches } from './fake-audio';

describe('mixer clips (Learning Worlds animal calls and the toy phone)', () => {
  it('plays a same-origin clip through the cue bus and reports its length', async () => {
    const ctx = new FakeAudioContext();
    const loader = fakeLoader();
    const mixer = createMixer(ctx as unknown as AudioContext, { load: loader.load });
    await mixer.unlock();
    const seconds = await mixer.playClip('/learn/sounds/cow');
    await flush();
    expect(loader.calls[0]).toBe('/learn/sounds/cow.ogg');
    expect(seconds).toBeGreaterThan(0);
    expect(ctx.playingSources).toHaveLength(1);
    expect(reaches(ctx.playingSources[0]!, ctx.destination)).toBe(true);
  });
  it('refuses anything but a plain same-origin path, and stays silent before unlock', async () => {
    const ctx = new FakeAudioContext();
    const loader = fakeLoader();
    const mixer = createMixer(ctx as unknown as AudioContext, { load: loader.load });
    expect(await mixer.playClip('/learn/sounds/cow')).toBe(0);
    await mixer.unlock();
    expect(await mixer.playClip('https://evil.example/cow')).toBe(0);
    expect(await mixer.playClip('/learn/../secret')).toBe(0);
    await flush();
    expect(loader.calls).toEqual([]);
    expect(ctx.playingSources).toHaveLength(0);
  });
  it('is silent while muted', async () => {
    const ctx = new FakeAudioContext();
    const mixer = createMixer(ctx as unknown as AudioContext, { load: fakeLoader().load });
    await mixer.unlock();
    mixer.setMuted(true);
    expect(await mixer.playClip('/learn/sounds/cow')).toBe(0);
  });
});
