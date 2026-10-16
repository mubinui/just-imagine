import { describe, it, expect } from 'vitest';
import { AdminRequiredError } from '@just-imagine/server-core';
import { createApi } from '../src/app';
import type { ApiStore } from '../src/store';

function harness(isSuspended?: (uid: string) => Promise<boolean>) {
  const calls: string[] = [];
  const store = new Proxy(
    {},
    {
      get: (_t, name) => async () => {
        calls.push(String(name));
        return { uid: 'parent' };
      },
    },
  ) as ApiStore;
  const app = createApi({
    store,
    origins: [],
    verifyToken: async () => ({ uid: 'parent' }),
    ...(isSuspended ? { isSuspended } : {}),
    admin: {
      verifyAdmin: async (token) => {
        if (token === 'admin') return { uid: 'ops', email: 'ops@example.test' };
        if (token === 'parent') throw new AdminRequiredError();
        throw new Error('bad token');
      },
    },
  });
  return { app, calls };
}

describe('admin guard without Firestore', () => {
  it('answers 401 without a token, 401 for a bad token and 403 without the claim', async () => {
    const { app } = harness();
    expect((await app.inject('/v1/admin/overview')).statusCode).toBe(401);
    const bad = await app.inject({
      url: '/v1/admin/overview',
      headers: { authorization: 'Bearer nope' },
    });
    expect(bad.statusCode).toBe(401);
    expect(bad.body).not.toContain('bad token');
    const parent = await app.inject({
      url: '/v1/admin/overview',
      headers: { authorization: 'Bearer parent' },
    });
    expect(parent.statusCode).toBe(403);
    expect(parent.json().error.code).toBe('FORBIDDEN');
    await app.close();
  });
  it('refuses parent routes for a suspended account before touching the store', async () => {
    const { app, calls } = harness(async () => true);
    const res = await app.inject({ url: '/v1/me', headers: { authorization: 'Bearer x' } });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ACCOUNT_SUSPENDED');
    expect(calls).toEqual([]);
    await app.close();
  });
  it('fails closed when the suspension check cannot be read', async () => {
    const { app, calls } = harness(async () => {
      throw new Error('firestore down');
    });
    const res = await app.inject({ url: '/v1/me', headers: { authorization: 'Bearer x' } });
    expect(res.statusCode).toBe(500);
    expect(calls).toEqual([]);
    await app.close();
  });
});
