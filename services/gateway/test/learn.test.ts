import { describe, it, expect, vi } from 'vitest';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { loadPack } from '@just-imagine/learning-content';
import { startGateway } from '../src/gateway';
import { petsUnlocked, blockedLearningInput } from '../src/learn';
import { systemInstruction, voiceFor } from '../src/prompts';
import { toolDeclarationsFor } from '../src/tools';
import type {
  Identity,
  LiveCallbacks,
  LiveProvider,
  PointsAward,
  SessionRecord,
  SessionStore,
} from '../src/contracts';

const saturn = loadPack('space').challenges.find((c) => c.id === 'ch_saturn_bath')!;

function harness(language: 'en' | 'bn' = 'en', startingPoints = 6) {
  let callbacks: LiveCallbacks | undefined;
  const opened: SessionRecord[] = [];
  const identity: Identity = {
    uid: 'parent',
    childId: 'c_one',
    child: {
      firstName: 'Mira',
      avatar: 'owl',
      ageBand: '8-10',
      tier: 'playground',
      labsUnlocked: false,
      captions: true,
      language,
      sessionTargetMinutes: 8,
      loopsCompleted: 0,
      createdAt: 1,
      points: startingPoints,
      pets: [],
    },
    plan: 'free',
    remaining: 900,
  };
  // An in-memory profile that behaves like the Firestore store: points add up, pets unlock.
  const profile = { points: startingPoints, pets: [] as string[], done: new Set<string>() };
  const awardPoints = vi.fn(async (_record: SessionRecord, award: PointsAward) => {
    profile.points += award.points;
    const unlocked = petsUnlocked(profile.pets, profile.points, award.petReward);
    profile.pets.push(...unlocked);
    profile.done.add(`${award.packId}:${award.challengeId}`);
    return { total: profile.points, unlocked };
  });
  const store = {
    authorize: async () => identity,
    claim: async () => {},
    meter: async () => 900,
    finish: async () => {},
    killSwitch: async () => false,
    watchWorld: () => () => {},
    awardPoints,
  } as unknown as SessionStore;
  const live = { audio: vi.fn(), text: vi.fn(), toolResult: vi.fn(), close: vi.fn() };
  const provider: LiveProvider = {
    open: vi.fn(async (record: SessionRecord, _summary, _handle, cbs) => {
      // Copy what the provider would see at open time; the gateway mutates the record later.
      opened.push(structuredClone(record));
      callbacks = cbs;
      return live;
    }),
    summarize: async () => 'Talked about planets.',
    moderate: async () => 'safe',
  };
  const gateway = startGateway({ store, provider, port: 0, origins: [] });
  return { gateway, provider, live, opened, profile, awardPoints, callbacks: () => callbacks! };
}

async function connect(gateway: ReturnType<typeof startGateway>) {
  if (!gateway.server.address()) await once(gateway.server, 'listening');
  const address = gateway.server.address();
  if (!address || typeof address === 'string') throw new Error('No port');
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}`);
  const messages: Array<Record<string, unknown>> = [];
  socket.on('message', (data, binary) => {
    if (!binary) messages.push(JSON.parse(data.toString()));
  });
  await once(socket, 'open');
  socket.send(
    JSON.stringify({ type: 'hello', idToken: 'valid', childId: 'c_one', characterId: 'bhombol' }),
  );
  await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
  return { socket, messages };
}

const lastResult = (live: { toolResult: ReturnType<typeof vi.fn> }, id: string) =>
  live.toolResult.mock.calls.filter(([callId]) => callId === id).at(-1)?.[2] as
    Record<string, unknown> | undefined;

describe('Learning Worlds conversation through the gateway', () => {
  it('summons Saturn in Bangla, judges a quiz, awards points once, unlocks a pet and hangs up', async () => {
    const h = harness('bn', 6);
    const { socket, messages } = await connect(h.gateway);
    try {
      // The child taps Saturn on the Space stage.
      socket.send(
        JSON.stringify({ type: 'summonPersona', packId: 'space', characterId: 'saturn' }),
      );
      await vi.waitFor(() =>
        expect(messages).toContainEqual({
          type: 'persona',
          packId: 'space',
          characterId: 'saturn',
          name: 'শনি',
        }),
      );
      await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(2));
      const persona = h.opened[1]!;
      expect(persona.persona).toEqual({ packId: 'space', characterId: 'saturn' });
      expect(persona.characterId).toBe('bhombol');
      const instruction = systemInstruction(persona, '');
      expect(instruction).toContain('OUTPUT LANGUAGE: bn-BD');
      expect(instruction).toContain('Use ONLY natural Bangladeshi Bangla');
      expect(instruction).not.toContain(saturn.answerKey);
      expect(voiceFor(persona)).toBe('Kore');

      // Saturn asks her challenge; the browser sees the question in Bangla, never the key.
      h.callbacks().tool('q1', 'ask_quiz', { challengeId: 'ch_saturn_bath' });
      await vi.waitFor(() =>
        expect(messages).toContainEqual({
          type: 'quiz',
          challengeId: 'ch_saturn_bath',
          question: saturn.questionBn,
        }),
      );
      const asked = lastResult(h.live, 'q1');
      expect(asked).toMatchObject({ asked: true, answerKey: 'float', maxPoints: 4 });
      for (const message of messages) {
        const text = JSON.stringify(message);
        expect(text).not.toContain('"float"');
        expect(text).not.toContain('ভাসবে');
      }

      // The child answers by voice; Saturn judges it right and awards the points.
      h.callbacks().transcript('child', 'ভাসবে!', true);
      h.callbacks().tool('a1', 'award_points', { challengeId: 'ch_saturn_bath', points: 4 });
      await vi.waitFor(() =>
        expect(messages).toContainEqual({
          type: 'points',
          total: 10,
          delta: 4,
          reason: 'ch_saturn_bath',
        }),
      );
      await vi.waitFor(() =>
        expect(messages).toContainEqual({ type: 'petUnlocked', petId: 'tuktuk' }),
      );
      expect(lastResult(h.live, 'a1')).toMatchObject({ ok: true, total: 10 });

      // A second award for the same challenge in this session is refused and stores nothing.
      h.callbacks().tool('a2', 'award_points', { challengeId: 'ch_saturn_bath', points: 4 });
      await vi.waitFor(() => expect(lastResult(h.live, 'a2')).toHaveProperty('error'));
      expect(h.awardPoints).toHaveBeenCalledOnce();
      expect(messages.filter((m) => m.type === 'points')).toHaveLength(1);
      expect(messages.filter((m) => m.type === 'petUnlocked')).toHaveLength(1);

      // Hang up: the friend comes back with the companion instruction.
      socket.send(JSON.stringify({ type: 'hangUp' }));
      await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(3));
      expect(h.opened[2]!.persona).toBeUndefined();
      expect(systemInstruction(h.opened[2]!, '')).toContain('Companion prompt');
      await vi.waitFor(() =>
        expect(messages.filter((m) => m.type === 'ready').at(-1)).toMatchObject({
          characterId: 'bhombol',
        }),
      );
    } finally {
      socket.terminate();
      await h.gateway.close();
    }
  });

  it('refuses awards above the challenge maximum, for unasked challenges and outside a persona', async () => {
    const h = harness();
    const { socket, messages } = await connect(h.gateway);
    try {
      h.callbacks().tool('early', 'award_points', { challengeId: 'ch_saturn_bath', points: 1 });
      await vi.waitFor(() => expect(lastResult(h.live, 'early')).toHaveProperty('error'));
      socket.send(
        JSON.stringify({ type: 'summonPersona', packId: 'space', characterId: 'saturn' }),
      );
      await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(2));
      h.callbacks().tool('unasked', 'award_points', { challengeId: 'ch_saturn_bath', points: 4 });
      await vi.waitFor(() => expect(lastResult(h.live, 'unasked')).toHaveProperty('error'));
      // Another character's challenge cannot be asked by Saturn.
      h.callbacks().tool('foreign', 'ask_quiz', { challengeId: 'ch_biggest' });
      await vi.waitFor(() => expect(lastResult(h.live, 'foreign')).toHaveProperty('error'));
      h.callbacks().tool('q', 'ask_quiz', { challengeId: 'ch_saturn_bath' });
      await vi.waitFor(() =>
        expect(messages).toContainEqual(expect.objectContaining({ type: 'quiz' })),
      );
      h.callbacks().transcript('child', 'float', true);
      h.callbacks().tool('greedy', 'award_points', { challengeId: 'ch_saturn_bath', points: 5 });
      await vi.waitFor(() => expect(lastResult(h.live, 'greedy')).toHaveProperty('error'));
      expect(h.awardPoints).not.toHaveBeenCalled();
      expect(messages.some((m) => m.type === 'points')).toBe(false);
      expect(messages).toContainEqual(
        expect.objectContaining({ type: 'quiz', question: saturn.question }),
      );
    } finally {
      socket.terminate();
      await h.gateway.close();
    }
  });

  it('gives a hint once per challenge in the child language', async () => {
    const h = harness('en');
    const { socket } = await connect(h.gateway);
    try {
      socket.send(
        JSON.stringify({ type: 'summonPersona', packId: 'space', characterId: 'saturn' }),
      );
      await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(2));
      h.callbacks().tool('q', 'ask_quiz', { challengeId: 'ch_saturn_bath' });
      h.callbacks().tool('h1', 'give_hint', { challengeId: 'ch_saturn_bath' });
      await vi.waitFor(() => expect(lastResult(h.live, 'h1')).toEqual({ hint: saturn.hint }));
      h.callbacks().tool('h2', 'give_hint', { challengeId: 'ch_saturn_bath' });
      await vi.waitFor(() => expect(lastResult(h.live, 'h2')).toHaveProperty('error'));
    } finally {
      socket.terminate();
      await h.gateway.close();
    }
  });

  it('lets the friend call a pack character by voice and rejects unknown characters', async () => {
    const h = harness();
    const { socket, messages } = await connect(h.gateway);
    try {
      h.callbacks().tool('bad', 'summon_pack_character', { packId: 'space', characterId: 'pluto' });
      await vi.waitFor(() => expect(lastResult(h.live, 'bad')).toHaveProperty('error'));
      socket.send(JSON.stringify({ type: 'summonPersona', packId: 'space', characterId: 'pluto' }));
      await vi.waitFor(() =>
        expect(messages).toContainEqual(expect.objectContaining({ type: 'error' })),
      );
      h.callbacks().tool('call', 'summon_pack_character', {
        packId: 'animals_jungle',
        characterId: 'lion',
      });
      await vi.waitFor(() =>
        expect(messages).toContainEqual(
          expect.objectContaining({
            type: 'persona',
            packId: 'animals_jungle',
            characterId: 'lion',
          }),
        ),
      );
      expect(h.opened.at(-1)!.persona).toEqual({ packId: 'animals_jungle', characterId: 'lion' });
      expect(lastResult(h.live, 'call')).toEqual({ accepted: true });
    } finally {
      socket.terminate();
      await h.gateway.close();
    }
  });
});

describe('interactive learning play', () => {
  it('validates activity context, animates only the active learning character and keeps drawing off the audio path', async () => {
    const h = harness();
    let resolveDrawing!: (image: string) => void;
    h.provider.drawLearningLook = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveDrawing = resolve;
        }),
    );
    const { socket, messages } = await connect(h.gateway);
    try {
      socket.send(
        JSON.stringify({ type: 'summonPersona', packId: 'hygiene', characterId: 'soap' }),
      );
      await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(2));
      h.callbacks().tool('dance', 'animate_learning_character', { action: 'dance' });
      await vi.waitFor(() =>
        expect(messages).toContainEqual({
          type: 'learningAction',
          packId: 'hygiene',
          characterId: 'soap',
          action: 'dance',
        }),
      );
      socket.send(
        JSON.stringify({
          type: 'learningPlay',
          packId: 'space',
          characterId: 'saturn',
          kind: 'activity',
        }),
      );
      const before = h.live.text.mock.calls.length;
      socket.send(
        JSON.stringify({
          type: 'learningPlay',
          packId: 'hygiene',
          characterId: 'soap',
          kind: 'activity',
        }),
      );
      await vi.waitFor(() => expect(h.live.text.mock.calls.length).toBe(before + 1));
      expect(h.live.text.mock.calls.at(-1)?.[0]).toContain('twenty seconds');
      h.callbacks().tool('dress', 'dress_learning_character', {
        description: 'A blue astronaut cape with tiny strawberry pockets',
      });
      await vi.waitFor(() =>
        expect(lastResult(h.live, 'dress')).toMatchObject({ status: 'drawing' }),
      );
      h.callbacks().tool('wave', 'animate_learning_character', { action: 'wave' });
      await vi.waitFor(() => expect(lastResult(h.live, 'wave')).toMatchObject({ ok: true }));
      expect(messages.some((m) => m.type === 'learningLook' && m.status === 'ready')).toBe(false);
      resolveDrawing('data:image/webp;base64,UklGRg==');
      await vi.waitFor(() =>
        expect(messages).toContainEqual(
          expect.objectContaining({ type: 'learningLook', status: 'ready' }),
        ),
      );
      h.callbacks().tool('reset', 'reset_learning_look', {});
      await vi.waitFor(() =>
        expect(messages).toContainEqual(
          expect.objectContaining({ type: 'learningLook', status: 'reset' }),
        ),
      );
    } finally {
      socket.terminate();
      await h.gateway.close();
    }
  });
  it('refuses a reward without a child answer and reports a failed drawing without ending the call', async () => {
    const h = harness();
    h.provider.drawLearningLook = vi.fn(async () => {
      throw new Error('Image model unavailable');
    });
    const { socket, messages } = await connect(h.gateway);
    try {
      socket.send(
        JSON.stringify({ type: 'summonPersona', packId: 'space', characterId: 'saturn' }),
      );
      await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(2));
      h.callbacks().tool('q', 'ask_quiz', { challengeId: 'ch_saturn_bath' });
      await vi.waitFor(() => expect(lastResult(h.live, 'q')).toMatchObject({ asked: true }));
      h.callbacks().tool('phantom', 'award_points', { challengeId: 'ch_saturn_bath', points: 4 });
      await vi.waitFor(() => expect(lastResult(h.live, 'phantom')).toHaveProperty('error'));
      expect(h.awardPoints).not.toHaveBeenCalled();
      h.callbacks().tool('dress', 'dress_learning_character', {
        description: 'A velvet green explorer hat',
      });
      await vi.waitFor(() =>
        expect(messages).toContainEqual(
          expect.objectContaining({ type: 'learningLook', status: 'failed' }),
        ),
      );
      h.callbacks().tool('again', 'animate_learning_character', { action: 'dance' });
      await vi.waitFor(() => expect(lastResult(h.live, 'again')).toMatchObject({ ok: true }));
      expect(messages.some((m) => m.type === 'bye')).toBe(false);
    } finally {
      socket.terminate();
      await h.gateway.close();
    }
  });
});

describe('pets', () => {
  it('unlocks every pet whose threshold the total passes, plus a challenge reward, once', () => {
    expect(petsUnlocked([], 9)).toEqual([]);
    expect(petsUnlocked([], 10)).toEqual(['tuktuk']);
    expect(petsUnlocked(['tuktuk'], 30)).toEqual(['chiku']);
    expect(petsUnlocked([], 30)).toEqual(['tuktuk', 'chiku']);
    expect(petsUnlocked([], 2, 'tuktuk')).toEqual(['tuktuk']);
    expect(petsUnlocked(['tuktuk'], 12, 'tuktuk')).toEqual([]);
    expect(petsUnlocked([], 3, 'not_a_pet')).toEqual([]);
  });
});

describe('persona tools', () => {
  it('gives pack characters only the learning tools and the friend a way to call them', () => {
    const names = (tools: { name: string }[]) => tools.map((t) => t.name).sort();
    expect(
      names(toolDeclarationsFor({ persona: { packId: 'space', characterId: 'saturn' } })),
    ).toEqual([
      'animate_learning_character',
      'ask_quiz',
      'award_points',
      'dress_learning_character',
      'end_session',
      'give_hint',
      'reset_learning_look',
      'summon_pack_character',
    ]);
    const friend = names(toolDeclarationsFor({}));
    expect(friend).toContain('summon_pack_character');
    expect(friend).toContain('build_world');
    expect(friend).not.toContain('award_points');
  });
  it('pins English for an English child and keeps answer keys out of every instruction', () => {
    const record = {
      id: 's',
      characterId: 'bhombol',
      startedAt: 0,
      persona: { packId: 'space', characterId: 'sun' },
      identity: {
        uid: 'u',
        childId: 'c',
        plan: 'free',
        remaining: 1,
        child: { firstName: 'Ari', ageBand: '8-10', language: 'en' },
      },
    } as unknown as SessionRecord;
    const text = systemInstruction(record, 'We met Saturn.');
    expect(text).toContain('Speak only in English');
    for (const challenge of loadPack('space').challenges)
      expect(text).not.toContain(`"${challenge.answerKey}"`);
    expect(text).toContain('ask_quiz');
  });
});

describe('body lesson input backstop', () => {
  it('allows the biological word in the authored body context while retaining every other backstop', () => {
    const body = { persona: { packId: 'body', characterId: 'heart' } };
    expect(blockedLearningInput(body, 'Blood.')).toBeNull();
    expect(blockedLearningInput(body, 'How does blood carry oxygen?')).toBeNull();
    expect(blockedLearningInput(body, 'blood and gore')).toBe('gore');
    expect(blockedLearningInput(body, 'bloody')).toBe('bloody');
    expect(blockedLearningInput({}, 'blood')).toBe('blood');
    expect(
      blockedLearningInput({ persona: { packId: 'space', characterId: 'saturn' } }, 'blood'),
    ).toBe('blood');
  });
});

it('accepts authored story context only for the character currently holding the call', async () => {
  const { storyPlayContext } = await import('../src/learn');
  const record = {
    persona: { packId: 'space', characterId: 'saturn' },
    identity: { child: { language: 'en' } },
  } as SessionRecord;
  const request = {
    packId: 'space',
    characterId: 'saturn',
    missionId: 'saturn',
    storyPhase: 'complete' as const,
  };
  const context = storyPlayContext(record, request)!;
  expect(context).toContain('scattered ice rings');
  expect(context).toContain('Do not award points');
  expect(storyPlayContext(record, { ...request, missionId: 'sun' })).toBeUndefined();
  expect(
    storyPlayContext(record, {
      ...request,
      packId: 'body',
      characterId: 'heart',
      missionId: 'heart',
    }),
  ).toBeUndefined();
  expect(storyPlayContext({ ...record, persona: undefined }, request)).toBeUndefined();
  const bn = storyPlayContext(
    { ...record, identity: { child: { language: 'bn' } } } as SessionRecord,
    request,
  )!;
  expect(bn).toContain('বরফের বলয়');
});
