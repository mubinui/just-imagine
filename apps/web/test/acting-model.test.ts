import { it, expect } from 'vitest';
import { actingFrame, advanceSpeech, restingSpeech } from '../components/acting/model';
import { ACTING } from '../components/acting/catalog';
import { PACKS } from '@just-imagine/learning-content';

it('chooses one speech pose from playback energy, returning to a closed mouth in silence', () => {
  expect(actingFrame({ elapsed: 800, mouth: 0 })).toBe(0);
  expect(actingFrame({ elapsed: 800, mouth: 0.2 })).toBe(3);
  expect(actingFrame({ elapsed: 800, mouth: 0.8 })).toBe(4);
  expect(actingFrame({ elapsed: 900, mouth: 0 })).toBe(0);
});
it('waves with distinct limb poses and settles instead of looping forever', () => {
  expect(
    [0, 220, 440, 660, 880, 1100, 1500, 2800].map((elapsed) =>
      actingFrame({ elapsed, action: 'wave' }),
    ),
  ).toEqual([0, 5, 6, 5, 6, 5, 0, 0]);
});
it('retains the meaning of reactions while reducing repetitive motion', () => {
  expect(actingFrame({ elapsed: 700, action: 'wave', reduced: true })).toBe(6);
  expect(actingFrame({ elapsed: 700, action: 'cheer', reduced: true })).toBe(7);
  expect(actingFrame({ elapsed: 6100, reduced: true })).toBe(0);
  expect(actingFrame({ elapsed: 6100 })).toBe(1);
  expect(actingFrame({ elapsed: 6000, action: 'still', mouth: 0.9 })).toBe(0);
});
it('covers every predefined learning character except the preserved eight-pose Tooth Town reference', () => {
  for (const pack of Object.values(PACKS))
    for (const character of pack.characters) {
      expect(character.id === 'tooth' || !!ACTING[character.id], character.id).toBe(true);
    }
  expect(Object.keys(ACTING)).toHaveLength(54);
});
it('responds promptly to syllables without chattering at a mouth threshold, and closes after silence', () => {
  let speech = advanceSpeech(restingSpeech(), 0.8, 1000 / 30);
  expect(speech.frame).toBe(4);
  for (let frame = 0; frame < 20; frame++) {
    speech = advanceSpeech(speech, frame % 2 ? 0.355 : 0.365, 1000 / 30);
    expect(speech.frame).toBe(4);
  }
  for (let frame = 0; frame < 3; frame++) speech = advanceSpeech(speech, 0, 1000 / 30);
  expect(speech.frame).toBe(0);
  expect(speech.energy).toBe(0);
});
