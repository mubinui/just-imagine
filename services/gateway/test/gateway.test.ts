import { it, expect, vi } from 'vitest';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { startGateway } from '../src/gateway';
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
  expect(h.live.text).toHaveBeenLastCalledWith(expect.stringContaining('World building failed'));
  jobUpdate('running');
  expect(h.live.text).toHaveBeenLastCalledWith(
    expect.not.stringContaining('World building failed'),
  );
  jobUpdate('failed');
  jobUpdate('complete');
  expect(h.live.text).toHaveBeenLastCalledWith(
    expect.not.stringContaining('World building failed'),
  );
  h.live.text.mockClear();
  a.socket.send(JSON.stringify({ type: 'switchCharacter', characterId: 'chandni' }));
  await vi.waitFor(() => expect(h.provider.open).toHaveBeenCalledTimes(2));
  expect(h.live.text).toHaveBeenCalledWith(expect.stringContaining('launchSpeed'));
  expect(h.live.text).not.toHaveBeenCalledWith(expect.stringContaining('World building failed'));
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
  h.store.world = vi.fn(async () => ({}) as Awaited<ReturnType<SessionStore['world']>>);
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
