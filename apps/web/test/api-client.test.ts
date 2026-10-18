import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/firebase', () => ({ currentIdToken: async () => 'token' }));
vi.mock('../lib/env', () => ({ env: { fake: false, apiUrl: 'https://api.example' } }));
import { api } from '../lib/api';

afterEach(() => vi.unstubAllGlobals());

function capture() {
  const calls: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }),
  );
  return calls;
}

describe('api client', () => {
  it('sends a POST without a body and without a JSON content type', async () => {
    const calls = capture();
    await api('cancelPlan');
    const { init } = calls[0]!;
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(new Headers(init.headers).has('Content-Type')).toBe(false);
  });
  it('sends JSON with its content type when there is a body', async () => {
    const calls = capture();
    await api('checkout', {}, { tier: 'family' });
    const { url, init } = calls[0]!;
    expect(url).toBe('https://api.example/v1/billing/checkout');
    expect(init.body).toBe('{"tier":"family"}');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });
});
