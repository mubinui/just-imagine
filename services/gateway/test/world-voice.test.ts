import { expect, it } from 'vitest';
import { voiceFor } from '../src/prompts';
import { CHARACTERS } from '@just-imagine/protocol';
import type { SessionRecord } from '../src/contracts';

const record = (character: Record<string, unknown>, characterId = 'bhombol') =>
  ({
    characterId,
    worldCharacter: {
      worldId: 'w_one',
      entityId: 'leo',
      character: {
        name: 'Leo',
        personality: 'A brave lion',
        greeting: 'Roar!',
        topic: 'courage',
        ...character,
      },
    },
  }) as unknown as SessionRecord;

it('speaks with the voice the builder chose for a world character', () => {
  expect(voiceFor(record({ voice: 'Charon' }))).toBe('Charon');
});

it('never gives a world character the friend’s own voice', () => {
  const friend = CHARACTERS.bhombol.voice;
  expect(voiceFor(record({ voice: friend }))).not.toBe(friend);
  expect(voiceFor(record({}))).not.toBe(friend);
});

it('gives an older world character without a voice a stable voice of its own', () => {
  const first = voiceFor(record({}));
  expect(voiceFor(record({}))).toBe(first);
  const other = voiceFor({
    ...record({}),
    worldCharacter: {
      ...record({}).worldCharacter!,
      character: { ...record({}).worldCharacter!.character, name: 'Mia the mouse' },
    },
  } as SessionRecord);
  expect(typeof other).toBe('string');
});
