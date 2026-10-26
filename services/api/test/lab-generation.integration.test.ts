import { beforeAll, describe, it, expect } from 'vitest';
import { adminAuth, db, requireParent } from '@just-imagine/server-core';
import { createApi } from '../src/app';
import type { ApiStore } from '../src/store';
import type { SchoolModel } from '../src/school/ai';
import { proposal, request, start } from './support/lab-proposal';

process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';

async function token(uid: string, claims: Record<string, unknown> = {}) {
  const custom = await adminAuth().createCustomToken(uid, claims);
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

/** The fake model answers from this queue; each test sets it and reads the calls back. */
let answers: unknown[] = [];
let calls = 0;
const labModel: SchoolModel = async () => {
  calls++;
  return answers.shift();
};
const app = createApi({
  store: new Proxy({}, { get: () => async () => ({}) }) as ApiStore,
  verifyToken: requireParent,
  origins: [],
  school: { labModel },
});
let operator: string;
let teacher: string;
let sid: string;
const call = (url: string, bearer: string, payload: unknown) =>
  app.inject({
    method: 'POST',
    url,
    headers: { authorization: 'Bearer ' + bearer },
    payload: payload as Record<string, unknown>,
  });
async function auditFor(lessonId: string) {
  const snap = await db()
    .collection('adminAudit')
    .where('target.id', '==', lessonId)
    .where('action', '==', 'lesson.generateLab')
    .get();
  return snap.docs.map((d) => d.data());
}
const invalid = proposal((p) => (p.step.params = { ...start, speed: 400 }));

beforeAll(async () => {
  operator = await token('lab_generation_ops', { admin: true });
  await adminAuth().createUser({
    uid: 'lab_generation_teacher',
    email: 'teacher-lab@example.test',
    emailVerified: true,
  });
  const created = await call('/v1/admin/schools', operator, {
    name: 'Lab School',
    nameBn: 'ল্যাব বিদ্যালয়',
    seats: 5,
    voiceSecondsPerDay: 1800,
    reason: 'Lab generation acceptance',
  });
  expect(created.statusCode).toBe(201);
  sid = created.json().school.id;
  const invite = await call('/v1/admin/schools/' + sid + '/invites', operator, {
    email: 'teacher-lab@example.test',
    reason: 'Invite lab teacher',
  });
  const raw = new URL(invite.json().inviteUrl).searchParams.get('invite');
  const accepted = await call('/v1/school/invites/accept', await token('lab_generation_teacher'), {
    token: raw,
  });
  expect(accepted.statusCode).toBe(200);
  teacher = await token('lab_generation_teacher', { role: 'schoolAdmin', schoolId: sid });
});

describe('operator lab generation', () => {
  it('refuses a request without an audit reason before calling the model', async () => {
    calls = 0;
    answers = [proposal()];
    const response = await call('/v1/admin/lab/generate', operator, {
      ...request,
      lessonId: 'w_lab_no_reason',
    });
    expect(response.statusCode).toBe(400);
    expect(calls).toBe(0);
    expect(await auditFor('w_lab_no_reason')).toEqual([]);
  });

  it('records the reason, chapter and proposed simulation in the audit log', async () => {
    answers = [proposal()];
    const response = await call('/v1/admin/lab/generate', operator, {
      ...request,
      lessonId: 'w_lab_audit',
      reason: 'Prepare the projectile lesson',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().step.simId).toBe('projectile');
    expect(await auditFor('w_lab_audit')).toEqual([
      expect.objectContaining({
        reason: 'Prepare the projectile lesson',
        target: { kind: 'lesson', id: 'w_lab_audit' },
        before: null,
        after: { chapterId: 'physics-2', simId: 'projectile', outcome: 'proposed' },
      }),
    ]);
  });

  it('records a failed generation too', async () => {
    answers = [invalid, invalid];
    const response = await call('/v1/admin/lab/generate', operator, {
      ...request,
      lessonId: 'w_lab_failed',
      reason: 'Try a lab that the model gets wrong',
    });
    expect(response.statusCode).toBe(503);
    expect(await auditFor('w_lab_failed')).toEqual([
      expect.objectContaining({
        after: { chapterId: 'physics-2', simId: null, outcome: 'failed' },
      }),
    ]);
  });
});

describe('teacher lab generation', () => {
  it('uses one unit of the daily AI allowance per request, repair round included', async () => {
    const usage = async () =>
      (await db().collection('schoolUsageDaily').where('schoolId', '==', sid).get()).docs.reduce(
        (sum, doc) => sum + Number(doc.get('aiDrafts') ?? 0),
        0,
      );
    const before = await usage();
    calls = 0;
    answers = [invalid, proposal()];
    const response = await call('/v1/school/lab/generate', teacher, request);
    expect(response.statusCode).toBe(200);
    expect(calls).toBe(2);
    expect(await usage()).toBe(before + 1);
  });
});
