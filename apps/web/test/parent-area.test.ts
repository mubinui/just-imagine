import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('server-only', () => ({}));
const mock = vi.hoisted(() => ({
  idToken: vi.fn(),
  verifyCookie: vi.fn(),
  createCookie: vi.fn(),
  jar: new Map<string, string>(),
}));
vi.mock('@just-imagine/server-core', () => ({
  adminAuth: () => ({
    verifyIdToken: mock.idToken,
    verifySessionCookie: mock.verifyCookie,
    createSessionCookie: mock.createCookie,
  }),
  db: () => ({
    doc: (path: string) => ({ path }),
    runTransaction: async (fn: (tx: unknown) => unknown) =>
      fn({
        get: async (ref: { path: string }) => ({ exists: ref.path.startsWith('users/') }),
        create: vi.fn(),
      }),
  }),
}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (mock.jar.has(name) ? { name, value: mock.jar.get(name) } : undefined),
  }),
}));
import { POST as signIn } from '../app/api/session/route';
import { DELETE as lock, GET as status, POST as unlock } from '../app/api/parent-area/route';
import { getParentArea, getParentSession } from '../lib/session';

const now = () => Math.floor(Date.now() / 1000);
const call = (method: string, body?: unknown, cookie?: string, origin = 'http://localhost:3100') =>
  new NextRequest('http://localhost:3100/api/parent-area', {
    method,
    headers: {
      Origin: origin,
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: `__session=${encodeURIComponent(cookie)}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
/** The `__session` value a response sets, decoded. */
const setSession = (response: Response) => {
  const header = response.headers.get('set-cookie') ?? '';
  const match = /__session=([^;]*)/.exec(header);
  return match ? decodeURIComponent(match[1]!) : undefined;
};

beforeEach(() => {
  vi.clearAllMocks();
  mock.jar.clear();
  mock.idToken.mockResolvedValue({ uid: 'u_parent', auth_time: now() });
  mock.createCookie.mockImplementation(async (_token: string, { expiresIn }) =>
    expiresIn > 60 * 60 * 1000 ? 'family' : 'grown-up',
  );
  mock.verifyCookie.mockImplementation(async (value: string) => {
    if (value === 'family') return { uid: 'u_parent', exp: now() + 4 * 24 * 3600 };
    if (value === 'grown-up') return { uid: 'u_parent', exp: now() + 3600 };
    if (value === 'other-grown-up') return { uid: 'u_other', exp: now() + 3600 };
    throw new Error('invalid');
  });
});

describe('the parent area', () => {
  it('opens straight after signing in, so a new family can add an explorer', async () => {
    const response = await signIn(call('POST', { idToken: 'fresh' }));
    expect(response.status).toBe(200);
    expect(setSession(response)).toBe('family|grown-up');
  });

  it('locks when the child area opens, and the family stays signed in', async () => {
    const response = await lock(call('DELETE', undefined, 'family|grown-up'));
    expect(response.status).toBe(200);
    expect(setSession(response)).toBe('family');
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=3[0-9]{5}/);
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });

  it('is not locked by another site', async () => {
    const response = await lock(call('DELETE', undefined, 'family|grown-up', 'https://evil.test'));
    expect(response.status).toBe(403);
    expect(setSession(response)).toBeUndefined();
  });

  it('opens again only after a fresh sign-in by the same grown-up', async () => {
    const response = await unlock(call('POST', { idToken: 'fresh' }, 'family'));
    expect(response.status).toBe(200);
    expect(setSession(response)).toBe('family|grown-up');
    expect(mock.idToken).toHaveBeenCalledWith('fresh', true);
  });

  it('refuses a sign-in that is not fresh', async () => {
    mock.idToken.mockResolvedValue({ uid: 'u_parent', auth_time: now() - 301 });
    const response = await unlock(call('POST', { idToken: 'old' }, 'family'));
    expect(response.status).toBe(401);
    expect(setSession(response)).toBeUndefined();
  });

  it('refuses a different account or a school account', async () => {
    mock.idToken.mockResolvedValueOnce({ uid: 'u_other', auth_time: now() });
    expect((await unlock(call('POST', { idToken: 'x' }, 'family'))).status).toBe(403);
    mock.idToken.mockResolvedValueOnce({ uid: 'u_parent', role: 'student', auth_time: now() });
    expect((await unlock(call('POST', { idToken: 'x' }, 'family'))).status).toBe(403);
    expect(mock.createCookie).not.toHaveBeenCalled();
  });

  it('needs a family session before it can open', async () => {
    expect((await unlock(call('POST', { idToken: 'fresh' }))).status).toBe(401);
    expect(mock.createCookie).not.toHaveBeenCalled();
  });

  it('reports whether it is open', async () => {
    expect(await (await status(call('GET', undefined, 'family|grown-up'))).json()).toEqual({
      open: true,
    });
    expect(await (await status(call('GET', undefined, 'family'))).json()).toEqual({
      open: false,
    });
    expect((await status(call('GET'))).status).toBe(401);
  });

  it('is open on the server only with a valid unlock for the same family', async () => {
    mock.jar.set('__session', 'family|grown-up');
    expect(await getParentArea()).toMatchObject({ open: true, session: { uid: 'u_parent' } });
    mock.jar.set('__session', 'family');
    expect(await getParentArea()).toMatchObject({ open: false });
    mock.jar.set('__session', 'family|other-grown-up');
    expect(await getParentArea()).toMatchObject({ open: false });
    mock.jar.set('__session', 'family|forged');
    expect(await getParentArea()).toMatchObject({ open: false });
    expect(await getParentSession()).toMatchObject({ uid: 'u_parent' });
  });
});
