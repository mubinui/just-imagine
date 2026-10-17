import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/firebase';
import { ContentEditions } from '../src/content-editions';
import { paths, type ContentText } from '@just-imagine/protocol';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
const source = {
  kind: 'world' as const,
  path: 'worlds/w_language',
  uid: 'parent',
  childId: 'c_one',
};
const original = {
  ownerUid: 'parent',
  childId: 'c_one',
  title: 'A garden',
  doc: {
    title: 'A garden',
    narration: { intro: 'Let us plant.' },
    game: { script: { source: 'game.hud({score:4,label:"Find seeds"})', hash: 'unchanged' } },
    environment: { gravity: { y: 9.81 } },
  },
  progress: { points: 3 },
};
beforeEach(async () => {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!host || host.endsWith(':8080')) throw new Error('Use the isolated test emulator');
  await fetch(
    `http://${host}/emulator/v1/projects/demo-just-imagine/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  await db().doc(paths.user('parent')).set({ consentAt: 1 });
  await db().doc(paths.child('parent', 'c_one')).set({ firstName: 'Ari', language: 'bn' });
  await db().doc(source.path).set(original);
});
describe('owned cached language editions', () => {
  it('deduplicates concurrent requests, preserves the canonical source and caches across service instances', async () => {
    const translate = vi.fn(async (entries: ContentText[]) => entries.map(() => 'বাগান'));
    const service = new ContentEditions(translate);
    const [a, b] = await Promise.all([
      service.apply(source, 'bn', original),
      service.apply(source, 'bn', original),
    ]);
    expect(translate).toHaveBeenCalledTimes(1);
    expect(a).toEqual(b);
    expect(a.title).toBe('বাগান');
    expect(a.doc.game).toEqual(original.doc.game);
    expect(a.progress).toEqual(original.progress);
    expect((await db().doc(source.path).get()).data()).toEqual(original);
    expect(await new ContentEditions().cached(source, 'bn', original)).toEqual(a);
  });
  it('invalidates changed prose while allowing progress-only changes', async () => {
    const translate = vi.fn(async (entries: ContentText[]) => entries.map(() => 'বাগান'));
    const service = new ContentEditions(translate);
    await service.apply(source, 'bn', original);
    const progressed = { ...original, progress: { points: 9 } };
    await db().doc(source.path).set(progressed);
    expect((await service.cached(source, 'bn', progressed))?.progress.points).toBe(9);
    const edited = { ...progressed, title: 'A new garden' };
    await db().doc(source.path).set(edited);
    expect(await service.cached(source, 'bn', edited)).toBeNull();
    await expect(service.cached(source, 'bn', original)).rejects.toThrow('changed');
    await service.apply(source, 'bn', edited);
    expect(translate).toHaveBeenCalledTimes(2);
  });
  it('refuses cross-family access and deletion fences before returning cached text', async () => {
    const service = new ContentEditions(async (entries) => entries.map(() => 'বাগান'));
    await service.apply(source, 'bn', original);
    await expect(service.cached({ ...source, uid: 'other' }, 'bn', original)).rejects.toThrow();
    await db().doc('users/parent/deletionLocks/c_one').set({ at: 1 });
    await expect(service.cached(source, 'bn', original)).rejects.toThrow();
  });
  it('does not recreate translations after deletion while model work was in flight', async () => {
    let finish!: (texts: string[]) => void;
    const translate = vi.fn(
      () =>
        new Promise<string[]>((resolve) => {
          finish = resolve;
        }),
    );
    const service = new ContentEditions(translate),
      pending = service.apply(source, 'bn', original);
    const rejected = expect(pending).rejects.toThrow();
    await vi.waitFor(() => expect(translate).toHaveBeenCalledTimes(1));
    await db().doc('worldDeletionLocks/w_language').set({ at: 1 });
    await db().recursiveDelete(db().doc(source.path));
    finish(['বাগান', 'বাগান', 'চলো গাছ লাগাই।']);
    await rejected;
    expect(
      (
        await db()
          .collection(source.path + '/languageEditions')
          .get()
      ).empty,
    ).toBe(true);
  });
  it('caches runtime display phrases without modifying script or scoring', async () => {
    const translate = vi.fn(async (entries: ContentText[]) =>
      entries.map((e) => e.text.replace('Find', 'খুঁজে নাও').replace('seeds', 'টি বীজ')),
    );
    const service = new ContentEditions(translate);
    expect(await service.runtime(source, 'bn', ['Find {n0} seeds'])).toEqual([
      'খুঁজে নাও {n0} টি বীজ',
    ]);
    await service.runtime(source, 'bn', ['Find {n0} seeds']);
    expect(translate).toHaveBeenCalledTimes(1);
    expect((await db().doc(source.path).get()).data()?.['doc']).toEqual(original.doc);
  });
});
