import { it, expect } from 'vitest';
import { adminAuth, db } from '@just-imagine/server-core';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';

async function idToken(uid: string, claims: Record<string, unknown> | null) {
  try {
    await adminAuth().createUser({ uid });
  } catch {
    /* exists */
  }
  await adminAuth().setCustomUserClaims(uid, claims);
  const custom = await adminAuth().createCustomToken(uid);
  const res = await fetch(
    `http://${process.env['FIREBASE_AUTH_EMULATOR_HOST']}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  return ((await res.json()) as { idToken: string }).idToken;
}

it('denies every client read and write of admin audit and flags, even to admins', async () => {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!host || !process.env['FIREBASE_AUTH_EMULATOR_HOST']) throw new Error('Emulators required');
  const base = `http://${host}/v1/projects/demo-just-imagine/databases/(default)/documents/`;
  await db().doc('adminAudit/a_1').set({ actorUid: 'rules_admin', action: 'quota.reset' });
  await db().doc('adminFlags/rules_fam').set({ suspended: true, updatedAt: 1 });
  for (const token of [
    await idToken('rules_admin', { admin: true }),
    await idToken('rules_fam', null),
  ]) {
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    expect((await fetch(base + 'adminAudit/a_1', { headers })).status).toBe(403);
    expect((await fetch(base + 'adminAudit', { headers })).status).toBe(403);
    expect((await fetch(base + 'adminFlags/rules_fam', { headers })).status).toBe(403);
    const write = await fetch(base + 'adminAudit/a_2', {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ fields: { action: { stringValue: 'account.delete' } } }),
    });
    expect(write.status).toBe(403);
  }
  expect((await fetch(base + 'adminAudit/a_1')).status).toBe(403);
});

it('hides a world from its own family while an admin review is pending', async () => {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  const base = `http://${host}/v1/projects/demo-just-imagine/databases/(default)/documents/`;
  await db().doc('worlds/w_shown').set({ ownerUid: 'rules_owner', title: 'Shown' });
  await db().doc('worlds/w_held').set({ ownerUid: 'rules_owner', title: 'Held', hidden: true });
  await db().doc('worlds/w_held/versions/1').set({ reason: 'first' });
  const headers = { authorization: `Bearer ${await idToken('rules_owner', null)}` };
  expect((await fetch(base + 'worlds/w_shown', { headers })).status).toBe(200);
  expect((await fetch(base + 'worlds/w_held', { headers })).status).toBe(403);
  expect((await fetch(base + 'worlds/w_held/versions/1', { headers })).status).toBe(403);
});
