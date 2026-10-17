import { expect, it } from 'vitest';
import { avatarPresence } from '../components/companion/presence';

it('keeps breathing and speech grounded, tiny and bounded across sustained playback', () => {
  let energy = 0;
  for (let frame = 0; frame <= 1440; frame++) {
    const pose = avatarPresence(energy, frame % 90 < 60 ? 10 : 0, (frame * 1000) / 30, 1000 / 30);
    energy = pose.energy;
    expect(pose.scaleX).toBeGreaterThanOrEqual(0.9985);
    expect(pose.scaleX).toBeLessThanOrEqual(1);
    expect(pose.scaleY).toBeGreaterThanOrEqual(1);
    expect(pose.scaleY).toBeLessThanOrEqual(1.00600001);
    expect(pose.lift).toBeGreaterThanOrEqual(0);
    expect(pose.lift).toBeLessThanOrEqual(0.18);
  }
});
it('smooths speech at the same rate across refresh rates and settles without overshoot', () => {
  const speak = (hz: number) => {
    let energy = 0;
    for (let frame = 1; frame <= hz; frame++)
      energy = avatarPresence(energy, 0.6, (frame * 1000) / hz, 1000 / hz).energy;
    return energy;
  };
  expect(speak(30)).toBeCloseTo(speak(120), 8);
  let energy = speak(30);
  for (let frame = 1; frame <= 30; frame++) {
    const next = avatarPresence(energy, 0, (frame * 1000) / 30, 1000 / 30).energy;
    expect(next).toBeLessThan(energy);
    expect(next).toBeGreaterThanOrEqual(0);
    energy = next;
  }
  expect(energy).toBeLessThan(0.001);
});
it('uses a neutral reduced-motion pose and never catches up through a suspended clock', () => {
  expect(avatarPresence(1, 1, 2400, 33, true)).toEqual({
    energy: 0,
    scaleX: 1,
    scaleY: 1,
    lift: 0,
  });
  expect(avatarPresence(0.4, 0, 1000, 20000).energy).toBe(0.4);
  const invalid = avatarPresence(NaN, Infinity, NaN, NaN);
  expect(invalid).toEqual({ energy: 0, scaleX: 1, scaleY: 1, lift: 0 });
});
