import { it, expect, vi, afterEach } from 'vitest';
import { VoiceClient } from '../src/voice-client';
import type { BrowserAudio } from '../src/browser-audio';
function harness() {
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
  };
  const client = new VoiceClient({
    url: 'ws://localhost',
    capture: false,
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
