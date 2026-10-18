import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { adminAuth, db, requireParent } from '@just-imagine/server-core';
import { schoolPaths } from '@just-imagine/protocol';
import { createApi } from '../src/app';
import type { ApiStore } from '../src/store';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';

async function exchange(custom: string) {
  const response = await fetch(
    'http://' +
      process.env['FIREBASE_AUTH_EMULATOR_HOST'] +
      '/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=test',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  const data = (await response.json()) as { idToken: string };
  if (!data.idToken) throw new Error('Cannot sign in emulator fixture.');
  return data.idToken;
}
const token = async (uid: string, claims: Record<string, unknown> = {}) =>
  exchange(await adminAuth().createCustomToken(uid, claims));
const api = (promotions: boolean) =>
  createApi({
    store: new Proxy({}, { get: () => async () => ({}) }) as ApiStore,
    verifyToken: requireParent,
    origins: [],
    school: { promotions },
  });
const app = api(true),
  closed = api(false);
const call = (
  target: ReturnType<typeof api>,
  method: 'GET' | 'POST',
  url: string,
  bearer: string,
  payload?: unknown,
) =>
  target.inject({
    method,
    url,
    headers: { authorization: 'Bearer ' + bearer },
    ...(payload ? { payload } : {}),
  });
let teacher: string, sid: string;
beforeAll(async () => {
  const operator = await token('plan_ops', { admin: true });
  await adminAuth().createUser({
    uid: 'plan_teacher',
    email: 'teacher-plan@example.test',
    emailVerified: true,
  });
  const created = await call(app, 'POST', '/v1/admin/schools', operator, {
    name: 'Plan School',
    nameBn: 'প্ল্যান বিদ্যালয়',
    seats: 10,
    voiceSecondsPerDay: 600,
    reason: 'Plan acceptance',
  });
  expect(created.statusCode).toBe(201);
  sid = created.json().school.id;
  const invite = await call(app, 'POST', `/v1/admin/schools/${sid}/invites`, operator, {
    email: 'teacher-plan@example.test',
    reason: 'Invite plan teacher',
  });
  const raw = new URL(invite.json().inviteUrl).searchParams.get('invite');
  const joining = await token('plan_teacher');
  expect(
    (await call(app, 'POST', '/v1/school/invites/accept', joining, { token: raw })).statusCode,
  ).toBe(200);
  teacher = await token('plan_teacher', { role: 'schoolAdmin', schoolId: sid });
});
afterAll(async () => {
  await app.close();
  await closed.close();
});

describe('school plans without payment', () => {
  it('lets a teacher take a premium school plan as a free promotion', async () => {
    const chosen = await call(app, 'POST', '/v1/school/plan', teacher, {
      planId: 'school-standard',
    });
    expect(chosen.statusCode).toBe(200);
    const me = (await call(app, 'GET', '/v1/school/me', teacher)).json();
    expect(me.school).toMatchObject({
      planId: 'school-standard',
      seats: 500,
      voiceSecondsPerDay: 40 * 3600,
    });
  });

  it('refuses a plan with fewer seats than the school already uses', async () => {
    const batch = db().batch();
    for (let i = 0; i < 41; i++)
      batch.set(db().doc(`${schoolPaths.students(sid)}/seat_${i}`), { firstName: `S${i}` });
    await batch.commit();
    const refused = await call(app, 'POST', '/v1/school/plan', teacher, {
      planId: 'school-classroom',
    });
    expect(refused.statusCode).toBe(409);
    expect((await call(app, 'GET', '/v1/school/me', teacher)).json().school.seats).toBe(500);
  });

  it('is closed while the deployment does not offer promotions', async () => {
    const res = await call(closed, 'POST', '/v1/school/plan', teacher, {
      planId: 'school-network',
    });
    expect(res.statusCode).toBe(409);
  });

  it('accepts only the published school plans', async () => {
    const res = await call(app, 'POST', '/v1/school/plan', teacher, { planId: 'family-year' });
    expect(res.statusCode).toBe(400);
  });
});
