import { afterEach, expect, it, vi } from 'vitest';
import type { LiveCallbacks, SessionRecord } from '../src/contracts';
import type * as GenAI from '@google/genai';
const mocks = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('@google/genai', async (original) => ({
  ...(await original<typeof GenAI>()),
  GoogleGenAI: class {
    live = { connect: mocks.connect };
  },
}));
import { VertexLiveProvider } from '../src/live';
const record = {
  id: 's_live',
  characterId: 'bhombol',
  identity: {
    child: { ageBand: '8-10', firstName: 'Test', tier: 'playground', labsUnlocked: false },
  },
} as SessionRecord;
const callbacks = (): LiveCallbacks => ({
  audio: vi.fn(),
  transcript: vi.fn(),
  tool: vi.fn(),
  interrupted: vi.fn(),
  resume: vi.fn(),
  closed: vi.fn(),
});
const provider = () =>
  new VertexLiveProvider({
    project: 'demo-local',
    apiKey: 'test-key',
    liveModel: 'gemini-3.8-live',
    fastModel: 'gemini-3.8-flash',
  });
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
it('waits for model setup confirmation and rejects a transport-only connection', async () => {
  const close = vi.fn();
  mocks.connect.mockImplementation(async ({ callbacks: cb }) => {
    queueMicrotask(() => cb.onclose({ code: 1007 }));
    return { close };
  });
  const cb = callbacks();
  await expect(provider().open(record, '', undefined, cb)).rejects.toThrow('before confirmation');
  expect(close).toHaveBeenCalledOnce();
  expect(cb.closed).not.toHaveBeenCalled();
});
it('accepts setup, delivers padded PCM tails, and closes intentionally without reconnecting', async () => {
  let events: { onmessage: (message: unknown) => void; onclose: () => void };
  const close = vi.fn(() => events.onclose());
  mocks.connect.mockImplementation(async ({ callbacks: cb, config }) => {
    events = cb;
    expect(config).not.toHaveProperty('proactivity');
    expect(config).not.toHaveProperty('safetySettings');
    expect(config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Sulafat');
    expect(config.systemInstruction).toContain('calm conversational pace');
    queueMicrotask(() => cb.onmessage({ setupComplete: {} }));
    return {
      close,
      sendClientContent: vi.fn(),
      sendRealtimeInput: vi.fn(),
      sendToolResponse: vi.fn(),
    };
  });
  const cb = callbacks();
  const live = await provider().open(record, '', undefined, cb);
  events!.onmessage({
    serverContent: {
      modelTurn: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/pcm;rate=24000',
              data: Buffer.alloc(1000).toString('base64'),
            },
          },
        ],
      },
      turnComplete: true,
    },
  });
  expect(cb.audio).toHaveBeenCalledTimes(2);
  expect(cb.audio).toHaveBeenLastCalledWith(expect.objectContaining({ length: 960 }));
  live.close();
  expect(close).toHaveBeenCalledOnce();
  expect(cb.closed).not.toHaveBeenCalled();
});
