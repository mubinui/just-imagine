import { it, expect, vi, beforeEach } from 'vitest';

const { mockGenerate, mockConstruct } = vi.hoisted(() => ({
  mockGenerate: vi.fn(),
  mockConstruct: vi.fn(),
}));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    constructor(config: unknown) {
      mockConstruct(config);
    }
    models = { generateContent: mockGenerate };
  },
  HarmCategory: {},
  HarmBlockThreshold: { BLOCK_LOW_AND_ABOVE: 'low' },
  ThinkingLevel: { HIGH: 'HIGH', MEDIUM: 'MEDIUM' },
}));
import { GameScriptModel } from '../src/game-model';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import type { BuildWorldJob } from '@just-imagine/protocol';

const job: BuildWorldJob = {
  kind: 'build',
  jobId: 'j_quality',
  worldId: 'w_quality',
  uid: 'u_test',
  childId: 'c_test',
  sessionId: 's_test',
  plan: 'family',
  description: 'Move when I tap',
  experience: 'freeplay',
  concepts: ['force'],
  ageBand: '6-7',
  tier: 'playground',
  styleVersion: 'v1',
  promptVersion: 'v1',
  conversationSummary: '',
};

beforeEach(() => {
  mockGenerate.mockReset();
  mockConstruct.mockReset();
});

it('asks the scene model for structured {kind, source} JSON with safety settings', async () => {
  mockGenerate.mockResolvedValue({ text: '{"kind":"game","source":"game.score(1);"}' });
  const model = new GameScriptModel({ project: 'test', model: 'gemini-4-argon' });
  await expect(model.generate('prompt')).resolves.toEqual({
    kind: 'game',
    source: 'game.score(1);',
  });
  const request = mockGenerate.mock.calls[0]![0];
  expect(request.model).toBe('gemini-4-argon');
  expect(request.config.responseMimeType).toBe('application/json');
  expect(request.config.responseJsonSchema.properties.kind.enum).toEqual(['game', 'playground']);
  expect(JSON.stringify(request.config.responseJsonSchema)).not.toContain('additionalProperties');
  expect(request.config.safetySettings).toHaveLength(4);
  expect(request.config.thinkingConfig).toEqual({ thinkingLevel: 'MEDIUM' });
  expect(request.config.httpOptions.retryOptions.attempts).toBe(1);
  expect(request.config.abortSignal).toBeInstanceOf(AbortSignal);
  expect(request.config.httpOptions.timeout).toBe(180000);
});

it('rejects an empty response', async () => {
  mockGenerate.mockResolvedValue({ text: '' });
  const model = new GameScriptModel({ project: 'test', model: 'gemini-4-argon' });
  await expect(model.generate('prompt')).rejects.toThrow(/no structured/);
});

it('honors the explicit authoring region and never falls back after a model error', async () => {
  const model = new GameScriptModel({ project: 'test', model: 'gemini-4-argon', location: 'eu' });
  expect(mockConstruct).toHaveBeenLastCalledWith({
    vertexai: true,
    project: 'test',
    location: 'eu',
  });
  mockGenerate.mockRejectedValue(new Error('quota exhausted'));
  await expect(model.generate('prompt')).rejects.toThrow('quota exhausted');
  expect(mockGenerate).toHaveBeenCalledTimes(1);
});

it('retries a rejected nested plan schema as JSON on the same model and retains safety and strict downstream validation', async () => {
  mockGenerate
    .mockRejectedValueOnce(Object.assign(new Error('schema rejected'), { status: 400 }))
    .mockResolvedValueOnce({ text: '{"intent":"format probe"}' });
  const model = new GameScriptModel({
    project: 'test',
    model: 'gemini-4-argon',
    apiKey: 'test-key',
  });
  await expect(model.plan(FIXTURE_WORLDS.moonBounce, job)).resolves.toEqual({
    intent: 'format probe',
  });
  expect(mockGenerate).toHaveBeenCalledTimes(2);
  const requests = mockGenerate.mock.calls.map(([request]) => request);
  expect(requests.map((request) => request.model)).toEqual(['gemini-4-argon', 'gemini-4-argon']);
  expect(requests[0].config.responseJsonSchema).toBeDefined();
  expect(requests[1].config.responseJsonSchema).toBeUndefined();
  expect(requests[1].contents).toContain('Exact JSON contract');
  expect(requests[1].config.safetySettings).toHaveLength(4);
  expect(requests[1].config.thinkingConfig).toEqual({ thinkingLevel: 'MEDIUM' });
  expect(requests.every((request) => request.config.httpOptions.timeout === 90000)).toBe(true);
});

it('does not use a format retry to hide planner authentication or quota failure', async () => {
  mockGenerate.mockRejectedValue(Object.assign(new Error('quota'), { status: 429 }));
  // Rate-limit backoff is covered in rate-limit.test.ts; here only the format retry is under test.
  const model = new GameScriptModel({
    project: 'test',
    model: 'gemini-4-argon',
    rateLimitDeadlineMs: 0,
  });
  await expect(model.plan(FIXTURE_WORLDS.moonBounce, job)).rejects.toThrow('quota');
  expect(mockGenerate).toHaveBeenCalledTimes(1);
});
