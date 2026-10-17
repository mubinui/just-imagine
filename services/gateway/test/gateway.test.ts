import { it, expect, vi } from 'vitest';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { startGateway } from '../src/gateway';
import { minimalScene } from '../../../packages/scene-schema/test/helpers';
import { systemInstruction } from '../src/prompts';
import { toolDeclarationsFor } from '../src/tools';
import type { WorldDoc } from '@just-imagine/protocol';
import type { LiveCallbacks, SessionStore, SessionRecord, LiveProvider } from '../src/contracts';
function harness(meterIntervalMs?: number) {
  const records = new Map<string, SessionRecord>();
  let callbacks: LiveCallbacks | undefined;
  const identity = {
    uid: 'parent',
    childId: 'c_one',
    child: {
      firstName: 'Mira',
      avatar: 'owl' as const,
      ageBand: '8-10' as const,
      tier: 'playground' as const,
      labsUnlocked: false,
      captions: true,
      sessionTargetMinutes: 8,
      loopsCompleted: 0,
      createdAt: 1,
    },
    plan: 'free' as const,
    remaining: 900,
  };
  const store = {
    authorize: async (token: string) => {
      if (token !== 'valid') throw new Error('badtoken');
      return identity;
    },
    claim: async (record: SessionRecord) => {
      if (records.size) throw new Error('SESSION_ACTIVE_ELSEWHERE');
      records.set(record.id, record);
    },
    meter: async () => 900,
    release: async (record: SessionRecord) => {
      records.delete(record.id);
    },
    finish: async (record: SessionRecord) => {
      records.delete(record.id);
    },
    killSwitch: async () => false,
    watchWorld: () => () => {},
  } as unknown as SessionStore;
  const live = { audio: vi.fn(), text: vi.fn(), toolResult: vi.fn(), close: vi.fn() };
  const provider: LiveProvider = {
    open: vi.fn(async (_record, _summary, _handle, cbs) => {
      callbacks = cbs;
      return live;
    }),
    summarize: async () => 'Explored bounce.',
    moderate: async () => 'safe',
  };
  const gateway = startGateway({
    store,
    provider,
    port: 0,
    meterIntervalMs,
    origins: ['https://app.example'],
  });
  return { gateway, records, provider, store, live, callbacks: () => callbacks };
}
async function connect(gateway: ReturnType<typeof startGateway>) {
  if (!gateway.server.address()) await once(gateway.server, 'listening');
  const address = gateway.server.address();
  if (!address || typeof address === 'string') throw new Error('No port');
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}`);
  const messages: unknown[] = [];
  socket.on('message', (data, binary) => {
    if (!binary) messages.push(JSON.parse(data.toString()));
  });
  await once(socket, 'open');
  return { socket, messages };
}
const hello = { type: 'hello', idToken: 'valid', childId: 'c_one', characterId: 'bhombol' };

it('allows the next language call after bye while the previous summary is still pending', async () => {
  const h = harness();
  let resolveSummary!: (value: string) => void;
  h.provider.summarize = vi.fn(
    () =>
      new Promise<string>((resolve) => {
        resolveSummary = resolve;
      }),
  );
  h.store.finish = vi.fn(h.store.finish);
  const first = await connect(h.gateway);
  let second: Awaited<ReturnType<typeof connect>> | undefined;
  try {
    first.socket.send(JSON.stringify(hello));
    await vi.waitFor(() => expect(first.messages[0]).toMatchObject({ type: 'ready' }));
    first.socket.send(JSON.stringify({ type: 'end' }));
    await vi.waitFor(() => expect(first.messages).toContainEqual({ type: 'bye', reason: 'ended' }));
    await vi.waitFor(() => expect(h.provider.summarize).toHaveBeenCalledOnce());
    expect(h.store.finish).not.toHaveBeenCalled();
    second = await connect(h.gateway);
    second.socket.send(JSON.stringify(hello));
    await vi.waitFor(() => expect(second!.messages[0]).toMatchObject({ type: 'ready' }));
    h.provider.summarize = async () => 'Next conversation.';
    resolveSummary('Previous conversation.');
    await vi.waitFor(() => expect(h.store.finish).toHaveBeenCalledOnce());
    expect(h.records.size).toBe(1);
  } finally {
    resolveSummary?.('Previous conversation.');
    first.socket.terminate();
    second?.socket.terminate();
    await h.gateway.close();
  }
});

it('does not offer or send lesson prediction overlays in incidental creative worlds', async () => {
  expect(
    toolDeclarationsFor({ learningMode: 'incidental' }).map((tool) => tool.name),
  ).not.toContain('ask_prediction');
  const h = harness();
  const doc = minimalScene();
  doc.learning.mode = 'incidental';
  h.store.world = vi.fn(async () => ({ doc }) as WorldDoc);
  const { socket, messages } = await connect(h.gateway);
  try {
    socket.send(JSON.stringify({ ...hello, worldId: 'w_openplay' }));
    await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
    h.callbacks()?.tool('t_unwanted_quiz', 'ask_prediction', {
      question: 'Which falls faster?',
      options: ['A', 'B'],
      correctIndex: 0,
    });
    await vi.waitFor(() =>
      expect(h.live.toolResult).toHaveBeenCalledWith(
        't_unwanted_quiz',
        'ask_prediction',
        expect.objectContaining({ error: expect.any(String) }),
      ),
    );
    expect(messages.some((message) => (message as { type: string }).type === 'prediction')).toBe(
      false,
    );
  } finally {
    socket.terminate();
    await h.gateway.close();
  }
});

it('sends invented actions as creative edits and queues a real undo for the owned world', async () => {
  const h = harness();
  h.store.world = vi.fn(async () => ({ revisionId: 'j_before', doc: minimalScene() }) as WorldDoc);
  h.store.enqueue = vi.fn(async () => {});
  const { socket, messages } = await connect(h.gateway);
  try {
    socket.send(JSON.stringify({ ...hello, worldId: 'w_theatre' }));
    await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
    const instruction =
      'Add a cloud who follows me and turns the mailbox into a portal. Remove the score.';
    h.callbacks()?.tool('t_invent', 'modify_world', { instruction });
    await vi.waitFor(() =>
      expect(h.store.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'patch', worldId: 'w_theatre', instruction }),
      ),
    );
    h.callbacks()?.tool('t_undo', 'undo_world', {});
    await vi.waitFor(() =>
      expect(h.store.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'undo',
          worldId: 'w_theatre',
          uid: 'parent',
          childId: 'c_one',
        }),
      ),
    );
    h.store.world = vi.fn(async () => ({ doc: minimalScene() }) as WorldDoc);
    const count = vi.mocked(h.store.enqueue).mock.calls.length;
    socket.send(JSON.stringify({ type: 'undoWorld' }));
    await vi.waitFor(() =>
      expect(messages).toContainEqual(
        expect.objectContaining({
          type: 'error',
          message: 'There is no completed edit to undo yet.',
        }),
      ),
    );
    expect(h.store.enqueue).toHaveBeenCalledTimes(count);
  } finally {
    socket.terminate();
    await h.gateway.close();
  }
});
it('hands a created-world conversation to the selected character and back to the friend', async () => {
  const h = harness();
  const scene = minimalScene();
  scene.worldId = 'w_planets';
  scene.entities[1]!.id = 'earth';
  scene.entities[1]!.character = {
    name: 'Earth',
    personality: 'Warm and curious',
    greeting: 'Hello, explorer!',
    topic: 'Oceans and life',
  };
  h.store.world = vi.fn(async () => ({ doc: scene }) as WorldDoc);
  const { socket, messages } = await connect(h.gateway);
  try {
    socket.send(JSON.stringify({ ...hello, worldId: 'w_planets' }));
    await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
    socket.send(JSON.stringify({ type: 'talkToCharacter', entityId: 'missing' }));
    await vi.waitFor(() =>
      expect(messages).toContainEqual(
        expect.objectContaining({ type: 'error', code: 'FORBIDDEN' }),
      ),
    );
    expect(h.provider.open).toHaveBeenCalledOnce();
    socket.send(JSON.stringify({ type: 'talkToCharacter', entityId: 'earth' }));
    await vi.waitFor(() =>
      expect(messages).toContainEqual({ type: 'worldCharacter', entityId: 'earth', name: 'Earth' }),
    );
    const record = [...h.records.values()][0]!;
    expect(record.worldCharacter?.entityId).toBe('earth');
    expect(systemInstruction(record, '')).toContain('Oceans and life');
    expect(systemInstruction(record, '')).toContain('not a real planet');
    await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(2));
    socket.send(JSON.stringify({ type: 'hangUp' }));
    await vi.waitFor(() =>
      expect(messages).toContainEqual({ type: 'worldCharacter', entityId: null, name: 'Bhombol' }),
    );
    expect(record.worldCharacter).toBeUndefined();
    expect(record.worldId).toBe('w_planets');
    await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(3));
    socket.send(JSON.stringify({ type: 'talkToCharacter', entityId: 'earth' }));
    await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(4));
    h.callbacks()?.tool('t_return', 'switch_character', { characterId: 'bhombol' });
    await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(5));
    expect(record.worldCharacter).toBeUndefined();
  } finally {
    socket.terminate();
    await h.gateway.close();
  }
});

it('keeps creation available to Lab-profile children and sends their language to the builder', async () => {
  const h = harness();
  const authorize = h.store.authorize;
  h.store.authorize = async (token, childId) => {
    const identity = await authorize(token, childId);
    return { ...identity, child: { ...identity.child, tier: 'lab', language: 'bn' } };
  };
  h.store.enqueue = vi.fn(async () => {});
  const { socket, messages } = await connect(h.gateway);
  try {
    socket.send(JSON.stringify(hello));
    await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
    h.callbacks()?.tool('t_build', 'build_world', {
      description: 'A game meeting talking planets',
      concepts: ['gravity'],
      experience: 'game',
    });
    await vi.waitFor(() => expect(h.store.enqueue).toHaveBeenCalledOnce());
    expect(h.store.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ tier: 'playground', language: 'bn', experience: 'game' }),
    );
  } finally {
    socket.terminate();
    await h.gateway.close();
  }
});

it('keeps fast speech bursts intact and closes explicitly when the audio transport is overloaded', async () => {
  const h = harness();
  const { socket, messages } = await connect(h.gateway);
  try {
    socket.send(JSON.stringify(hello));
    await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
    const peer = [...h.gateway.server.clients][0]!;
    let queued = 24000 * 2 * 4;
    Object.defineProperty(peer, 'bufferedAmount', { get: () => queued });
    const received = once(socket, 'message');
    h.callbacks()?.audio(Buffer.alloc(960, 12));
    const [frame, binary] = await received;
    expect(binary).toBe(true);
    expect(frame).toEqual(Buffer.alloc(960, 12));
    queued = 24000 * 2 * 31;
    const closed = once(socket, 'close');
    h.callbacks()?.audio(Buffer.alloc(960));
    const [code] = await closed;
    expect(code).toBe(1013);
  } finally {
    socket.terminate();
    await h.gateway.close();
  }
});
it('authenticates, streams binary, forwards interruptions, and closes without retained sessions', async () => {
  const h = harness();
  const { socket, messages } = await connect(h.gateway);
  socket.send(JSON.stringify(hello));
  await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
  socket.send(Buffer.alloc(640));
  await vi.waitFor(() => expect(h.live.audio).toHaveBeenCalledOnce());
  h.callbacks()?.interrupted();
  await vi.waitFor(() => expect(messages).toContainEqual({ type: 'interrupted' }));
  socket.send(JSON.stringify({ type: 'end' }));
  await once(socket, 'close');
  await vi.waitFor(() => expect(h.records.size).toBe(0));
  await h.gateway.close();
});
it('refuses a second active tab without disturbing the first', async () => {
  const h = harness();
  const a = await connect(h.gateway);
  a.socket.send(JSON.stringify(hello));
  await vi.waitFor(() => expect(a.messages[0]).toMatchObject({ type: 'ready' }));
  const b = await connect(h.gateway);
  b.socket.send(JSON.stringify(hello));
  await once(b.socket, 'close');
  expect(b.messages[0]).toMatchObject({ type: 'error', code: 'SESSION_ACTIVE_ELSEWHERE' });
  expect(a.socket.readyState).toBe(WebSocket.OPEN);
  await h.gateway.close();
});
it('reconnects a detached socket with the same session and without another Live session', async () => {
  const h = harness();
  const a = await connect(h.gateway);
  a.socket.send(JSON.stringify(hello));
  await vi.waitFor(() => expect(a.messages[0]).toMatchObject({ type: 'ready' }));
  const sessionId = (a.messages[0] as { sessionId: string }).sessionId;
  a.socket.close();
  await once(a.socket, 'close');
  const b = await connect(h.gateway);
  b.socket.send(JSON.stringify({ ...hello, sessionId }));
  await vi.waitFor(() => expect(b.messages[0]).toMatchObject({ type: 'ready', sessionId }));
  expect(h.provider.open).toHaveBeenCalledOnce();
  await h.gateway.close();
});
it('rejects invalid tokens without opening a model session', async () => {
  const h = harness();
  const a = await connect(h.gateway);
  a.socket.send(JSON.stringify({ ...hello, idToken: 'bad' }));
  await once(a.socket, 'close');
  expect(h.provider.open).not.toHaveBeenCalled();
  await h.gateway.close();
});

it('finishes even if the final meter fails', async () => {
  const h = harness();
  h.store.meter = async () => {
    throw new Error('meter unavailable');
  };
  const a = await connect(h.gateway);
  a.socket.send(JSON.stringify(hello));
  await vi.waitFor(() => expect(a.messages[0]).toMatchObject({ type: 'ready' }));
  a.socket.send(JSON.stringify({ type: 'end' }));
  await once(a.socket, 'close');
  await vi.waitFor(() => expect(h.records.size).toBe(0));
  await h.gateway.close();
});
it('ends immediately despite a blocked control operation', async () => {
  const h = harness();
  let release: () => void = () => {};
  h.provider.moderate = () =>
    new Promise((resolve) => {
      release = () => resolve('safe');
    });
  const a = await connect(h.gateway);
  a.socket.send(JSON.stringify(hello));
  await vi.waitFor(() => expect(a.messages[0]).toMatchObject({ type: 'ready' }));
  a.socket.send(JSON.stringify({ type: 'text', text: 'A bouncy ball' }));
  await new Promise((resolve) => setTimeout(resolve, 25));
  a.socket.send(JSON.stringify({ type: 'end' }));
  await once(a.socket, 'close');
  await vi.waitFor(() => expect(h.records.size).toBe(0));
  release();
  await h.gateway.close();
});
it('does not install world listeners when enqueue finishes after session end', async () => {
  const h = harness();
  let release: () => void = () => {};
  h.store.enqueue = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  h.store.watchWorld = vi.fn(() => () => {});
  h.store.watchJob = vi.fn(() => () => {});
  const a = await connect(h.gateway);
  a.socket.send(JSON.stringify(hello));
  await vi.waitFor(() => expect(a.messages[0]).toMatchObject({ type: 'ready' }));
  h.callbacks()?.tool('call_build', 'build_world', {
    description: 'A bouncy ball',
    concepts: ['bounce'],
  });
  await vi.waitFor(() => expect(h.store.enqueue).toHaveBeenCalledOnce());
  a.socket.send(JSON.stringify({ type: 'end' }));
  await once(a.socket, 'close');
  await vi.waitFor(() => expect(h.records.size).toBe(0));
  release();
  await new Promise((resolve) => setTimeout(resolve, 25));
  expect(h.store.watchWorld).not.toHaveBeenCalled();
  expect(h.store.watchJob).not.toHaveBeenCalled();
  await h.gateway.close();
});

it('warns before quota exhaustion and ends independently of control traffic', async () => {
  const h = harness(50);
  let ticks = 0;
  h.store.meter = async () => (++ticks === 1 ? 120 : 0);
  const a = await connect(h.gateway);
  a.socket.send(JSON.stringify(hello));
  await once(a.socket, 'close');
  expect(a.messages).toContainEqual({ type: 'quota', voiceSecondsLeft: 120 });
  expect(a.messages).toContainEqual({ type: 'bye', reason: 'quota' });
  await vi.waitFor(() => expect(h.records.size).toBe(0));
  await h.gateway.close();
});
it('replays the control manifest after opening Live and announces ready-to-ready patches', async () => {
  const h = harness();
  let update: Parameters<SessionStore['watchWorld']>[1] = () => {};
  let jobUpdate: (status: string) => void = () => {};
  h.store.watchJob = (_id, callback) => {
    jobUpdate = callback;
    callback('fallback');
    return () => {};
  };
  let patchId = '';
  const world = {
    ownerUid: 'parent',
    childId: 'c_one',
    jobId: 'j_first',
    status: 'ready',
    title: 'A lab',
    concepts: ['projectile'],
    assets: {},
    doc: {
      tier: 'lab',
      learning: { heroEntityId: 'ball', dials: ['heroMaterial'] },
      materials: { rubber: {} },
      variables: { launchSpeed: { min: 1, max: 10, step: 1, value: 5 } },
      challenges: [{ id: 'landInCup', goal: 'Land in the cup' }],
      entities: [{ id: 'ball', tags: ['hero'] }],
    },
  } as unknown as Awaited<ReturnType<SessionStore['world']>>;
  h.store.world = async () => world;
  h.store.watchWorld = (_id, callback) => {
    update = callback;
    callback(world);
    return () => {};
  };
  h.store.enqueue = vi.fn(async (job) => {
    patchId = job.jobId;
  });
  const a = await connect(h.gateway);
  a.socket.send(JSON.stringify({ ...hello, worldId: 'w_lab' }));
  await vi.waitFor(() =>
    expect(a.messages).toContainEqual(expect.objectContaining({ type: 'ready' })),
  );
  expect(h.live.text).toHaveBeenCalledWith(expect.stringContaining('launchSpeed'));
  expect(h.live.text).toHaveBeenCalledWith(expect.stringContaining('landInCup'));
  expect(h.live.text).toHaveBeenCalledWith(expect.stringContaining('safe sample world'));
  jobUpdate('running');
  jobUpdate('failed');
  expect(h.live.text).toHaveBeenLastCalledWith(expect.stringContaining('Creation did not finish'));
  jobUpdate('running');
  expect(h.live.text).toHaveBeenLastCalledWith(
    expect.not.stringContaining('Creation did not finish'),
  );
  jobUpdate('failed');
  jobUpdate('complete');
  expect(h.live.text).toHaveBeenLastCalledWith(
    expect.not.stringContaining('Creation did not finish'),
  );
  h.live.text.mockClear();
  a.socket.send(JSON.stringify({ type: 'switchCharacter', characterId: 'chandni' }));
  await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(2));
  expect(h.live.text).toHaveBeenCalledWith(expect.stringContaining('launchSpeed'));
  expect(h.live.text).not.toHaveBeenCalledWith(expect.stringContaining('Creation did not finish'));
  h.callbacks()?.tool('patch', 'modify_world', { instruction: 'Rename this lab' });
  await vi.waitFor(() => expect(patchId).not.toBe(''));
  update({ ...world, jobId: patchId, title: 'Renamed lab' });
  await vi.waitFor(() =>
    expect(a.messages).toContainEqual({
      type: 'worldJob',
      worldId: 'w_lab',
      jobId: patchId,
      status: 'ready',
    }),
  );
  expect(h.live.text).toHaveBeenCalledWith(expect.stringContaining('Renamed lab'));
  await h.gateway.close();
});
it('does not install a meter interval after end during the initial Live open', async () => {
  const h = harness(170);
  let release: () => void = () => {};
  h.provider.open = () =>
    new Promise((resolve) => {
      release = () => resolve(h.live);
    });
  const interval = vi.spyOn(globalThis, 'setInterval');
  const a = await connect(h.gateway);
  a.socket.send(JSON.stringify(hello));
  await vi.waitFor(() => expect(h.records.size).toBe(1));
  a.socket.send(JSON.stringify({ type: 'end' }));
  await once(a.socket, 'close');
  release();
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(interval.mock.calls.filter((call) => call[1] === 170)).toHaveLength(0);
  interval.mockRestore();
  await h.gateway.close();
});

it('warns the character once as quota approaches exhaustion', async () => {
  const h = harness(10);
  h.store.meter = async () => 100;
  const { socket, messages } = await connect(h.gateway);
  socket.send(JSON.stringify(hello));
  await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
  await vi.waitFor(() =>
    expect(messages.filter((m) => (m as { type: string }).type === 'quota').length).toBeGreaterThan(
      1,
    ),
  );
  expect(h.live.text.mock.calls.filter(([text]) => text.includes('Quota wrap-up'))).toHaveLength(1);
  await h.gateway.close();
});

it('fails closed on a moderation outage without recording a child safety violation', async () => {
  const h = harness();
  h.provider.moderate = async () => {
    throw new Error('upstream timeout');
  };
  const { socket, messages } = await connect(h.gateway);
  socket.send(JSON.stringify(hello));
  await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
  h.callbacks()?.transcript('child', 'A friendly boat', true);
  await vi.waitFor(() => expect(messages).toContainEqual({ type: 'bye', reason: 'error' }));
  expect(messages).not.toContainEqual({ type: 'bye', reason: 'moderation' });
  await h.gateway.close();
});
it('routes only named child destinations and keeps one Live session through screen changes', async () => {
  const h = harness(),
    { socket, messages } = await connect(h.gateway);
  socket.send(JSON.stringify(hello));
  await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
  h.callbacks()?.tool('navigate_ok', 'navigate', { destination: 'gallery' });
  await vi.waitFor(() =>
    expect(messages).toContainEqual({ type: 'navigate', destination: 'gallery' }),
  );
  socket.send(JSON.stringify({ type: 'screen', destination: 'gallery' }));
  await vi.waitFor(() =>
    expect(h.live.text).toHaveBeenCalledWith(expect.stringContaining('now on the gallery screen')),
  );
  h.callbacks()?.tool('navigate_bad', 'navigate', { destination: '/parent/billing' });
  await vi.waitFor(() =>
    expect(h.live.toolResult).toHaveBeenCalledWith(
      'navigate_bad',
      'navigate',
      expect.objectContaining({ error: expect.any(String) }),
    ),
  );
  expect(messages.filter((m) => (m as { type: string }).type === 'navigate')).toHaveLength(1);
  expect(h.provider.open).toHaveBeenCalledOnce();
  await h.gateway.close();
});

it('starts a fresh game without deleting saved work or replacing the Live session', async () => {
  const h = harness(),
    stop = vi.fn();
  h.store.watchWorld = () => stop;
  h.store.world = vi.fn(
    async () => ({ doc: minimalScene() }) as Awaited<ReturnType<SessionStore['world']>>,
  );
  const { socket, messages } = await connect(h.gateway);
  socket.send(JSON.stringify({ ...hello, worldId: 'w_previous' }));
  await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
  socket.send(JSON.stringify({ type: 'newGame' }));
  await vi.waitFor(() => expect(messages).toContainEqual({ type: 'newGame' }));
  expect(stop).toHaveBeenCalledOnce();
  expect([...h.records.values()][0]).not.toHaveProperty('worldId');
  expect(h.live.text).toHaveBeenCalledWith(expect.stringContaining('NEW game'));
  expect(h.provider.open).toHaveBeenCalledOnce();
  await h.gateway.close();
});

it('narrates only an owned saved passage and emits completion separately from its audio', async () => {
  const { storyBook, manuscript } = await import('../../../packages/protocol/test/fixtures/story');
  const h = harness(),
    book = { ...storyBook(), childId: 'c_one', manuscript: manuscript() };
  h.store.story = vi.fn(async () => book);
  const { socket, messages } = await connect(h.gateway);
  try {
    socket.send(JSON.stringify(hello));
    await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
    socket.send(
      JSON.stringify({
        type: 'storyRead',
        storyId: book.id,
        scene: 0,
        beat: 1,
        readId: 'read_one',
      }),
    );
    await vi.waitFor(() =>
      expect(h.live.text).toHaveBeenCalledWith(
        expect.stringContaining(book.manuscript.scenes[0]!.beats[1]!.text),
      ),
    );
    expect(h.store.story).toHaveBeenCalledWith(expect.anything(), book.id);
    expect(systemInstruction([...h.records.values()][0]!, '')).toContain('Katha');
    expect(messages).not.toContainEqual(
      expect.objectContaining({ type: 'storyCue', status: 'finished' }),
    );
    h.callbacks()!.turnComplete!();
    await vi.waitFor(() =>
      expect(messages).toContainEqual({
        type: 'storyCue',
        storyId: book.id,
        scene: 0,
        beat: 1,
        readId: 'read_one',
        status: 'finished',
      }),
    );
    const old = h.callbacks()!;
    socket.send(JSON.stringify({ type: 'storyPause' }));
    await vi.waitFor(() => expect(h.live.close).toHaveBeenCalled());
    const count = messages.length;
    old.turnComplete!();
    await new Promise((r) => setTimeout(r, 20));
    expect(messages.slice(count)).not.toContainEqual(
      expect.objectContaining({ type: 'storyCue', status: 'finished' }),
    );
    socket.send(JSON.stringify({ type: 'hangUp' }));
    await vi.waitFor(() => expect([...h.records.values()][0]!.story).toBeUndefined());
  } finally {
    socket.terminate();
    await h.gateway.close();
  }
});
it('limits the storyteller to story topic, navigation and ending tools', () => {
  const names = toolDeclarationsFor({ story: {} }).map((t) => t.name);
  expect(names.sort()).toEqual(['end_session', 'navigate', 'story_topic']);
  expect(toolDeclarationsFor({}).map((t) => t.name)).not.toContain('story_topic');
});

it('starts narration with a fresh model after saved-book question mode, preserving normal passage continuation', async () => {
  const { storyBook, manuscript } = await import('../../../packages/protocol/test/fixtures/story');
  const h = harness(),
    book = { ...storyBook(), childId: 'c_one', manuscript: manuscript() };
  h.store.story = vi.fn(async () => book);
  const { socket, messages } = await connect(h.gateway);
  try {
    socket.send(JSON.stringify(hello));
    await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
    socket.send(JSON.stringify({ type: 'storySetup', storyId: book.id }));
    await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(2));
    const questionCallbacks = h.callbacks()!;
    socket.send(
      JSON.stringify({
        type: 'storyRead',
        storyId: book.id,
        scene: 0,
        beat: 0,
        readId: 'read_after_question',
      }),
    );
    await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(3));
    // A stale interruption from the question model cannot cancel the new passage.
    questionCallbacks.interrupted();
    h.callbacks()!.turnComplete!();
    await vi.waitFor(() =>
      expect(messages).toContainEqual(
        expect.objectContaining({
          type: 'storyCue',
          readId: 'read_after_question',
          status: 'finished',
        }),
      ),
    );
    socket.send(
      JSON.stringify({
        type: 'storyRead',
        storyId: book.id,
        scene: 0,
        beat: 1,
        readId: 'read_continue',
      }),
    );
    await vi.waitFor(() =>
      expect(h.live.text).toHaveBeenCalledWith(
        expect.stringContaining(book.manuscript.scenes[0]!.beats[1]!.text),
      ),
    );
    expect(h.provider.open).toHaveBeenCalledTimes(3);
  } finally {
    socket.close();
    await h.gateway.close();
  }
});

it('keeps the typed child words and exclusions when a creation/edit tool summarizes them', async () => {
  const h = harness();
  h.store.enqueue = vi.fn(async () => {});
  const { socket, messages } = await connect(h.gateway);
  const wish = 'Fenn runs wherever I tap. No obstacles, scores, quizzes or endings.';
  try {
    socket.send(JSON.stringify(hello));
    await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
    socket.send(JSON.stringify({ type: 'text', text: wish }));
    await vi.waitFor(() => expect(h.live.text).toHaveBeenCalledWith(expect.stringContaining(wish)));
    h.callbacks()?.tool('t_original', 'build_world', {
      description: 'A running forest fox',
      concepts: ['speed'],
    });
    await vi.waitFor(() =>
      expect(h.store.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'build',
          description: 'A running forest fox',
          childRequest: wish,
        }),
      ),
    );
    h.store.world = vi.fn(async () => ({ doc: minimalScene() }) as WorldDoc);
    const edit = 'Make Fenn blue. Keep his scarf and every existing action.';
    socket.send(JSON.stringify({ type: 'text', text: edit }));
    await vi.waitFor(() => expect(h.live.text).toHaveBeenCalledWith(expect.stringContaining(edit)));
    h.callbacks()?.tool('t_exact_edit', 'modify_world', { instruction: 'Make the fox blue' });
    await vi.waitFor(() =>
      expect(h.store.enqueue).toHaveBeenLastCalledWith(
        expect.objectContaining({
          kind: 'patch',
          instruction: 'Make the fox blue',
          childRequest: edit,
        }),
      ),
    );
  } finally {
    socket.terminate();
    await h.gateway.close();
  }
});

it('waits for voice moderation before binding the verbatim request to its build', async () => {
  const h = harness();
  h.store.enqueue = vi.fn(async () => {});
  let approved!: (value: 'safe') => void;
  h.provider.moderate = vi.fn(
    () =>
      new Promise<'safe'>((resolve) => {
        approved = resolve;
      }),
  );
  const { socket, messages } = await connect(h.gateway);
  try {
    socket.send(JSON.stringify(hello));
    await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
    const wish = 'A turtle who swims where I tap, with no timer or quiz.';
    h.callbacks()?.transcript('child', wish, true);
    h.callbacks()?.tool('t_spoken', 'build_world', {
      description: 'An underwater turtle',
      concepts: ['speed'],
    });
    await vi.waitFor(() => expect(h.provider.moderate).toHaveBeenCalled());
    expect(h.store.enqueue).not.toHaveBeenCalled();
    approved('safe');
    await vi.waitFor(() =>
      expect(h.store.enqueue).toHaveBeenCalledWith(expect.objectContaining({ childRequest: wish })),
    );
  } finally {
    approved?.('safe');
    socket.terminate();
    await h.gateway.close();
  }
});

it('does not execute a queued creation from a rejected voice turn', async () => {
  const h = harness();
  h.store.enqueue = vi.fn(async () => {});
  h.provider.moderate = async () => 'block';
  const { socket, messages } = await connect(h.gateway);
  try {
    socket.send(JSON.stringify(hello));
    await vi.waitFor(() => expect(messages[0]).toMatchObject({ type: 'ready' }));
    h.callbacks()?.transcript('child', 'A rejected request', true);
    h.callbacks()?.tool('t_rejected', 'build_world', {
      description: 'An unrelated safe summary',
      concepts: [],
    });
    await vi.waitFor(() =>
      expect(h.live.toolResult).toHaveBeenCalledWith(
        't_rejected',
        'build_world',
        expect.objectContaining({ error: expect.stringContaining('friendly idea') }),
      ),
    );
    expect(h.store.enqueue).not.toHaveBeenCalled();
  } finally {
    socket.terminate();
    await h.gateway.close();
  }
});
