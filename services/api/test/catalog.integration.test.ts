import { beforeEach, expect, it } from 'vitest';
import { adminAuth, db } from '@just-imagine/server-core';
import { loadPack } from '@just-imagine/learning-content';
import { paths } from '@just-imagine/protocol';
import { FirestoreCatalogStore } from '../src/catalog';

process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
const child = {
  firstName: 'Mira',
  avatar: 'owl',
  ageBand: '8-10',
  tier: 'playground',
  labsUnlocked: false,
  captions: true,
  sessionTargetMinutes: 8,
  loopsCompleted: 0,
  createdAt: 1,
};
const entry = {
  kind: 'world',
  status: 'published',
  title: { en: 'A shared moon', bn: 'সবার চাঁদ' },
  ageBands: ['8-10'],
  worldId: 'w_private',
  pack: null,
  publishedBy: 'operator',
  publishedAt: 1,
  updatedAt: 1,
};
beforeEach(async () => {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!host) throw new Error('Run under the isolated Firestore test emulator');
  const cleared = await fetch(
    `http://${host}/emulator/v1/projects/demo-just-imagine/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!cleared.ok) throw new Error('Could not clear isolated emulator');
  await db().doc(paths.user('parent')).set({
    email: 'family@example.test',
    displayName: 'Parent',
    consentAt: 1,
    plan: 'free',
    stripeCustomerId: null,
    createdAt: 1,
  });
  await db().doc(paths.child('parent', 'c_mira')).set(child);
  await db()
    .doc(paths.world('w_private'))
    .set({
      ownerUid: 'private-owner',
      childId: 'private-child',
      title: 'Private title',
      status: 'ready',
      doc: loadPack('space').scene,
      schemaVersion: 1,
      promptVersion: 'v1',
      styleVersion: 'v1',
      assets: {},
      concepts: ['gravity'],
      thumbnailUrl: null,
      jobId: 'j_private',
      createdAt: 1,
      updatedAt: 1,
      creation: { originalWish: 'private wish history', changes: [], mode: 'freeplay' },
    });
  await db().doc('catalog/j_shared').set(entry);
});

it('lists only published age-appropriate summaries and redacts private grading and family fields', async () => {
  const pack = loadPack('space');
  pack.id = 'catalog_planets';
  pack.challenges.forEach((challenge, index) => {
    challenge.id = `${pack.id}_q${index}`;
  });
  await db()
    .doc('catalog/j_pack')
    .set({ ...entry, kind: 'storyPack', worldId: null, pack });
  await db()
    .doc('catalog/j_draft')
    .set({ ...entry, status: 'draft' });
  await db()
    .doc('catalog/j_older')
    .set({ ...entry, ageBands: ['11-13'] });
  const result = await new FirestoreCatalogStore().list('parent', 'c_mira');
  expect(result.worlds.map((world) => world.id)).toEqual(['j_shared']);
  expect(result.packs[0]?.id).toBe('catalog_planets');
  const serialized = JSON.stringify(result);
  for (const secret of [
    'private-owner',
    'private-child',
    'private wish history',
    'j_private',
    '"answerKey"',
    '"accepted"',
    '"hint"',
  ])
    expect(serialized).not.toContain(secret);
  await expect(new FirestoreCatalogStore().list('other-parent', 'c_mira')).rejects.toThrow();
});

it('copies a published scene once per child under concurrent opens, without source wishes or ownership', async () => {
  const store = new FirestoreCatalogStore();
  const opened = await Promise.all([
    store.open('parent', 'c_mira', 'j_shared'),
    store.open('parent', 'c_mira', 'j_shared'),
  ]);
  expect(opened[0]?.worldId).toBe(opened[1]?.worldId);
  const copy = (await db().doc(paths.world(opened[0]!.worldId)).get()).data()!;
  expect(copy).toMatchObject({
    ownerUid: 'parent',
    childId: 'c_mira',
    title: 'A shared moon',
    status: 'ready',
  });
  expect(copy.doc.worldId).toBe(opened[0]!.worldId);
  expect(copy.creation).toBeUndefined();
  expect(copy.jobId).not.toBe('j_private');
  expect((await db().doc(paths.world('w_private')).get()).data()?.['ownerUid']).toBe(
    'private-owner',
  );
});

it('refuses unpublished, wrong-age, hidden and deleting-account copies', async () => {
  const store = new FirestoreCatalogStore();
  await db().doc('catalog/j_shared').update({ status: 'retired' });
  await expect(store.open('parent', 'c_mira', 'j_shared')).rejects.toThrow();
  await db()
    .doc('catalog/j_shared')
    .update({ status: 'published', ageBands: ['11-13'] });
  await expect(store.open('parent', 'c_mira', 'j_shared')).rejects.toThrow();
  await db()
    .doc('catalog/j_shared')
    .update({ ageBands: ['8-10'] });
  await db().doc(paths.world('w_private')).update({ hidden: true });
  await expect(store.open('parent', 'c_mira', 'j_shared')).rejects.toThrow();
  await db().doc(paths.world('w_private')).update({ hidden: false });
  await db().doc('deletionLocks/parent').set({ at: 1 });
  await expect(store.open('parent', 'c_mira', 'j_shared')).rejects.toThrow();
});

it('denies direct parent reads of raw published answer keys and the server-only copy registry', async () => {
  const firestoreHost = process.env['FIRESTORE_EMULATOR_HOST'],
    authHost = process.env['FIREBASE_AUTH_EMULATOR_HOST'];
  if (!firestoreHost || !authHost)
    throw new Error('Isolated Auth and Firestore emulators required');
  const custom = await adminAuth().createCustomToken('parent');
  const signed = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  const { idToken } = (await signed.json()) as { idToken: string };
  expect(idToken).toBeTruthy();
  await db().doc('users/parent/children/c_mira/catalogWorlds/j_shared').set({ worldId: 'w_owned' });
  const base = `http://${firestoreHost}/v1/projects/demo-just-imagine/databases/(default)/documents/`,
    headers = { authorization: `Bearer ${idToken}` };
  expect((await fetch(base + 'users/parent/children/c_mira', { headers })).status).toBe(200);
  expect((await fetch(base + 'catalog/j_shared', { headers })).status).toBe(403);
  expect(
    (await fetch(base + 'users/parent/children/c_mira/catalogWorlds/j_shared', { headers })).status,
  ).toBe(403);
});
