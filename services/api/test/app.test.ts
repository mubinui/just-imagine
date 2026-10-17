import { describe, it, expect } from 'vitest';
import { createApi } from '../src/app';
import type { ApiStore } from '../src/store';

function harness() {
  const calls: unknown[] = [];
  const store = new Proxy(
    {},
    {
      get:
        (_target, name) =>
        async (...args: unknown[]) => {
          calls.push([name, ...args]);
          if (name === 'me') return { uid: args[0] };
          return { id: 'c_new' };
        },
    },
  ) as ApiStore;
  return {
    app: createApi({
      store,
      verifyToken: async (token) => {
        if (token !== 'valid') throw new Error('bad token');
        return { uid: 'parent' };
      },
      origins: ['https://app.example'],
    }),
    calls,
  };
}
describe('API boundaries', () => {
  it('requires a parent token before reading data', async () => {
    const { app, calls } = harness();
    expect((await app.inject('/v1/me')).statusCode).toBe(401);
    expect(calls).toEqual([]);
    await app.close();
  });
  it('uses the verified uid rather than any supplied owner', async () => {
    const { app, calls } = harness();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/children',
      headers: { authorization: 'Bearer valid' },
      payload: { firstName: 'Mira', avatar: 'owl', ageBand: '8-10' },
    });
    expect(res.statusCode).toBe(201);
    expect(calls[0]).toEqual([
      'createChild',
      'parent',
      { firstName: 'Mira', avatar: 'owl', ageBand: '8-10' },
    ]);
    await app.close();
  });
  it('rejects extra child data before touching storage', async () => {
    const { app, calls } = harness();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/children',
      headers: { authorization: 'Bearer valid' },
      payload: { firstName: 'Mira', avatar: 'owl', ageBand: '8-10', email: 'child@example.com' },
    });
    expect(res.statusCode).toBe(400);
    expect(calls).toEqual([]);
    await app.close();
  });
  it('never exposes internal exception text', async () => {
    const { app } = harness();
    const res = await app.inject({ url: '/v1/me', headers: { authorization: 'Bearer bad' } });
    expect(res.statusCode).toBe(401);
    expect(res.body).not.toContain('bad token');
    await app.close();
  });
  it('fails billing closed when credentials are not configured', async () => {
    const { app } = harness();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/billing/checkout',
      headers: { authorization: 'Bearer valid' },
      payload: { tier: 'family' },
    });
    expect(res.statusCode).toBe(503);
    await app.close();
  });
});
it('requires a signed-in parent and explicit photo permission before drawing a companion', async () => {
  const app = createApi({
    store: {} as ApiStore,
    origins: [],
    verifyToken: async () => ({ uid: 'parent' }),
  });
  expect(
    (await app.inject({ method: 'POST', url: '/v1/children/c_one/companion', payload: {} }))
      .statusCode,
  ).toBe(401);
  const res = await app.inject({
    method: 'POST',
    url: '/v1/children/c_one/companion',
    headers: { authorization: 'Bearer valid' },
    payload: {
      name: 'Pip',
      characterId: 'bhombol',
      consent: false,
      mimeType: 'image/png',
      photo: 'AAAA',
    },
  });
  expect(res.statusCode).toBe(400);
  const missing = await app.inject({
    method: 'POST',
    url: '/v1/children/c_one/companion',
    headers: { authorization: 'Bearer valid' },
    payload: {
      name: 'Pip',
      characterId: 'bhombol',
      consent: true,
      mimeType: 'image/png',
      photo: 'AAAA',
    },
  });
  expect(missing.statusCode).toBe(503);
  await app.close();
});

describe('selected-language response boundary', () => {
  it('uses only the verified owner and rejects unsupported languages before translating', async () => {
    const calls: unknown[] = [];
    const app = createApi({
      store: {
        getWorld: async (uid: string, id: string) => ({
          id,
          ownerUid: uid,
          childId: 'c_one',
          title: 'A garden',
        }),
      } as ApiStore,
      verifyToken: async () => ({ uid: 'parent' }),
      origins: [],
      editions: {
        apply: async (...args: unknown[]) => {
          calls.push(args);
          return { title: 'বাগান' };
        },
      } as never,
    });
    const res = await app.inject({
      url: '/v1/worlds/w_one',
      headers: { authorization: 'Bearer valid', 'x-app-language': 'bn' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().title).toBe('বাগান');
    expect(calls[0]).toEqual([
      { uid: 'parent', childId: 'c_one', kind: 'world', path: 'worlds/w_one' },
      'bn',
      expect.objectContaining({ title: 'A garden' }),
    ]);
    expect(
      (
        await app.inject({
          url: '/v1/worlds/w_one',
          headers: { authorization: 'Bearer valid', 'x-app-language': 'hi' },
        })
      ).statusCode,
    ).toBe(400);
    expect(calls).toHaveLength(1);
    await app.close();
  });
  it('does not return original prose as a successful selected-language edition on model failure', async () => {
    const app = createApi({
      store: {
        getWorld: async () => ({ id: 'w_one', childId: 'c_one', title: 'A garden' }),
      } as unknown as ApiStore,
      verifyToken: async () => ({ uid: 'parent' }),
      origins: [],
      editions: {
        apply: async () => {
          throw new Error('model secret');
        },
      } as never,
    });
    const res = await app.inject({
      url: '/v1/worlds/w_one',
      headers: { authorization: 'Bearer valid', 'x-app-language': 'bn' },
    });
    expect(res.statusCode).toBe(503);
    expect(res.body).not.toContain('A garden');
    expect(res.body).not.toContain('model secret');
    await app.close();
  });
});

it('fails a missing translator closed rather than presenting English content in Bangla', async () => {
  const app = createApi({
    store: {
      getWorld: async () => ({ id: 'w_one', childId: 'c_one', title: 'A garden' }),
    } as unknown as ApiStore,
    verifyToken: async () => ({ uid: 'parent' }),
    origins: [],
  });
  expect(
    (
      await app.inject({
        url: '/v1/worlds/w_one',
        headers: { authorization: 'Bearer valid', 'x-app-language': 'bn' },
      })
    ).statusCode,
  ).toBe(503);
  expect(
    (
      await app.inject({
        url: '/v1/worlds/w_one',
        headers: { authorization: 'Bearer valid', 'x-app-language': 'en' },
      })
    ).statusCode,
  ).toBe(200);
  await app.close();
});
