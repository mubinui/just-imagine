import { it, expect, vi, beforeEach } from 'vitest';

const mockGenerate = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: mockGenerate };
  },
  HarmCategory: {},
  HarmBlockThreshold: { BLOCK_LOW_AND_ABOVE: 'low' },
}));
import { GameScriptModel } from '../src/game-model';

beforeEach(() => mockGenerate.mockReset());

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
});

it('rejects an empty response', async () => {
  mockGenerate.mockResolvedValue({ text: '' });
  const model = new GameScriptModel({ project: 'test', model: 'gemini-4-argon' });
  await expect(model.generate('prompt')).rejects.toThrow(/no structured/);
});
