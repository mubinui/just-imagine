import { describe, it, expect, afterEach } from 'vitest';
import { encodeMessage, parseServerMessage, type ServerMessage } from '@just-imagine/protocol';
import { loadPack } from '@just-imagine/learning-content';
import { startFakeGateway, SCENARIOS, type FakeGateway } from '../src/fake-gateway';

let gateway: FakeGateway | undefined;
afterEach(async () => {
  await gateway?.close();
  gateway = undefined;
});

// A tiny inbox over a browser WebSocket: messages are kept until a test asks for them.
async function open(url: string, childId = 'c_fixture') {
  const ws = new WebSocket(url);
  const seen: ServerMessage[] = [];
  const waiters: Array<() => void> = [];
  ws.addEventListener('message', (event: MessageEvent) => {
    if (typeof event.data !== 'string') return;
    seen.push(parseServerMessage(event.data));
    waiters.splice(0).forEach((wake) => wake());
  });
  await new Promise<void>((resolve, reject) => {
    ws.onopen = () => resolve();
    ws.onerror = () => reject(new Error('connect failed'));
  });
  const until = async <T extends ServerMessage['type']>(
    type: T,
    match: (m: Extract<ServerMessage, { type: T }>) => boolean = () => true,
  ): Promise<Extract<ServerMessage, { type: T }>> => {
    for (;;) {
      const found = seen.find(
        (m): m is Extract<ServerMessage, { type: T }> =>
          m.type === type && match(m as Extract<ServerMessage, { type: T }>),
      );
      if (found) return found;
      await new Promise<void>((resolve) => waiters.push(resolve));
    }
  };
  ws.send(encodeMessage({ type: 'hello', idToken: 't', childId, characterId: 'bhombol' }));
  await until('ready');
  return { ws, seen, until };
}

const saturn = loadPack('space').challenges.find((c) => c.id === 'ch_saturn_bath')!;

describe('fake gateway Learning Worlds', () => {
  it('plays Saturn: persona, a quiz with tappable options, points once, a pet, hang-up', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    const { ws, seen, until } = await open(gateway.url);
    ws.send(encodeMessage({ type: 'summonPersona', packId: 'space', characterId: 'saturn' }));
    expect(await until('persona')).toEqual({
      type: 'persona',
      packId: 'space',
      characterId: 'saturn',
      name: 'Saturn',
    });
    await until('transcript', (m) => m.text.includes('Rings are everything'));
    const quiz = await until('quiz');
    expect(quiz).toMatchObject({ challengeId: 'ch_saturn_bath', question: saturn.question });
    expect(quiz.options).toHaveLength(2);
    expect(quiz.options).toContain('Float');

    // A wrong answer earns the hint, not points.
    ws.send(encodeMessage({ type: 'text', text: quiz.options!.find((o) => o !== 'Float')! }));
    await until('transcript', (m) => m.text.includes(saturn.hint));
    expect(seen.some((m) => m.type === 'points')).toBe(false);

    ws.send(encodeMessage({ type: 'text', text: 'Float' }));
    expect(await until('points')).toEqual({
      type: 'points',
      total: 10,
      delta: 4,
      reason: 'ch_saturn_bath',
    });
    expect(await until('petUnlocked')).toEqual({ type: 'petUnlocked', petId: 'tuktuk' });
    // The persona holds the call: the canned world timeline does not talk over it.
    await new Promise((resolve) => setTimeout(resolve, 2100));
    expect(seen.some((m) => m.type === 'worldJob')).toBe(false);

    // Answering again pays nothing more.
    ws.send(encodeMessage({ type: 'text', text: 'Float' }));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(seen.filter((m) => m.type === 'points')).toHaveLength(1);

    const readyBefore = seen.filter((m) => m.type === 'ready').length;
    ws.send(encodeMessage({ type: 'hangUp' }));
    await until('transcript', (m) => m.text.includes('back'));
    expect(seen.filter((m) => m.type === 'ready').length).toBe(readyBefore + 1);
    expect(seen.filter((m) => m.type === 'ready').at(-1)).toMatchObject({ characterId: 'bhombol' });
    ws.close();
  });

  it('remembers points per child across connections and refuses unknown characters', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    const first = await open(gateway.url);
    first.ws.send(encodeMessage({ type: 'summonPersona', packId: 'space', characterId: 'pluto' }));
    expect(await first.until('error')).toMatchObject({ code: 'FORBIDDEN' });
    first.ws.send(encodeMessage({ type: 'summonPersona', packId: 'space', characterId: 'saturn' }));
    await first.until('quiz');
    first.ws.send(encodeMessage({ type: 'text', text: 'it would float' }));
    expect(await first.until('points')).toMatchObject({ total: 10 });
    first.ws.close();

    const second = await open(gateway.url);
    second.ws.send(encodeMessage({ type: 'summonPersona', packId: 'space', characterId: 'sun' }));
    const quiz = await second.until('quiz');
    second.ws.send(encodeMessage({ type: 'text', text: 'eight' }));
    expect(await second.until('points')).toMatchObject({ total: 12, reason: quiz.challengeId });
    second.ws.close();
  });

  it('plays an animal call first for animals: no quiz options leak an answer key field', async () => {
    gateway = await startFakeGateway({ port: 0, scenario: SCENARIOS.jellyDragon });
    const { ws, until } = await open(gateway.url, 'c_animals');
    ws.send(encodeMessage({ type: 'summonPersona', packId: 'animals_farm', characterId: 'cow' }));
    expect(await until('persona')).toMatchObject({ name: 'Cow' });
    const quiz = await until('quiz');
    expect(Object.keys(quiz).sort()).toEqual(['challengeId', 'options', 'question', 'type']);
    ws.close();
  });
});
