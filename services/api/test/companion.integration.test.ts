import { beforeEach, it, expect, vi } from 'vitest';
import sharp from 'sharp';
import { db, writeDoc } from '@just-imagine/server-core';
import { paths, UserDocSchema } from '@just-imagine/protocol';
import { FirestoreCompanionService } from '../src/companion';
import { FirestoreApiStore } from '../src/store';
const store = new FirestoreApiStore();
let childId: string, photo: string, image: Buffer;
const input = () => ({
  name: 'Pip',
  characterId: 'bhombol' as const,
  consent: true as const,
  mimeType: 'image/png' as const,
  photo,
});
beforeEach(async () => {
  await fetch(
    `http://${process.env['FIRESTORE_EMULATOR_HOST']}/emulator/v1/projects/demo-just-imagine/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await writeDoc(paths.user('parent'), UserDocSchema, {
    email: 'p@example.test',
    displayName: 'Parent',
    consentAt: 1,
    plan: 'family',
    stripeCustomerId: null,
    createdAt: 1,
  });
  childId = (
    await store.createChild('parent', { firstName: 'Ari', ageBand: '8-10', avatar: 'fox' })
  ).id;
  photo = (
    await sharp({ create: { width: 20, height: 20, channels: 3, background: '#f7d76e' } })
      .png()
      .toBuffer()
  ).toString('base64');
  image = await sharp(Buffer.from(photo, 'base64')).webp().toBuffer();
});
it('stores only generated artwork under the owned profile and removes it on deletion', async () => {
  const generator = { generate: vi.fn(async () => image) },
    service = new FirestoreCompanionService(generator);
  await expect(service.create('foreign', childId, input())).rejects.toMatchObject({ status: 404 });
  expect(generator.generate).not.toHaveBeenCalled();
  const child = await service.create('parent', childId, input());
  expect(child.companion).toMatchObject({
    kind: 'chibi',
    name: 'Pip',
    image: `data:image/webp;base64,${image.toString('base64')}`,
  });
  expect(
    JSON.stringify((await db().doc(paths.child('parent', childId)).get()).data()),
  ).not.toContain(photo);
  await store.deleteChild('parent', childId);
  expect((await db().doc(paths.child('parent', childId)).get()).exists).toBe(false);
  expect(
    (
      await db()
        .doc(`${paths.child('parent', childId)}/companionRequests/current`)
        .get()
    ).exists,
  ).toBe(false);
});
it('prevents duplicate paid work and refuses stale publication after ready-made selection', async () => {
  let resolve!: (image: Buffer) => void;
  const generator = {
      generate: vi.fn(
        () =>
          new Promise<Buffer>((r) => {
            resolve = r;
          }),
      ),
    },
    service = new FirestoreCompanionService(generator);
  const drawing = service.create('parent', childId, input());
  await vi.waitFor(() => expect(generator.generate).toHaveBeenCalledOnce());
  await expect(service.create('parent', childId, input())).rejects.toMatchObject({ status: 409 });
  await store.updateChild('parent', childId, {
    companion: { kind: 'preset', characterId: 'mishti', name: 'Mimi' },
  });
  const rejected = expect(drawing).rejects.toMatchObject({ status: 409 });
  resolve(image);
  await rejected;
  expect((await store.me('parent')).children[0]?.companion?.name).toBe('Mimi');
});
it('does not recreate a child or photo request after deletion during generation', async () => {
  let resolve!: (image: Buffer) => void;
  const generator = {
      generate: vi.fn(
        () =>
          new Promise<Buffer>((r) => {
            resolve = r;
          }),
      ),
    },
    service = new FirestoreCompanionService(generator);
  const drawing = service.create('parent', childId, input());
  await vi.waitFor(() => expect(generator.generate).toHaveBeenCalledOnce());
  await store.deleteChild('parent', childId);
  const rejected = expect(drawing).rejects.toMatchObject({ status: 409 });
  resolve(image);
  await rejected;
  expect((await db().doc(paths.child('parent', childId)).get()).exists).toBe(false);
  expect(
    (
      await db()
        .doc(`${paths.child('parent', childId)}/companionRequests/current`)
        .get()
    ).exists,
  ).toBe(false);
});
it('bounds generation attempts even when the model fails', async () => {
  const generator = {
      generate: vi.fn(async () => {
        throw new Error('provider secret');
      }),
    },
    service = new FirestoreCompanionService(generator);
  for (let n = 0; n < 3; n++)
    await expect(service.create('parent', childId, input())).rejects.toMatchObject({ status: 503 });
  await expect(service.create('parent', childId, input())).rejects.toMatchObject({ status: 429 });
  expect(generator.generate).toHaveBeenCalledTimes(3);
});
