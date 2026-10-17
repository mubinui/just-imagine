import { afterEach, expect, it, vi } from 'vitest';
import type * as GenAI from '@google/genai';
import type { LiveCallbacks } from '../src/contracts';
import type { TutorRecord } from '../src/tutor/contracts';
const mocks = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('@google/genai', async (original) => ({
  ...(await original<typeof GenAI>()),
  GoogleGenAI: class {
    live = { connect: mocks.connect };
  },
}));
import { VertexTutorProvider } from '../src/tutor/provider';
const record = {
  characterId: 'pori',
  language: 'bn',
  stepIndex: 0,
  lesson: { subject: 'physics', grade: 9, title: { en: 'Force', bn: 'বল' }, steps: [] },
} as unknown as TutorRecord;
const callbacks = (): LiveCallbacks => ({
  audio: vi.fn(),
  transcript: vi.fn(),
  tool: vi.fn(),
  interrupted: vi.fn(),
  resume: vi.fn(),
  closed: vi.fn(),
});
const provider = () =>
  new VertexTutorProvider({
    project: 'demo-test',
    liveModel: 'test-live',
    fastModel: 'test-fast',
    apiKey: 'test-key',
  });
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
it('bounds a hung transport and closes a connection that resolves after the timeout', async () => {
  vi.useFakeTimers();
  let finish!: (value: unknown) => void;
  const close = vi.fn();
  mocks.connect.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const opening = provider().open(record, callbacks());
  const failed = expect(opening).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(15000);
  await failed;
  finish({ close });
  await Promise.resolve();
  await Promise.resolve();
  expect(close).toHaveBeenCalledOnce();
});
it('flushes PCM tails and discards late transcripts after intentional close', async () => {
  let events!: { onmessage: (value: unknown) => void; onclose: () => void };
  const close = vi.fn(() => events.onclose());
  mocks.connect.mockImplementation(async ({ callbacks: cb }) => {
    events = cb;
    queueMicrotask(() => cb.onmessage({ setupComplete: {} }));
    return {
      close,
      sendRealtimeInput: vi.fn(),
      sendClientContent: vi.fn(),
      sendToolResponse: vi.fn(),
    };
  });
  const cb = callbacks(),
    live = await provider().open(record, cb);
  events.onmessage({
    serverContent: {
      modelTurn: {
        parts: [
          { inlineData: { mimeType: 'audio/pcm', data: Buffer.alloc(1100).toString('base64') } },
        ],
      },
      turnComplete: true,
    },
  });
  expect(cb.audio).toHaveBeenCalledTimes(2);
  expect(vi.mocked(cb.audio).mock.calls[1]![0].length).toBe(960);
  live.close();
  events.onmessage({
    serverContent: { outputTranscription: { text: 'Late data', finished: true } },
  });
  expect(cb.transcript).not.toHaveBeenCalled();
  expect(cb.closed).not.toHaveBeenCalled();
});
