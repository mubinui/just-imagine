import { describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  active: 0,
  maxActive: 0,
  calls: [] as { input: { text: string; max: number }[]; config: Record<string, unknown> }[],
}));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async (request: { contents: string; config: Record<string, unknown> }) => {
        const input = JSON.parse(
          request.contents.slice(request.contents.lastIndexOf('\n') + 1),
        ) as { text: string; max: number }[];
        state.active++;
        state.maxActive = Math.max(state.maxActive, state.active);
        state.calls.push({ input, config: request.config });
        await new Promise((resolve) => setTimeout(resolve, 5));
        state.active--;
        return { text: JSON.stringify({ texts: input.map(() => 'বাংলা') }) };
      },
    };
  },
  HarmCategory: {},
  HarmBlockThreshold: { BLOCK_LOW_AND_ABOVE: 'low' },
}));
vi.mock('@just-imagine/server-core', () => ({
  ContentEditions: class {
    constructor(public translator: unknown) {}
  },
  logEvent: vi.fn(),
}));
import { geminiEditions } from '../src/editions';
describe('long-book translation requests', () => {
  it('bounds output size and concurrency instead of sending a whole book as one response', async () => {
    const service = geminiEditions({ apiKey: 'test', model: 'test' }) as unknown as {
      translator: (
        entries: { path: string[]; text: string; max: number }[],
        language: 'bn',
      ) => Promise<string[]>;
    };
    const entries = Array.from({ length: 70 }, (_, i) => ({
      path: ['passage', String(i)],
      text: 'A story passage. '.repeat(40),
      max: 1000,
    }));
    const [result, parallel] = await Promise.all([
      service.translator(entries, 'bn'),
      service.translator(entries, 'bn'),
    ]);
    expect(parallel).toHaveLength(70);
    expect(result).toHaveLength(70);
    expect(state.calls.length).toBeGreaterThan(1);
    expect(state.maxActive).toBe(3);
    for (const { input, config } of state.calls) {
      expect(input.length).toBeLessThanOrEqual(16);
      expect(input.reduce((sum, e) => sum + e.text.length, 0)).toBeLessThanOrEqual(3000);
      expect(config.httpOptions).toEqual({ timeout: 45000, retryOptions: { attempts: 1 } });
    }
  });
});
