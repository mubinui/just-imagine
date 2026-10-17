import { it, expect, vi, afterEach } from 'vitest';
import { GameScriptModel } from '../src/game-model';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures/browser';
import type { BuildWorldJob } from '@just-imagine/protocol';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('sends explicit bounded MEDIUM reasoning and purpose-specific deadlines through the real SDK while preserving model and output caps', async () => {
  const requests: { headers: Headers; body: Record<string, unknown>; path: string }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: unknown, init: RequestInit) => {
      requests.push({
        headers: new Headers(init.headers),
        body: JSON.parse(String(init.body)) as Record<string, unknown>,
        path: new URL(String(_url)).pathname,
      });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                role: 'model',
                parts: [{ text: '{"kind":"game","source":"game.score(1);"}' }],
              },
              finishReason: 'STOP',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }),
  );
  const abort = vi.spyOn(AbortSignal, 'timeout');
  const model = new GameScriptModel({
    project: 'demo-test',
    apiKey: 'test-not-a-secret',
    model: 'gemini-4-argon',
  });
  await model.generate('Synthetic transport fixture');
  const job = {
    description: 'Synthetic planning fixture',
    experience: 'freeplay',
  } as BuildWorldJob;
  await model.plan(FIXTURE_WORLDS.moonBounce, job);
  expect(requests.map((r) => r.headers.get('X-Server-Timeout'))).toEqual(['180', '90']);
  expect(requests.every((r) => r.path.endsWith('/models/gemini-4-argon:generateContent'))).toBe(
    true,
  );
  expect(abort.mock.calls.map(([ms]) => ms)).toEqual([190000, 100000]);
  const scriptConfig = requests[0]!.body['generationConfig'] as Record<string, unknown>;
  const planConfig = requests[1]!.body['generationConfig'] as Record<string, unknown>;
  expect(scriptConfig['maxOutputTokens']).toBe(24000);
  expect(scriptConfig['thinkingConfig']).toEqual({ thinkingLevel: 'MEDIUM' });
  expect(planConfig['maxOutputTokens']).toBe(12288);
  expect(planConfig['thinkingConfig']).toEqual({ thinkingLevel: 'MEDIUM' });
});
