import { it, expect, vi, afterEach } from 'vitest';
import { VoiceClient } from '../src/voice-client';
import type { BrowserAudio } from '../src/browser-audio';
function harness(capture = false) {
  const sockets: Array<{
    readyState: number;
    bufferedAmount: number;
    sent: string[];
    onopen?: () => void;
    onclose?: () => void;
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
    onFrame: () => {},
    onPlaybackError: () => {},
  };
  const client = new VoiceClient({
    url: 'ws://localhost',
    capture,
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
