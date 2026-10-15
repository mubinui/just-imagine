import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorldDocSchema } from '@just-imagine/protocol';
import { int16ToBytes, pcm16Tone, splitPcm16Frames } from '../src/audio';
import { FakeWorldSource, progressiveScript } from '../src/fake-world-source';
import { FIXTURE_WORLDS, fixtureWorldDoc } from '../src/worlds';

afterEach(() => vi.useRealTimers());

describe('fixture regressions', () => {
  it('includes the projectile lab with variables, visuals, and a challenge', () => {
    const lab = FIXTURE_WORLDS.projectileLab;
    expect(Object.keys(FIXTURE_WORLDS)).toHaveLength(4);
    expect(lab.tier).toBe('lab');
    expect(Object.keys(lab.variables ?? {})).toEqual(['launch_speed', 'launch_angle', 'gravity']);
    expect(lab.visuals).toHaveLength(4);
    expect(lab.challenges?.[0]?.id).toBe('ch_cup');
  });

  it('does not let callers mutate overrides through the returned world', () => {
    const assets = { dragon: { status: 'placeholder' as const } };
    const world = fixtureWorldDoc('jellyDragon', { assets });
    world.assets['dragon']!.status = 'ready';
    expect(assets.dragon.status).toBe('placeholder');
    world.doc.title = 'Changed';
    expect(FIXTURE_WORLDS.jellyDragon.title).not.toBe('Changed');
  });
});

describe('progressive source regressions', () => {
  it('keeps the hero asset in the final ready update', () => {
    const script = progressiveScript('jellyDragon');
    const final = script[2]!.world;
    const hero = final.doc.entities.find(
      (entity) => entity.id === final.doc.learning.heroEntityId,
    )!;
    expect(hero.asset?.status).toBe('ready');
    expect(final.assets[hero.id]?.status).toBe('ready');
    for (const step of script) expect(WorldDocSchema.safeParse(step.world).success).toBe(true);
  });

  it('delivers isolated copies to subscribers and cancels timers on unsubscribe', () => {
    vi.useFakeTimers();
    const script = progressiveScript('jellyDragon');
    const source = new FakeWorldSource(script);
    const one = vi.fn((world) => {
      world.doc.title = 'Changed';
    });
    const two = vi.fn();
    const stopOne = source.subscribe(script[0]!.world.id, one);
    const stopTwo = source.subscribe(script[0]!.world.id, two);
    vi.advanceTimersByTime(0);
    expect(two.mock.calls[0]![0].doc.title).toBe(FIXTURE_WORLDS.jellyDragon.title);
    stopOne();
    stopTwo();
    vi.advanceTimersByTime(2000);
    expect(one).toHaveBeenCalledTimes(1);
    expect(two).toHaveBeenCalledTimes(1);
  });

  it('uses injected timers', () => {
    vi.useFakeTimers();
    const timers = {
      setTimeout: vi.fn(globalThis.setTimeout),
      clearTimeout: vi.fn(globalThis.clearTimeout),
    };
    const script = progressiveScript('jellyDragon');
    const source = new FakeWorldSource(script, { timers });
    const stop = source.subscribe(script[0]!.world.id, vi.fn());
    expect(timers.setTimeout).toHaveBeenCalledTimes(3);
    stop();
    expect(timers.clearTimeout).toHaveBeenCalledTimes(3);
  });

  it('rejects negative delivery delays', () => {
    expect(
      () => new FakeWorldSource([{ afterMs: -1, world: fixtureWorldDoc('moonBounce') }]),
    ).toThrow();
  });
});

describe('audio regressions', () => {
  it.each([0, -1, 0.5, NaN, Infinity])('rejects invalid frame size %s', (size) => {
    // Empty input also exercises zero without risking an infinite loop in an invalid implementation.
    expect(() => splitPcm16Frames(new Uint8Array(), size)).toThrow();
  });

  it('encodes signed samples in little endian and handles a subarray', () => {
    const samples = new Int16Array([123, -32768, -1, 32767, 456]).subarray(1, 4);
    expect(Array.from(int16ToBytes(samples))).toEqual([0, 128, 255, 255, 255, 127]);
  });

  it.each([
    { sampleRate: 0, seconds: 1, frequency: 440 },
    { sampleRate: 16000, seconds: -1, frequency: 440 },
    { sampleRate: 16000, seconds: 0.1, frequency: 9000 },
    { sampleRate: 16000, seconds: 0.1, frequency: 440, amplitude: 2 },
    { sampleRate: 16000, seconds: 0.1, frequency: NaN },
  ])('rejects invalid tone options %j', (options) => {
    expect(() => pcm16Tone(options)).toThrow();
  });
});
