import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ verify: vi.fn(), transaction: vi.fn(), cookie: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@just-imagine/server-core', () => ({
  adminAuth: () => ({ verifyIdToken: mocks.verify, createSessionCookie: mocks.cookie }),
  db: () => ({ runTransaction: mocks.transaction }),
}));
import { POST } from '../app/api/session/route';
it.each(['student', 'schoolAdmin', 'unknown'])(
  'rejects a %s before creating a family or session',
  async (role) => {
    vi.clearAllMocks();
    mocks.verify.mockResolvedValue({ uid: 'school-identity', role, auth_time: Date.now() / 1000 });
    const response = await POST(
      new NextRequest('http://localhost:3300/api/session', {
        method: 'POST',
        headers: { origin: 'http://localhost:3300', 'content-type': 'application/json' },
        body: JSON.stringify({ idToken: 'school-token', consent: true }),
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.cookie).not.toHaveBeenCalled();
  },
);
