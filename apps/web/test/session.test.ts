import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('server-only', () => ({}));
const mock = vi.hoisted(() => ({
  token: vi.fn(),
  cookie: vi.fn(),
  transaction: vi.fn(),
  create: vi.fn(),
  exists: false,
  locked: false,
  school: false,
}));
vi.mock('@just-imagine/server-core', () => ({
  adminAuth: () => ({ verifyIdToken: mock.token, createSessionCookie: mock.cookie }),
  db: () => ({ doc: (path: string) => ({ path }), runTransaction: mock.transaction }),
}));
import { POST, DELETE } from '../app/api/session/route';
const request = (body: unknown, origin = 'http://localhost:3100') =>
  new NextRequest('http://localhost:3100/api/session', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mock.exists = false;
  mock.locked = false;
  mock.school = false;
  mock.token.mockResolvedValue({
    uid: 'u_test',
    email: 'parent@example.test',
    auth_time: Date.now() / 1000,
  });
  mock.cookie.mockResolvedValue('session-test');
  mock.transaction.mockImplementation(async (fn) =>
    fn({
      get: async (ref: { path: string }) => ({
        exists: ref.path.startsWith('deletionLocks')
          ? mock.locked
          : ref.path.startsWith('schoolPrincipals')
            ? mock.school
            : mock.exists,
      }),
      create: mock.create,
    }),
  );
});
it('rejects foreign origins before token verification', async () => {
  expect((await POST(request({ idToken: 'a' }, 'https://foreign.test'))).status).toBe(403);
  expect(mock.token).not.toHaveBeenCalled();
});
it('requires recent authentication', async () => {
  mock.token.mockResolvedValue({ uid: 'u_test', auth_time: Date.now() / 1000 - 301 });
  expect((await POST(request({ idToken: 'a', consent: true }))).status).toBe(401);
  expect(mock.cookie).not.toHaveBeenCalled();
});
it('requires explicit consent for a new account', async () => {
  const refused = await POST(request({ idToken: 'a' }));
  expect(refused.status).toBe(403);
  expect(await refused.json()).toMatchObject({ code: 'CONSENT_REQUIRED' });
  expect(mock.create).not.toHaveBeenCalled();
  const response = await POST(request({ idToken: 'a', consent: true }));
  expect(response.status).toBe(200);
  expect(mock.create).toHaveBeenCalledTimes(1);
  const cookie = response.headers.get('set-cookie');
  expect(cookie).toContain('HttpOnly');
  expect(cookie).toContain('SameSite=lax');
});
it('does not recreate accounts under deletion', async () => {
  mock.locked = true;
  expect((await POST(request({ idToken: 'a', consent: true }))).status).toBe(403);
  expect(mock.create).not.toHaveBeenCalled();
});
it('rejects a stale roleless token after teacher membership has been accepted', async () => {
  mock.school = true;
  expect((await POST(request({ idToken: 'a', consent: true }))).status).toBe(403);
  expect(mock.create).not.toHaveBeenCalled();
  expect(mock.cookie).not.toHaveBeenCalled();
});
it('allows returning parents without another consent and expires cookies on logout', async () => {
  mock.exists = true;
  expect((await POST(request({ idToken: 'a' }))).status).toBe(200);
  expect(mock.create).not.toHaveBeenCalled();
  const response = await DELETE(request({}));
  expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
});
