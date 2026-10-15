import { it, expect } from 'vitest';
import { adminAuth, db } from '@just-imagine/server-core';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
it('rules allow own reads, reject other parents and all client writes', async () => {
  const firestoreHost = process.env['FIRESTORE_EMULATOR_HOST'];
  const authHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];
  if (!firestoreHost || !authHost) throw new Error('Emulators required');
  const custom = await adminAuth().createCustomToken('rules_parent');
  const signed = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  const { idToken } = (await signed.json()) as { idToken: string };
  await db().doc('users/rules_parent').set({ displayName: 'Parent' });
  await db().doc('users/rules_other').set({ displayName: 'Other' });
  const base = `http://${firestoreHost}/v1/projects/demo-just-imagine/databases/(default)/documents/`;
  const headers = { authorization: `Bearer ${idToken}`, 'content-type': 'application/json' };
  expect((await fetch(base + 'users/rules_parent', { headers })).status).toBe(200);
  expect((await fetch(base + 'users/rules_other', { headers })).status).toBe(403);
  expect(
    (
      await fetch(base + 'users/rules_parent', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: { plan: { stringValue: 'family' } } }),
      })
    ).status,
  ).toBe(403);
  expect((await fetch(base + 'users/rules_parent')).status).toBe(403);
});
