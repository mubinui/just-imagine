import { it, expect } from 'vitest';
import {
  actingFrame,
  advanceSpeech,
  restingSpeech,
  SPEECH_PHRASE_RELEASE_MS,
  toothFrame,
} from '../components/acting/model';
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
it('responds promptly to speech and holds one pose for the whole phrase', () => {
  let speech = advanceSpeech(restingSpeech(), 0.8, 1000 / 30);
  expect(speech.frame).toBe(4);
  // Loud and quiet syllables inside one phrase never swap the whole-body pose.
  for (let frame = 0; frame < 40; frame++) {
    speech = advanceSpeech(speech, frame % 3 ? 0.08 : 0.9, 1000 / 30);
    expect(speech.frame).toBe(4);
  }
  // A quiet onset keeps its calmer pose even when the phrase grows loud.
  speech = advanceSpeech(restingSpeech(), 0.2, 1000 / 30);
  expect(speech.frame).toBe(3);
  for (let frame = 0; frame < 20; frame++) speech = advanceSpeech(speech, 0.95, 1000 / 30);
  expect(speech.frame).toBe(3);
});

it('changes the whole-body pose at most once per phrase under varying 30Hz speech energy', () => {
  let speech = restingSpeech(),
    previous = 0,
    changes = 0;
  for (let tick = 0; tick < 90; tick++) {
    speech = advanceSpeech(speech, tick % 12 < 6 ? 0.95 : 0.05, 1000 / 30);
    if (speech.frame !== previous) {
      previous = speech.frame;
      changes++;
    }
  }
  expect(changes).toBe(1);
});

it('bridges natural pauses between words and settles only after the phrase-release bound', () => {
  let speech = advanceSpeech(restingSpeech(), 0.9, 1000 / 30);
  const initial = speech.frame;
  for (let time = 10; time < SPEECH_PHRASE_RELEASE_MS; time += 10) {
    speech = advanceSpeech(speech, 0, 10);
    expect(speech.frame).toBe(initial);
  }
  expect(SPEECH_PHRASE_RELEASE_MS).toBeGreaterThanOrEqual(600);
  speech = advanceSpeech(speech, 0, 10);
  expect(speech.frame).toBe(0);
  expect(speech.energy).toBe(0);
});

it('uses one calm speech pose under reduced motion while retaining audible-turn feedback', () => {
  expect(actingFrame({ elapsed: 400, mouth: 0.2, reduced: true })).toBe(3);
  expect(actingFrame({ elapsed: 400, mouth: 0.8, reduced: true })).toBe(3);
  expect(actingFrame({ elapsed: 400, mouth: 0, reduced: true })).toBe(0);
});

it('selects original Tooth cells without layering and retains brushing, waves and celebration', () => {
  expect(toothFrame({ elapsed: 0 })).toBe(0);
  expect(toothFrame({ elapsed: 6250 })).toBe(1);
  expect(toothFrame({ elapsed: 6250, mouth: 1 })).toBe(2);
  expect(toothFrame({ pose: 'brush', elapsed: 0, mouth: 1 })).toBe(4);
  expect(toothFrame({ pose: 'brush', elapsed: 400, mouth: 1 })).toBe(5);
  expect(toothFrame({ pose: 'brush', elapsed: 800 })).toBe(4);
  expect(toothFrame({ pose: 'wave', elapsed: 800 })).toBe(7);
  expect(toothFrame({ pose: 'wave', elapsed: 800, mouth: 1 })).toBe(2);
  expect(toothFrame({ action: 'wave', elapsed: 2600 })).toBe(0);
  expect(toothFrame({ action: 'cheer', elapsed: 800, mouth: 1 })).toBe(6);
  expect(toothFrame({ elapsed: 6250, reduced: true })).toBe(0);
  expect(toothFrame({ pose: 'brush', elapsed: 400, reduced: true })).toBe(4);
  expect(toothFrame({ pose: 'cheer', elapsed: 800, reduced: true })).toBe(6);
});
