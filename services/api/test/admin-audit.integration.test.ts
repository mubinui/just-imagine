import { beforeAll, describe, it, expect } from 'vitest';
import { adminAuth, db, requireParent } from '@just-imagine/server-core';
import { PACKS } from '@just-imagine/learning-content';
import { createApi } from '../src/app';
import type { ApiStore } from '../src/store';

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

const app = createApi({
  store: new Proxy({}, { get: () => async () => ({}) }) as ApiStore,
  verifyToken: requireParent,
  origins: [],
});
let operator: string;
let schoolId: string;
const call = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: unknown) =>
  app.inject({
    method,
    url,
    headers: { authorization: 'Bearer ' + operator },
    ...(payload ? { payload } : {}),
  });
async function latestAudit(targetId: string) {
  const snap = await db().collection('adminAudit').where('target.id', '==', targetId).get();
  return snap.docs.map((d) => d.data()).sort((a, b) => Number(b['at']) - Number(a['at']))[0];
}

beforeAll(async () => {
  operator = await token('admin_audit_ops', { admin: true });
  const created = await call('POST', '/v1/admin/schools', {
    name: 'Audit Labels School',
    nameBn: 'নিরীক্ষা বিদ্যালয়',
    seats: 40,
    voiceSecondsPerDay: 1800,
    reason: 'Audit label acceptance',
  });
  expect(created.statusCode).toBe(201);
  schoolId = created.json().school.id;
});

describe('admin audit entries say what happened', () => {
  it('logs a seats-only edit as an update, even when the form resends the current status', async () => {
    const patched = await call('PATCH', '/v1/admin/schools/' + schoolId, {
      seats: 45,
      status: 'active',
      reason: 'More seats',
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().school.seats).toBe(45);
    const audit = await latestAudit(schoolId);
    expect(audit?.['action']).toBe('school.update');
  });

  it('logs a real status change as a pause or a reinstatement', async () => {
    await call('PATCH', '/v1/admin/schools/' + schoolId, {
      status: 'suspended',
      reason: 'Pause school',
    });
    expect((await latestAudit(schoolId))?.['action']).toBe('school.suspend');
    await call('PATCH', '/v1/admin/schools/' + schoolId, {
      status: 'active',
      reason: 'Resume school',
    });
    expect((await latestAudit(schoolId))?.['action']).toBe('school.reinstate');
  });

  it('records a revoked invite as the invite that existed before and nothing after', async () => {
    const invite = await call('POST', '/v1/admin/schools/' + schoolId + '/invites', {
      email: 'Revoke.Me@example.test',
      reason: 'Invite to revoke',
    });
    expect(invite.statusCode).toBe(200);
    const revoked = await call(
      'DELETE',
      `/v1/admin/schools/${schoolId}/invites/${invite.json().inviteId}`,
      { reason: 'Wrong address' },
    );
    expect(revoked.statusCode).toBe(200);
    const audit = await latestAudit(schoolId);
    expect(audit?.['action']).toBe('school.inviteRevoke');
    expect(audit?.['before']).toEqual({
      email: 'revoke.me@example.test',
      expiresAt: invite.json().expiresAt,
    });
    expect(audit?.['after']).toBeNull();
    const again = await call(
      'DELETE',
      `/v1/admin/schools/${schoolId}/invites/${invite.json().inviteId}`,
      { reason: 'Wrong address' },
    );
    expect(again.statusCode).toBe(404);
  });

  it('records a story-pack upload as a draft and a title edit with its fields', async () => {
    const template = Object.values(PACKS)[0]!;
    const id = 'catalog_audit' + Date.now().toString(36).slice(-6);
    const pack = {
      ...structuredClone(template),
      id,
      challenges: template.challenges.map((c, i) => ({ ...c, id: `${id}_${i + 1}` })),
    };
    const created = await call('POST', '/v1/admin/catalog/packs', {
      pack,
      title: { en: 'Audit pack', bn: 'নিরীক্ষা প্যাক' },
      ageBands: ['8-10'],
      reason: 'Upload pack',
    });
    expect(created.statusCode).toBe(200);
    const entryId = created.json().entry.id;
    const upload = await latestAudit(entryId);
    expect(upload?.['action']).toBe('catalog.create');
    expect(upload?.['before']).toBeNull();
    expect(upload?.['after']).toMatchObject({ status: 'draft', kind: 'storyPack' });

    const edited = await call('PATCH', '/v1/admin/catalog/' + entryId, {
      title: { en: 'Audit pack two', bn: 'নিরীক্ষা প্যাক' },
      reason: 'Rename pack',
    });
    expect(edited.statusCode).toBe(200);
    const edit = await latestAudit(entryId);
    expect(edit?.['action']).toBe('catalog.update');
    expect(edit?.['before']).toMatchObject({ status: 'draft', titleEn: 'Audit pack' });
    expect(edit?.['after']).toMatchObject({ status: 'draft', titleEn: 'Audit pack two' });
  });

  it('says plainly when a promoted world id does not exist', async () => {
    const response = await call('POST', '/v1/admin/catalog/worlds', {
      worldId: 'no_such_world',
      title: { en: 'Missing', bn: 'নেই' },
      ageBands: ['8-10'],
      reason: 'Promote a world',
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.message).toMatch(/No saved world has that id/);
  });
});
