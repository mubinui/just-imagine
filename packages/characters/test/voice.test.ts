import { it, expect, vi, afterEach } from 'vitest';
import { VoiceClient } from '../src/voice-client';
import type { BrowserAudio } from '../src/browser-audio';
function harness(capture = false, getToken?: () => Promise<string>) {
  const sockets: Array<{
    readyState: number;
    bufferedAmount: number;
    sent: string[];
    onopen?: () => void;
    onclose?: () => void;
    onerror?: () => void;
    onmessage?: (e: { data: unknown }) => void;
    send(data: string): void;
    close(): void;
  }> = [];
  const audio = {
    unlocked: true,
    unlock: vi.fn(),
    startCapture: vi.fn(),
    stopCapture: vi.fn(),
    flush: vi.fn(),
    play: vi.fn(),
    dispose: vi.fn(),
    onFrame: (_frame: ArrayBuffer) => {},
    onPlaybackError: () => {},
  };
  const client = new VoiceClient({
    url: 'ws://localhost',
    capture,
    getToken,
    audio: audio as unknown as BrowserAudio,
    socket: () => {
      const socket = {
        readyState: 1,
        bufferedAmount: 0,
        sent: [] as string[],
        send(data: string) {
          this.sent.push(data);
        },
        close: vi.fn(),
      };
      sockets.push(socket);
      return socket as unknown as WebSocket;
    },
  });
  return { client, audio, sockets };
}
const hello = {
  type: 'hello' as const,
  idToken: 'token',
  childId: 'c_one',
  characterId: 'bhombol' as const,
};
afterEach(() => vi.useRealTimers());
it('ignores a prior socket error after ending and redialling a new call', async () => {
  const { client, audio, sockets } = harness(true);
  await client.connect(hello);
  const old = sockets[0]!;
  client.end();
  await client.connect(hello);
  const current = sockets[1]!;
  current.onmessage?.({
    data: JSON.stringify({ type: 'ready', sessionId: 's_new', characterId: 'bhombol' }),
  });
  old.onerror?.();
  expect(client.status).toBe('connected');
  current.onmessage?.({ data: new ArrayBuffer(960) });
  expect(audio.play).toHaveBeenCalledOnce();
  const frame = new ArrayBuffer(640);
  audio.onFrame(frame);
  expect(current.sent).toContain(frame);
  current.onerror?.();
  expect(client.status).toBe('reconnecting');
  client.end();
});
it('ignores an old token refresh rejection after ending and redialling', async () => {
  vi.useFakeTimers();
  let rejectOld!: (error: Error) => void;
  const token = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<string>((_resolve, reject) => {
          rejectOld = reject;
        }),
    )
    .mockResolvedValue('fresh-token');
  const { client, sockets } = harness(false, token);
  const old = client.connect(hello);
  await Promise.resolve();
  client.end();
  await client.connect(hello);
  sockets[0]?.onmessage?.({
    data: JSON.stringify({ type: 'ready', sessionId: 's_fresh', characterId: 'bhombol' }),
  });
  rejectOld(new Error('Previous refresh cancelled'));
  await old;
  await vi.advanceTimersByTimeAsync(20000);
  expect(client.status).toBe('connected');
  expect(sockets).toHaveLength(1);
  client.end();
});
it('ends an overloaded playback stream explicitly and allows a fresh retry', async () => {
  const { client, audio, sockets } = harness(true);
  await client.connect(hello);
  audio.onPlaybackError();
  expect(client.status).toBe('error');
  expect(audio.stopCapture).toHaveBeenCalledOnce();
  expect(audio.flush).toHaveBeenCalledOnce();
  expect(sockets[0]?.close).toHaveBeenCalledOnce();
  expect(client.session).toBeUndefined();
  await client.connect(hello);
  expect(sockets).toHaveLength(2);
  client.end();
});
it('refuses connect before profile audio unlock', async () => {
  const { client, audio, sockets } = harness();
  audio.unlocked = false;
  await expect(client.connect(hello)).rejects.toThrow('unlocked');
  expect(sockets).toHaveLength(0);
});
it('flushes on interruption and resumes session and world IDs on socket drop', async () => {
  vi.useFakeTimers();
  const { client, audio, sockets } = harness();
  await client.connect(hello);
  const first = sockets[0]!;
  first.onopen?.();
  first.onmessage?.({
    data: JSON.stringify({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' }),
  });
  first.onmessage?.({
    data: JSON.stringify({
      type: 'worldJob',
      jobId: 'j_one',
      worldId: 'w_one',
      status: 'building',
    }),
  });
  first.onmessage?.({ data: JSON.stringify({ type: 'interrupted' }) });
  expect(audio.flush).toHaveBeenCalledOnce();
  first.onclose?.();
  await vi.advanceTimersByTimeAsync(500);
  sockets[1]?.onopen?.();
  expect(JSON.parse(sockets[1]!.sent[0]!)).toMatchObject({ sessionId: 's_one', worldId: 'w_one' });
  client.end();
  await vi.advanceTimersByTimeAsync(20000);
  expect(sockets).toHaveLength(2);
});
it('does not reconnect after terminal bye and stops microphone', async () => {
  vi.useFakeTimers();
  const { client, audio, sockets } = harness();
  await client.connect(hello);
  sockets[0]?.onmessage?.({ data: JSON.stringify({ type: 'bye', reason: 'quota' }) });
  sockets[0]?.onclose?.();
  await vi.advanceTimersByTimeAsync(30000);
  expect(sockets).toHaveLength(1);
  expect(audio.stopCapture).toHaveBeenCalledOnce();
});
it('exposes a credential-free session snapshot and supports multiple route status subscribers', async () => {
  const { client, sockets } = harness(),
    first = vi.fn(),
    second = vi.fn();
  const unsubscribe = client.subscribeStatus(first);
  client.subscribeStatus(second);
  await client.connect(hello);
  sockets[0]!.onmessage?.({
    data: JSON.stringify({
      type: 'ready',
      sessionId: 's_one',
      characterId: 'bhombol',
      worldId: 'w_one',
    }),
  });
  expect(client.session).toEqual({
    childId: 'c_one',
    characterId: 'bhombol',
    sessionId: 's_one',
    worldId: 'w_one',
  });
  expect(client.session).not.toHaveProperty('idToken');
  expect(first).toHaveBeenCalledWith('connected');
  unsubscribe();
  client.end();
  expect(second).toHaveBeenCalledWith('closed');
  expect(first).not.toHaveBeenCalledWith('closed');
  expect(client.session).toBeUndefined();
});

it('does not reopen the previous world after starting a fresh game and reconnecting', async () => {
  vi.useFakeTimers();
  const { client, sockets } = harness();
  await client.connect({ ...hello, worldId: 'w_old' });
  sockets[0]?.onmessage?.({ data: JSON.stringify({ type: 'newGame' }) });
  expect(client.session?.worldId).toBeUndefined();
  sockets[0]?.onclose?.();
  await vi.advanceTimersByTimeAsync(500);
  sockets[1]?.onopen?.();
  expect(JSON.parse(sockets[1]!.sent[0]!)).not.toHaveProperty('worldId');
  client.end();
});

it('allows retry after microphone permission was denied during connection', async () => {
  const { client, audio, sockets } = harness(true);
  audio.startCapture.mockRejectedValueOnce(new Error('Microphone permission denied'));
  await expect(client.connect(hello)).rejects.toThrow('permission denied');
  expect(client.session).toBeUndefined();
  expect(client.status).toBe('error');
  await client.connect(hello);
  expect(sockets).toHaveLength(1);
  client.end();
});

it.each([
  'QUOTA_EXHAUSTED',
  'SESSION_ACTIVE_ELSEWHERE',
  'FORBIDDEN',
  'UNAUTHENTICATED',
  'KILL_SWITCH',
])('stops capture and automatic reconnect after terminal %s', async (code) => {
  vi.useFakeTimers();
  const { client, audio, sockets } = harness(true);
  const received = vi.fn();
  client.subscribe(received);
  await client.connect(hello);
  const error = { type: 'error', code, message: 'Please retry when available.' };
  sockets[0]?.onmessage?.({ data: JSON.stringify(error) });
  sockets[0]?.onclose?.();
  await vi.advanceTimersByTimeAsync(30000);
  expect(client.status).toBe('error');
  expect(client.session).toBeUndefined();
  expect(audio.stopCapture).toHaveBeenCalledOnce();
  expect(sockets).toHaveLength(1);
  expect(received).toHaveBeenCalledWith(error);
  await client.connect(hello);
  expect(sockets).toHaveLength(2);
  client.end();
});

it('keeps a guest as playback owner across ready messages and returns ownership to the friend', async () => {
  const { client, sockets } = harness();
  await client.connect(hello);
  const send = (data: unknown) => sockets[0]!.onmessage?.({ data: JSON.stringify(data) });
  expect(client.speakerId).toBe('bhombol');
  send({ type: 'persona', packId: 'space', characterId: 'saturn', name: 'Saturn' });
  send({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' });
  expect(client.speakerId).toBe('saturn');
  send({ type: 'worldCharacter', entityId: null, name: 'Pip' });
  expect(client.speakerId).toBe('bhombol');
  send({ type: 'worldCharacter', entityId: 'talking_fox', name: 'Fox' });
  expect(client.speakerId).toBe('talking_fox');
  client.end();
  expect(client.speakerId).toBeUndefined();
});

it('keeps only the latest character selected while the first socket is connecting', async () => {
  const { client, sockets } = harness();
  await client.connect(hello);
  const socket = sockets[0]!;
  client.send({ type: 'switchCharacter', characterId: 'mishti' });
  client.send({ type: 'switchCharacter', characterId: 'chandni' });
  expect(socket.sent).toHaveLength(0);
  socket.onmessage?.({
    data: JSON.stringify({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' }),
  });
  expect(socket.sent.map((v) => JSON.parse(v))).toEqual([
    { type: 'switchCharacter', characterId: 'chandni' },
  ]);
  expect(client.selectionPending).toBe(true);
  socket.onmessage?.({
    data: JSON.stringify({ type: 'ready', sessionId: 's_one', characterId: 'chandni' }),
  });
  expect(client.session?.characterId).toBe('chandni');
  expect(client.selectionPending).toBe(false);
  client.end();
});

it('orders latest gallery world, latest character and a queued wish after reconnect acknowledgments', async () => {
  vi.useFakeTimers();
  const { client, audio, sockets } = harness();
  await client.connect({ ...hello, worldId: 'w_old' });
  sockets[0]!.onmessage?.({
    data: JSON.stringify({
      type: 'ready',
      sessionId: 's_one',
      characterId: 'bhombol',
      worldId: 'w_old',
    }),
  });
  sockets[0]!.onclose?.();
  client.send({ type: 'openWorld', worldId: 'w_discarded' });
  client.send({ type: 'openWorld', worldId: 'w_latest' });
  client.send({ type: 'switchCharacter', characterId: 'mishti' });
  client.send({ type: 'switchCharacter', characterId: 'chandni' });
  client.send({ type: 'text', text: 'Change this game.' });
  await vi.advanceTimersByTimeAsync(500);
  const socket = sockets[1]!;
  const receive = (message: unknown) => socket.onmessage?.({ data: JSON.stringify(message) });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol', worldId: 'w_old' });
  expect(socket.sent.map((v) => JSON.parse(v))).toEqual([
    { type: 'openWorld', worldId: 'w_latest' },
  ]);
  audio.onFrame(new ArrayBuffer(640));
  expect(socket.sent).toHaveLength(1);
  socket.onmessage?.({ data: new ArrayBuffer(960) });
  expect(audio.play).not.toHaveBeenCalled();
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol', worldId: 'w_latest' });
  expect(JSON.parse(socket.sent[1]!)).toEqual({ type: 'switchCharacter', characterId: 'chandni' });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'chandni', worldId: 'w_latest' });
  expect(JSON.parse(socket.sent[2]!)).toEqual({ type: 'text', text: 'Change this game.' });
  expect(client.session).toMatchObject({ characterId: 'chandni', worldId: 'w_latest' });
  socket.onmessage?.({ data: new ArrayBuffer(960) });
  expect(audio.play).toHaveBeenCalledOnce();
  client.end();
});

it('coalesces rapid picks while a prior switch is opening and preserves the latest pending target', async () => {
  const { client, sockets } = harness();
  await client.connect(hello);
  const socket = sockets[0]!;
  const receive = (message: unknown) => socket.onmessage?.({ data: JSON.stringify(message) });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' });
  client.send({ type: 'switchCharacter', characterId: 'mishti' });
  client.send({ type: 'switchCharacter', characterId: 'pori' });
  client.send({ type: 'switchCharacter', characterId: 'chandni' });
  receive({ type: 'characterState', characterId: 'mishti', emotion: 'thinking', speaking: false });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'mishti' });
  expect(socket.sent.map((v) => JSON.parse(v))).toEqual([
    { type: 'switchCharacter', characterId: 'mishti' },
    { type: 'switchCharacter', characterId: 'chandni' },
  ]);
  expect(client.selectionPending).toBe(true);
  receive({ type: 'ready', sessionId: 's_one', characterId: 'chandni' });
  expect(client.selectionPending).toBe(false);
  client.end();
});

it('clears an old game before delivering a queued new-game wish', async () => {
  const { client, sockets } = harness();
  await client.connect({ ...hello, worldId: 'w_old' });
  const socket = sockets[0]!;
  client.send({ type: 'newGame' });
  client.send({ type: 'text', text: 'My new idea' });
  socket.onmessage?.({
    data: JSON.stringify({
      type: 'ready',
      sessionId: 's_one',
      characterId: 'bhombol',
      worldId: 'w_old',
    }),
  });
  expect(socket.sent.map((v) => JSON.parse(v))).toEqual([{ type: 'newGame' }]);
  socket.onmessage?.({ data: JSON.stringify({ type: 'newGame' }) });
  expect(socket.sent.map((v) => JSON.parse(v))).toEqual([
    { type: 'newGame' },
    { type: 'text', text: 'My new idea' },
  ]);
  expect(client.session?.worldId).toBeUndefined();
  client.end();
});

it('escapes a rejected world selection without sending its queued wish into the old game', async () => {
  const { client, sockets } = harness();
  await client.connect({ ...hello, worldId: 'w_old' });
  const socket = sockets[0]!;
  socket.onmessage?.({
    data: JSON.stringify({
      type: 'ready',
      sessionId: 's_one',
      characterId: 'bhombol',
      worldId: 'w_old',
    }),
  });
  client.send({ type: 'openWorld', worldId: 'w_unavailable' });
  client.send({ type: 'text', text: 'Change the unavailable game' });
  socket.onmessage?.({
    data: JSON.stringify({ type: 'error', code: 'INTERNAL', message: 'Unavailable' }),
  });
  expect(client.selectionPending).toBe(false);
  expect(client.status).toBe('connected');
  expect(client.session?.worldId).toBe('w_old');
  expect(socket.sent.map((v) => JSON.parse(v))).toEqual([
    { type: 'openWorld', worldId: 'w_unavailable' },
  ]);
  client.end();
});

it('reconciles a guest owner after a requested companion switch without reopening the old voice', async () => {
  const { client, sockets } = harness();
  await client.connect(hello);
  const receive = (message: unknown) => sockets[0]!.onmessage?.({ data: JSON.stringify(message) });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' });
  receive({ type: 'persona', packId: 'space', characterId: 'saturn', name: 'Saturn' });
  client.send({ type: 'switchCharacter', characterId: 'mishti' });
  receive({ type: 'interrupted' });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'mishti' });
  expect(client.speakerId).toBe('mishti');
  client.end();
});

it('silences superseded Sun audio and microphone frames until the latest Tooth persona is ready', async () => {
  const { client, audio, sockets } = harness(true);
  await client.connect(hello);
  const socket = sockets[0]!;
  const receive = (message: unknown) => socket.onmessage?.({ data: JSON.stringify(message) });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' });
  socket.sent = [];
  client.send({ type: 'summonPersona', packId: 'space', characterId: 'sun' });
  client.send({ type: 'summonPersona', packId: 'body', characterId: 'tooth' });
  client.send({ type: 'learningPlay', packId: 'body', characterId: 'tooth', kind: 'activity' });
  audio.onFrame(new ArrayBuffer(640));
  socket.onmessage?.({ data: new ArrayBuffer(960) });
  expect(audio.play).not.toHaveBeenCalled();
  expect(socket.sent.map((value) => JSON.parse(value))).toEqual([
    { type: 'summonPersona', packId: 'space', characterId: 'sun' },
  ]);
  receive({ type: 'persona', packId: 'space', characterId: 'sun', name: 'Sun' });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' });
  expect(client.selectionPending).toBe(true);
  expect(client.status).toBe('reconnecting');
  expect(socket.sent.map((value) => JSON.parse(value))).toEqual([
    { type: 'summonPersona', packId: 'space', characterId: 'sun' },
    { type: 'summonPersona', packId: 'body', characterId: 'tooth' },
  ]);
  socket.onmessage?.({ data: new ArrayBuffer(960) });
  audio.onFrame(new ArrayBuffer(640));
  expect(audio.play).not.toHaveBeenCalled();
  receive({ type: 'persona', packId: 'body', characterId: 'tooth', name: 'Tooth' });
  expect(client.status).toBe('reconnecting');
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' });
  expect(client.speakerId).toBe('tooth');
  expect(client.selectionPending).toBe(false);
  expect(socket.sent.map((value) => JSON.parse(value))).toHaveLength(3);
  socket.onmessage?.({ data: new ArrayBuffer(960) });
  expect(audio.play).toHaveBeenCalledOnce();
  const frame = new ArrayBuffer(640);
  audio.onFrame(frame);
  expect(socket.sent).toContain(frame);
  client.end();
});

it('restores an acknowledged guest across reconnect without summoning it twice', async () => {
  vi.useFakeTimers();
  const { client, sockets } = harness();
  await client.connect(hello);
  const first = sockets[0]!;
  first.onmessage?.({
    data: JSON.stringify({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' }),
  });
  client.send({ type: 'summonPersona', packId: 'body', characterId: 'tooth' });
  first.onmessage?.({
    data: JSON.stringify({ type: 'persona', packId: 'body', characterId: 'tooth', name: 'Tooth' }),
  });
  first.onclose?.();
  await vi.advanceTimersByTimeAsync(500);
  const second = sockets[1]!;
  second.onmessage?.({
    data: JSON.stringify({ type: 'persona', packId: 'body', characterId: 'tooth', name: 'Tooth' }),
  });
  second.onmessage?.({
    data: JSON.stringify({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' }),
  });
  expect(client.selectionPending).toBe(false);
  expect(client.speakerId).toBe('tooth');
  expect(second.sent).toEqual([]);
  client.end();
});

it('can reject a guest selection or return to the companion without re-summoning a queued guest', async () => {
  const { client, sockets } = harness();
  await client.connect(hello);
  const socket = sockets[0]!,
    receive = (message: unknown) => socket.onmessage?.({ data: JSON.stringify(message) });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' });
  socket.sent = [];
  client.send({ type: 'summonPersona', packId: 'space', characterId: 'sun' });
  receive({ type: 'error', code: 'INTERNAL', message: 'Unavailable' });
  expect(client.selectionPending).toBe(false);
  expect(client.status).toBe('connected');
  client.send({ type: 'summonPersona', packId: 'space', characterId: 'sun' });
  client.send({ type: 'summonPersona', packId: 'body', characterId: 'tooth' });
  client.send({ type: 'hangUp' });
  receive({ type: 'persona', packId: 'space', characterId: 'sun', name: 'Sun' });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' });
  receive({ type: 'worldCharacter', entityId: null, name: 'Bhombol' });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' });
  expect(
    socket.sent.map((value) => JSON.parse(value)).filter((value) => value.type === 'summonPersona'),
  ).toEqual([
    { type: 'summonPersona', packId: 'space', characterId: 'sun' },
    { type: 'summonPersona', packId: 'space', characterId: 'sun' },
  ]);
  expect(client.speakerId).toBe('bhombol');
  expect(client.selectionPending).toBe(false);
  client.end();
});

it('queues the latest connecting guest after gallery world and companion acknowledgements', async () => {
  const { client, sockets } = harness();
  await client.connect(hello);
  const socket = sockets[0]!,
    receive = (message: unknown) => socket.onmessage?.({ data: JSON.stringify(message) });
  client.send({ type: 'summonPersona', packId: 'space', characterId: 'sun' });
  client.send({ type: 'openWorld', worldId: 'w_gallery' });
  client.send({ type: 'switchCharacter', characterId: 'chandni' });
  client.send({ type: 'summonPersona', packId: 'space', characterId: 'sun' });
  client.send({ type: 'summonPersona', packId: 'body', characterId: 'tooth' });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol' });
  expect(socket.sent.map((value) => JSON.parse(value))).toEqual([
    { type: 'openWorld', worldId: 'w_gallery' },
  ]);
  receive({ type: 'ready', sessionId: 's_one', characterId: 'bhombol', worldId: 'w_gallery' });
  expect(JSON.parse(socket.sent[1]!)).toEqual({ type: 'switchCharacter', characterId: 'chandni' });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'chandni', worldId: 'w_gallery' });
  expect(JSON.parse(socket.sent[2]!)).toEqual({
    type: 'summonPersona',
    packId: 'body',
    characterId: 'tooth',
  });
  expect(socket.sent).toHaveLength(3);
  receive({ type: 'persona', packId: 'body', characterId: 'tooth', name: 'Tooth' });
  receive({ type: 'ready', sessionId: 's_one', characterId: 'chandni', worldId: 'w_gallery' });
  expect(client.selectionPending).toBe(false);
  expect(client.speakerId).toBe('tooth');
  client.end();
});
