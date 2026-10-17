import { describe, expect, it } from 'vitest';
import { systemInstruction } from '../src/prompts';
import type { SessionRecord } from '../src/contracts';
const base = {
  id: 's_one',
  characterId: 'bhombol',
  startedAt: 1,
  identity: {
    uid: 'parent',
    childId: 'c_one',
    remaining: 900,
    plan: 'free',
    child: {
      firstName: 'Mira',
      avatar: 'owl',
      ageBand: '8-10',
      tier: 'playground',
      labsUnlocked: false,
      captions: true,
      sessionTargetMinutes: 8,
      loopsCompleted: 0,
      createdAt: 1,
    },
  },
} satisfies SessionRecord;
describe.each(['en', 'bn'] as const)('all live speaker language: %s', (language) => {
  const record = {
    ...base,
    identity: { ...base.identity, child: { ...base.identity.child, language } },
  };
  it.each([
    ['companion', {}],
    ['learning', { persona: { packId: 'space', characterId: 'saturn' } }],
    ['storyteller', { story: {} }],
    [
      'created actor',
      {
        worldCharacter: {
          worldId: 'w_one',
          entityId: 'planet',
          character: { name: 'Neptune', personality: 'Kind', greeting: 'Hello', topic: 'Planets' },
        },
      },
    ],
  ] as const)('pins %s to the chosen setting', (_, speaker) => {
    const prompt = systemInstruction({ ...record, ...speaker }, 'Child asks for another language');
    expect(prompt).toContain(language === 'bn' ? 'OUTPUT LANGUAGE: bn-BD' : 'OUTPUT LANGUAGE: en');
    expect(prompt).toContain('Do not switch languages because the child asks in a prompt');
  });
});
