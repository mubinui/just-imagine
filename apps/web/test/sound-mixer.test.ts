import { describe, it, expect, vi } from 'vitest';
import { createMixer, DUCK_GAIN, DUCK_IN_SECONDS, DUCK_OUT_SECONDS } from '../lib/sound/mixer';
import { MUSIC_LOOP_SECONDS, type CueName } from '../lib/sound/manifest';
import { FakeAudioContext, fakeLoader, flush, gainsBetween, reaches } from './fake-audio';

function setup(seconds?: (url: string) => number | undefined) {
  const ctx = new FakeAudioContext();
  const loader = fakeLoader(seconds);
  const mixer = createMixer(ctx as unknown as AudioContext, { load: loader.load });
  return { ctx, loader, mixer };
}

async function unlocked(seconds?: (url: string) => number | undefined) {
  const s = setup(seconds);
  await s.mixer.unlock();
  return s;
}

describe('mixer unlock gating', () => {
  it('starts nothing and loads nothing before unlock', async () => {
    const { ctx, loader, mixer } = setup();
    mixer.playCue('tap');
    mixer.playMusic('meadow');
    await flush();
    expect(ctx.sources).toHaveLength(0);
    expect(loader.calls).toHaveLength(0);
    expect(ctx.resumeCalls).toBe(0);
  });

  it('resumes a suspended context on unlock and starts the pending music', async () => {
    const { ctx, mixer } = setup();
    mixer.playMusic('meadow');
    await mixer.unlock();
    expect(ctx.state).toBe('running');
    expect(ctx.resumeCalls).toBe(1);
    await flush();
    expect(ctx.playingSources).toHaveLength(1);
    expect(ctx.playingSources[0]!.loop).toBe(true);
  });

  it('creates a context lazily on unlock when none is injected', async () => {
    const ctx = new FakeAudioContext();
    const loader = fakeLoader();
    const mixer = createMixer(undefined, {
      load: loader.load,
      createContext: () => ctx as unknown as AudioContext,
    });
    mixer.playCue('tap');
    await flush();
    expect(ctx.sources).toHaveLength(0);
    await mixer.unlock();
    mixer.playCue('tap');
    await flush();
    expect(ctx.playingSources).toHaveLength(1);
  });

  it('is inert without any AudioContext', async () => {
    const mixer = createMixer(undefined, { createContext: () => undefined });
    await expect(mixer.unlock()).resolves.toBeUndefined();
    expect(() => {
      mixer.playCue('tap');
      mixer.playMusic('sky');
      mixer.setSpeaking(true);
      mixer.setMuted(true);
      mixer.setReducedMotion(true);
      mixer.stopMusic();
      mixer.dispose();
    }).not.toThrow();
  });
});

describe('cues', () => {
  it('plays a decoded cue through the cue bus to the destination', async () => {
    const { ctx, loader, mixer } = await unlocked();
    mixer.playCue('boing');
    await flush();
    expect(loader.calls).toEqual(['/sound/boing.ogg']);
    const [source] = ctx.playingSources;
    expect(source?.buffer?.duration).toBeCloseTo(0.5);
    expect(reaches(source!, ctx.destination)).toBe(true);
  });

  it('decodes each cue once and reuses the buffer', async () => {
    const { ctx, loader, mixer } = await unlocked();
    mixer.playCue('boing');
    mixer.playCue('boing');
    await flush();
    mixer.playCue('boing');
    await flush();
    expect(loader.calls).toEqual(['/sound/boing.ogg']);
    expect(ctx.decoded).toHaveLength(1);
    expect(ctx.playingSources).toHaveLength(3);
  });

  it('preloads cues without playing them', async () => {
    const { ctx, loader, mixer } = await unlocked();
    await mixer.preload(['tap', 'tick']);
    expect(loader.calls).toEqual(['/sound/tap.ogg', '/sound/tick.ogg']);
    expect(ctx.sources).toHaveLength(0);
    mixer.playCue('tap');
    await flush();
    expect(loader.calls).toHaveLength(2);
    expect(ctx.playingSources).toHaveLength(1);
  });

  it('applies gain, pan and playback rate', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.playCue('boing', { gain: 0.5, pan: -0.3, rate: 1.2 });
    await flush();
    const [source] = ctx.playingSources;
    expect(source!.playbackRate.value).toBeCloseTo(1.2);
    expect(ctx.panners[0]!.pan.value).toBeCloseTo(-0.3);
    expect(reaches(source!, ctx.panners[0]!)).toBe(true);
    const gains = gainsBetween(source!, ctx.destination).map((g) => g.gain.value);
    expect(gains).toContain(0.5);
  });

  it('clamps gain, pan and rate to safe ranges', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.playCue('boing', { gain: 4, pan: 9, rate: 0 });
    await flush();
    const [source] = ctx.playingSources;
    expect(source!.playbackRate.value).toBeGreaterThanOrEqual(0.25);
    expect(ctx.panners[0]!.pan.value).toBe(1);
    const gains = gainsBetween(source!, ctx.destination).map((g) => g.gain.value);
    expect(Math.max(...gains)).toBeLessThanOrEqual(1);
  });

  it('falls back to the next format when a file is missing or will not decode', async () => {
    const { ctx, loader, mixer } = await unlocked((url) =>
      url.endsWith('.ogg') ? undefined : url.endsWith('.m4a') ? 0 : 0.5,
    );
    mixer.playCue('boing');
    await flush();
    expect(loader.calls).toEqual(['/sound/boing.ogg', '/sound/boing.m4a', '/sound/boing.wav']);
    expect(ctx.playingSources).toHaveLength(1);
  });

  it('prefers formats the browser says it can play', async () => {
    const ctx = new FakeAudioContext();
    const loader = fakeLoader();
    const mixer = createMixer(ctx as unknown as AudioContext, {
      load: loader.load,
      canPlay: (format) => format === 'm4a',
    });
    await mixer.unlock();
    mixer.playCue('boing');
    await flush();
    expect(loader.calls[0]).toBe('/sound/boing.m4a');
  });

  it('drops a cue silently when no format loads', async () => {
    const { ctx, mixer } = await unlocked(() => undefined);
    mixer.playCue('boing');
    await flush();
    expect(ctx.sources).toHaveLength(0);
  });

  it('ignores unknown cue names', async () => {
    const { ctx, loader, mixer } = await unlocked();
    mixer.playCue('kazoo' as CueName);
    await flush();
    expect(loader.calls).toHaveLength(0);
    expect(ctx.sources).toHaveLength(0);
  });

  it('keeps at most six cues sounding by stopping the oldest', async () => {
    const { ctx, mixer } = await unlocked();
    for (let i = 0; i < 8; i++) mixer.playCue('tap');
    await flush();
    expect(ctx.sources).toHaveLength(8);
    expect(ctx.playingSources).toHaveLength(6);
    expect(ctx.sources[0]!.stoppedAt).toBeDefined();
    expect(ctx.sources[1]!.stoppedAt).toBeDefined();
    expect(ctx.sources[7]!.playing).toBe(true);
  });

  it('frees a voice when a cue ends so nothing is stolen', async () => {
    const { ctx, mixer } = await unlocked();
    for (let i = 0; i < 6; i++) mixer.playCue('tap');
    await flush();
    ctx.sources[0]!.end();
    mixer.playCue('tap');
    await flush();
    expect(ctx.sources.filter((s) => s.stoppedAt !== undefined)).toHaveLength(0);
    expect(ctx.playingSources).toHaveLength(6);
  });
});

describe('individual clip cancellation', () => {
  it('drops a pre-aborted clip without loading or creating a source', async () => {
    const { ctx, loader, mixer } = await unlocked();
    const controller = new AbortController();
    controller.abort();
    expect(await mixer.playClip('/learn/sounds/phone_ring', { signal: controller.signal })).toBe(0);
    expect(loader.calls).toEqual([]);
    expect(ctx.sources).toEqual([]);
  });

  it('does not start a clip cancelled while its asset is loading', async () => {
    const ctx = new FakeAudioContext();
    let finishLoading!: (data: ArrayBuffer) => void;
    const loaded = new Promise<ArrayBuffer>((resolve) => {
      finishLoading = resolve;
    });
    const mixer = createMixer(ctx as unknown as AudioContext, { load: () => loaded });
    await mixer.unlock();
    const controller = new AbortController();
    const playback = mixer.playClip('/learn/sounds/phone_ring', { signal: controller.signal });
    controller.abort();
    finishLoading(new ArrayBuffer(44100));
    expect(await playback).toBe(0);
    expect(ctx.sources).toEqual([]);
  });

  it('returns zero after a cancelled decode without cancelling another request for the same buffer', async () => {
    const { ctx, loader, mixer } = await unlocked();
    const decode = ctx.decodeAudioData.bind(ctx);
    let finishDecoding!: () => void;
    const decoding = new Promise<void>((resolve) => {
      finishDecoding = resolve;
    });
    const pendingDecode = vi.spyOn(ctx, 'decodeAudioData').mockImplementation(async (data) => {
      await decoding;
      return decode(data);
    });
    const controller = new AbortController();
    const cancelled = mixer.playClip('/learn/sounds/cow', { signal: controller.signal });
    const other = mixer.playClip('/learn/sounds/cow');
    await flush();
    expect(pendingDecode).toHaveBeenCalledTimes(1);
    controller.abort();
    finishDecoding();
    expect(await cancelled).toBe(0);
    expect(await other).toBe(0.5);
    expect(loader.calls).toEqual(['/learn/sounds/cow.ogg']);
    expect(ctx.playingSources).toHaveLength(1);
    expect(await mixer.playClip('/learn/sounds/cow')).toBe(0.5);
    expect(pendingDecode).toHaveBeenCalledTimes(1);
    expect(ctx.playingSources).toHaveLength(2);
  });

  it('stops only the signalled clip immediately and disconnects its complete graph', async () => {
    const { ctx, mixer } = await unlocked();
    const controller = new AbortController();
    await mixer.playClip('/learn/sounds/phone_ring', { signal: controller.signal, pan: 0.5 });
    const ring = ctx.sources[0]!;
    const ringGain = gainsBetween(ring, ctx.destination)[0]!;
    mixer.playMusic('meadow');
    mixer.playCue('tap');
    await mixer.playClip('/learn/sounds/cow');
    await flush();
    expect(ctx.playingSources).toHaveLength(4);
    ctx.advance(0.2);
    controller.abort();
    expect(ring.stoppedAt).toBe(0.2);
    expect(ring.outputs.size).toBe(0);
    expect(ringGain.outputs.size).toBe(0);
    expect(ctx.panners[0]!.outputs.size).toBe(0);
    expect(ring.onended).toBeNull();
    expect(ctx.playingSources).toHaveLength(3);
    expect(ctx.sources.slice(1).every((source) => source.stoppedAt === undefined)).toBe(true);
  });

  it('removes the abort listener and frees its voice on a natural end', async () => {
    const { ctx, mixer } = await unlocked();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    await mixer.playClip('/learn/sounds/cow', { signal: controller.signal });
    const clip = ctx.sources[0]!;
    clip.end();
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(clip.outputs.size).toBe(0);
    expect(clip.onended).toBeNull();
    controller.abort();
    expect(clip.stoppedAt).toBeUndefined();
    for (let i = 0; i < 6; i++) mixer.playCue('tap');
    await flush();
    expect(ctx.sources.every((source) => source.stoppedAt === undefined)).toBe(true);
    expect(ctx.playingSources).toHaveLength(6);
  });

  it('cleans up clip listeners and nodes on disposal, including a stolen voice still fading', async () => {
    const ctx = new FakeAudioContext();
    const mixer = createMixer(ctx as unknown as AudioContext, {
      load: fakeLoader().load,
      maxVoices: 1,
    });
    await mixer.unlock();
    const first = new AbortController(),
      second = new AbortController();
    const removeFirst = vi.spyOn(first.signal, 'removeEventListener');
    const removeSecond = vi.spyOn(second.signal, 'removeEventListener');
    await mixer.playClip('/learn/sounds/phone_ring', { signal: first.signal });
    await mixer.playClip('/learn/sounds/cow', { signal: second.signal });
    expect(ctx.sources[0]!.stoppedAt).toBe(0.02);
    mixer.dispose();
    expect(removeFirst).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(removeSecond).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(
      ctx.sources.every(
        (source) => source.stoppedAt === 0 && source.outputs.size === 0 && source.onended === null,
      ),
    ).toBe(true);
    ctx.advance(1);
    first.abort();
    second.abort();
    expect(ctx.sources.every((source) => source.stoppedAt === 0)).toBe(true);
  });
});

describe('music', () => {
  it('loops the bed at the manifest loop length', async () => {
    const { ctx, loader, mixer } = await unlocked((url) => (url.includes('/music/') ? 30.5 : 0.5));
    mixer.playMusic('sky');
    await flush();
    expect(loader.calls).toEqual(['/music/sky.ogg']);
    const [source] = ctx.playingSources;
    expect(source!.loop).toBe(true);
    expect(source!.loopStart).toBe(0);
    expect(source!.loopEnd).toBeCloseTo(MUSIC_LOOP_SECONDS.sky, 6);
  });

  it('never sets a loop point past a short buffer', async () => {
    const { ctx, mixer } = await unlocked(() => 10);
    mixer.playMusic('meadow');
    await flush();
    expect(ctx.playingSources[0]!.loopEnd).toBeCloseTo(10, 6);
  });

  it('crossfades to a new theme and ignores a repeat of the current one', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.playMusic('meadow');
    await flush();
    mixer.playMusic('meadow');
    await flush();
    expect(ctx.sources).toHaveLength(1);
    ctx.advance(2);
    mixer.playMusic('pond');
    await flush();
    expect(ctx.sources).toHaveLength(2);
    const [old, next] = ctx.sources;
    expect(old!.stoppedAt).toBeGreaterThan(2);
    expect(old!.stoppedAt!).toBeLessThanOrEqual(3.5);
    const fade = gainsBetween(old!, ctx.destination).find((g) => g.gain.lastRamp()?.value === 0);
    expect(fade).toBeDefined();
    expect(next!.playing).toBe(true);
    expect(next!.startedAt).toBe(2);
  });

  it('stopMusic fades out and stops the bed', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.playMusic('room');
    await flush();
    ctx.advance(1);
    mixer.stopMusic();
    const [source] = ctx.sources;
    expect(source!.stoppedAt).toBeGreaterThan(1);
    expect(source!.stoppedAt!).toBeLessThanOrEqual(2);
    mixer.playMusic('room');
    await flush();
    expect(ctx.sources).toHaveLength(2);
    expect(ctx.sources[1]!.playing).toBe(true);
  });
});

describe('ducking under speech (Review Focus 6)', () => {
  it('ducks music to -12 dB within 100 ms of speech start', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.playMusic('meadow');
    await flush();
    ctx.advance(4);
    mixer.setSpeaking(true);
    const [music] = ctx.playingSources;
    const ramps = gainsBetween(music!, ctx.destination)
      .map((g) => g.gain.lastRamp())
      .filter((r) => r !== undefined);
    const duck = ramps.find((r) => Math.abs(r.value! - DUCK_GAIN) < 1e-6);
    expect(duck).toBeDefined();
    expect(duck!.time - ctx.currentTime).toBeLessThanOrEqual(0.1);
    expect(duck!.time).toBeGreaterThan(ctx.currentTime);
    expect(DUCK_GAIN).toBeCloseTo(Math.pow(10, -12 / 20), 6);
    expect(DUCK_IN_SECONDS).toBeLessThanOrEqual(0.1);
  });

  it('leaves cues at full level while speaking', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.setSpeaking(true);
    mixer.playCue('tap');
    await flush();
    const [cue] = ctx.playingSources;
    const values = gainsBetween(cue!, ctx.destination).map((g) => g.gain.value);
    expect(values.every((v) => v >= 0.99)).toBe(true);
  });

  it('restores music over 600 ms after speech ends', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.playMusic('meadow');
    await flush();
    mixer.setSpeaking(true);
    ctx.advance(3);
    mixer.setSpeaking(false);
    const [music] = ctx.playingSources;
    const ramps = gainsBetween(music!, ctx.destination).map((g) => g.gain.lastRamp());
    const restore = ramps.find((r) => r?.value === 1 && r.time > ctx.currentTime);
    expect(restore).toBeDefined();
    expect(restore!.time - ctx.currentTime).toBeCloseTo(DUCK_OUT_SECONDS, 6);
    expect(DUCK_OUT_SECONDS).toBeCloseTo(0.6, 6);
  });

  it('applies a duck that began before the music started', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.setSpeaking(true);
    mixer.playMusic('lab');
    await flush();
    const [music] = ctx.playingSources;
    const ducked = gainsBetween(music!, ctx.destination).some(
      (g) => Math.abs(g.gain.value - DUCK_GAIN) < 1e-6,
    );
    expect(ducked).toBe(true);
  });

  it('does not re-ramp when speaking state repeats', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.playMusic('meadow');
    await flush();
    mixer.setSpeaking(true);
    const [music] = ctx.playingSources;
    const before = gainsBetween(music!, ctx.destination).map((g) => g.gain.events.length);
    mixer.setSpeaking(true);
    const after = gainsBetween(music!, ctx.destination).map((g) => g.gain.events.length);
    expect(after).toEqual(before);
  });
});

describe('mute and reduced motion', () => {
  it('hard-mutes everything immediately on the parent setting', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.playMusic('meadow');
    mixer.playCue('tap');
    await flush();
    ctx.advance(2);
    mixer.setMuted(true);
    const [music, cue] = ctx.playingSources;
    for (const source of [music!, cue!]) {
      const muted = gainsBetween(source, ctx.destination).find((g) => g.gain.value === 0);
      expect(muted).toBeDefined();
      const last = muted!.gain.events[muted!.gain.events.length - 1]!;
      expect(last.type).toBe('set');
      expect(last.time).toBe(ctx.currentTime);
    }
  });

  it('drops cues while muted and plays them again after unmute', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.setMuted(true);
    mixer.playCue('tap');
    await flush();
    expect(ctx.sources).toHaveLength(0);
    mixer.setMuted(false);
    mixer.playCue('tap');
    await flush();
    expect(ctx.playingSources).toHaveLength(1);
    const values = gainsBetween(ctx.playingSources[0]!, ctx.destination).map((g) => g.gain.value);
    expect(values.every((v) => v > 0)).toBe(true);
  });

  it('reduced motion silences the music bed but keeps cues', async () => {
    const { ctx, mixer } = await unlocked();
    mixer.setReducedMotion(true);
    mixer.playMusic('meadow');
    mixer.playCue('tap');
    await flush();
    const [music, cue] = ctx.playingSources;
    expect(gainsBetween(music!, ctx.destination).some((g) => g.gain.value === 0)).toBe(true);
    expect(gainsBetween(cue!, ctx.destination).every((g) => g.gain.value > 0)).toBe(true);
    mixer.setReducedMotion(false);
    expect(gainsBetween(music!, ctx.destination).every((g) => g.gain.value > 0)).toBe(true);
  });
});

describe('dispose', () => {
  it('stops every source and closes only a context it created', async () => {
    const owned = new FakeAudioContext();
    const loader = fakeLoader();
    const mixer = createMixer(undefined, {
      load: loader.load,
      createContext: () => owned as unknown as AudioContext,
    });
    await mixer.unlock();
    mixer.playMusic('meadow');
    mixer.playCue('tap');
    await flush();
    mixer.dispose();
    expect(owned.playingSources).toHaveLength(0);
    expect(owned.state).toBe('closed');
    mixer.playCue('tap');
    await flush();
    expect(owned.sources).toHaveLength(2);

    const { ctx, mixer: injected } = await unlocked();
    injected.dispose();
    expect(ctx.state).toBe('running');
  });
});
