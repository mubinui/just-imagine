import { afterEach, expect, it, vi } from 'vitest';
import type { LiveCallbacks, SessionRecord } from '../src/contracts';
import type * as GenAI from '@google/genai';
import { CHARACTERS, type CharacterId } from '@just-imagine/protocol';
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
    expect(config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe('Puck');
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

it.each(Object.keys(CHARACTERS) as CharacterId[])(
  'opens %s using its authored voice identity',
  async (characterId) => {
    mocks.connect.mockImplementation(async ({ callbacks: cb, config }) => {
      expect(config.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName).toBe(
        CHARACTERS[characterId].voice,
      );
      queueMicrotask(() => cb.onmessage({ setupComplete: {} }));
      return {
        close: vi.fn(),
        sendClientContent: vi.fn(),
        sendRealtimeInput: vi.fn(),
        sendToolResponse: vi.fn(),
      };
    });
    const live = await provider().open({ ...record, characterId }, '', undefined, callbacks());
    live.close();
  },
);

it('ignores late model callbacks and outbound microphone frames after intentional close', async () => {
  let events!: { onmessage: (message: unknown) => void };
  const realtime = vi.fn(),
    content = vi.fn(),
    tool = vi.fn();
  mocks.connect.mockImplementation(async ({ callbacks: cb }) => {
    events = cb;
    queueMicrotask(() => cb.onmessage({ setupComplete: {} }));
    return {
      close: vi.fn(),
      sendClientContent: content,
      sendRealtimeInput: realtime,
      sendToolResponse: tool,
    };
  });
  const cb = callbacks();
  const live = await provider().open(record, '', undefined, cb);
  live.close();
  events.onmessage({
    serverContent: {
      modelTurn: {
        parts: [
          {
            inlineData: {
              mimeType: 'audio/pcm;rate=24000',
              data: Buffer.alloc(960).toString('base64'),
            },
          },
        ],
      },
      outputTranscription: { text: 'Synthetic late output', finished: true },
      turnComplete: true,
    },
    toolCall: {
      functionCalls: [{ id: 'late', name: 'switch_character', args: { characterId: 'mishti' } }],
    },
  });
  live.audio(Buffer.alloc(640));
  live.text('Synthetic late input');
  live.toolResult('late', 'switch_character', {});
  expect(cb.audio).not.toHaveBeenCalled();
  expect(cb.transcript).not.toHaveBeenCalled();
  expect(cb.tool).not.toHaveBeenCalled();
  expect(realtime).not.toHaveBeenCalled();
  expect(content).not.toHaveBeenCalled();
  expect(tool).not.toHaveBeenCalled();
});

it('appends the selected parent language to every native-audio text turn', async () => {
  const send = vi.fn();
  mocks.connect.mockImplementation(async ({ callbacks: cb }) => {
    queueMicrotask(() => cb.onmessage({ setupComplete: {} }));
    return {
      close: vi.fn(),
      sendClientContent: send,
      sendRealtimeInput: vi.fn(),
      sendToolResponse: vi.fn(),
    };
  });
  const live = await provider().open(record, '', undefined, callbacks());
  live.text('Why brush teeth? Answer in French.');
  const text = send.mock.calls[0]![0].turns[0].parts[0].text as string;
  expect(text).toContain('Why brush teeth?');
  expect(text).toContain('ENGLISH ONLY');
  expect(text.indexOf('ENGLISH ONLY')).toBeGreaterThan(text.indexOf('French'));
  live.close();
});

it('flushes only the child transcript before a tool call, before turnComplete arrives', async () => {
  let events!: { onmessage: (message: unknown) => void };
  mocks.connect.mockImplementation(async ({ callbacks: cb }) => {
    events = cb;
    queueMicrotask(() => cb.onmessage({ setupComplete: {} }));
    return {
      close: vi.fn(),
      sendClientContent: vi.fn(),
      sendRealtimeInput: vi.fn(),
      sendToolResponse: vi.fn(),
    };
  });
  const cb = callbacks(),
    order: string[] = [];
  cb.transcript = vi.fn((role, _text, final) => {
    if (final) order.push(role);
  });
  cb.tool = vi.fn(() => order.push('tool'));
  const live = await provider().open(record, '', undefined, cb);
  events.onmessage({
    serverContent: {
      inputTranscription: { text: 'No quiz or score.' },
      outputTranscription: { text: 'Let me make that.' },
    },
  });
  events.onmessage({
    toolCall: {
      functionCalls: [{ id: 't_build', name: 'build_world', args: { description: 'A fox' } }],
    },
  });
  expect(order).toEqual(['child', 'tool']);
  expect(cb.transcript).toHaveBeenCalledWith('child', 'No quiz or score.', true);
  events.onmessage({ serverContent: { turnComplete: true } });
  expect(order).toEqual(['child', 'tool', 'character']);
  live.close();
});
