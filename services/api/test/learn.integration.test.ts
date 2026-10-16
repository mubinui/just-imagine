import { describe, it, expect, beforeEach } from 'vitest';
import { db, writeDoc } from '@just-imagine/server-core';
import {
  LearnSummaryResponseSchema,
  UserDocSchema,
  learnPaths,
  paths,
} from '@just-imagine/protocol';
import { createApi } from '../src/app';
import { FirestoreLearnStore } from '../src/learn';
import type { ApiStore } from '../src/store';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';

const user = {
  email: 'parent@example.test',
  displayName: 'Parent',
  consentAt: 1,
  plan: 'free',
  stripeCustomerId: null,
  createdAt: 1,
};
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
const api = () =>
  createApi({
    store: {} as ApiStore,
    learn: new FirestoreLearnStore(),
    verifyToken: async (token) => {
      if (!token.startsWith('valid-')) throw new Error('bad token');
      return { uid: token.slice(6) };
    },
    origins: [],
  });

beforeEach(async () => {
  const host = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!host) throw new Error('Run integration tests under Firestore emulator');
  const response = await fetch(
    `http://${host}/emulator/v1/projects/demo-just-imagine/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!response.ok) throw new Error('Emulator clear failed');
  await writeDoc(paths.user('parent'), UserDocSchema, user);
  await writeDoc(paths.user('other'), UserDocSchema, user);
});

describe('Learning Worlds summary', () => {
  it('reads points, pets and pack progress for the parent and the child area', async () => {
    await db()
      .doc(paths.child('parent', 'c_mira'))
      .set({ ...child, points: 12, pets: ['tuktuk'] });
    await db()
      .doc(learnPaths.progress('parent', 'c_mira', 'space'))
      .set({ packId: 'space', challengesDone: ['ch_saturn_bath'], updatedAt: 5 });
    const app = api();
    const res = await app.inject({
      url: '/v1/children/c_mira/learn',
      headers: { authorization: 'Bearer valid-parent' },
    });
    expect(res.statusCode).toBe(200);
    expect(LearnSummaryResponseSchema.parse(res.json())).toEqual({
      points: 12,
      pets: ['tuktuk'],
      progress: [{ packId: 'space', challengesDone: ['ch_saturn_bath'], updatedAt: 5 }],
    });
    await app.close();
  });
  it('reports zero and nothing for a profile from before Learning Worlds', async () => {
    await db().doc(paths.child('parent', 'c_old')).set(child);
    const app = api();
    const res = await app.inject({
      url: '/v1/children/c_old/learn',
      headers: { authorization: 'Bearer valid-parent' },
    });
    expect(res.json()).toEqual({ points: 0, pets: [], progress: [] });
    await app.close();
  });
  it('never shows one family another family child and requires sign-in', async () => {
    await db()
      .doc(paths.child('parent', 'c_mira'))
      .set({ ...child, points: 3 });
    const app = api();
    expect((await app.inject({ url: '/v1/children/c_mira/learn' })).statusCode).toBe(401);
    const res = await app.inject({
      url: '/v1/children/c_mira/learn',
      headers: { authorization: 'Bearer valid-other' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.body).not.toContain('Mira');
    await app.close();
  });
  it('hides a profile that is being deleted', async () => {
    await db().doc(paths.child('parent', 'c_gone')).set(child);
    await db().doc('users/parent/deletionLocks/c_gone').set({ requestedAt: 1 });
    const app = api();
    const res = await app.inject({
      url: '/v1/children/c_gone/learn',
      headers: { authorization: 'Bearer valid-parent' },
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
  it('offers no way to write points from the browser', async () => {
    await db().doc(paths.child('parent', 'c_mira')).set(child);
    const app = api();
    for (const method of ['POST', 'PATCH', 'PUT'] as const) {
      const res = await app.inject({
        method,
        url: '/v1/children/c_mira/learn',
        headers: { authorization: 'Bearer valid-parent' },
        payload: { points: 999 },
      });
      expect(res.statusCode).toBe(404);
    }
    expect((await db().doc(paths.child('parent', 'c_mira')).get()).data()).not.toHaveProperty(
      'points',
    );
    await app.close();
  });
});

describe('adventure bookmarks', () => {
  it('merges concurrent chapter completions without changing points or pets', async () => {
    await db()
      .doc(paths.child('parent', 'c_mira'))
      .set({ ...child, points: 7, pets: [] });
    const app = api(),
      headers = { authorization: 'Bearer valid-parent' };
    const responses = await Promise.all(
      ['heart', 'lungs', 'brain'].map((chapterId) =>
        app.inject({
          method: 'POST',
          url: '/v1/children/c_mira/adventures/body',
          headers,
          payload: { chapterId },
        }),
      ),
    );
    expect(responses.map((r) => r.statusCode)).toEqual([200, 200, 200]);
    const book = (await app.inject({ url: '/v1/children/c_mira/adventures', headers })).json();
    expect(book.progress[0].chaptersDone.sort()).toEqual(['brain', 'heart', 'lungs']);
    const summary = (await app.inject({ url: '/v1/children/c_mira/learn', headers })).json();
    expect(summary.points).toBe(7);
    expect(summary.pets).toEqual([]);
    const replay = await app.inject({
      method: 'POST',
      url: '/v1/children/c_mira/adventures/body',
      headers,
      payload: { chapterId: 'heart' },
    });
    expect(replay.json().chaptersDone).toHaveLength(3);
    await app.close();
  });
  it('rejects foreign children, unknown chapters, reward fields and deletion-locked writes', async () => {
    await db().doc(paths.child('parent', 'c_mira')).set(child);
    const app = api(),
      url = '/v1/children/c_mira/adventures/body',
      headers = { authorization: 'Bearer valid-parent' };
    expect(
      (
        await app.inject({
          method: 'POST',
          url,
          headers: { authorization: 'Bearer valid-other' },
          payload: { chapterId: 'heart' },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (await app.inject({ method: 'POST', url, headers, payload: { chapterId: 'saturn' } }))
        .statusCode,
    ).toBe(400);
    expect(
      (
        await app.inject({
          method: 'POST',
          url,
          headers,
          payload: { chapterId: 'heart', points: 999 },
        })
      ).statusCode,
    ).toBe(400);
    await db().doc('users/parent/deletionLocks/c_mira').set({ createdAt: 1 });
    expect(
      (await app.inject({ method: 'POST', url, headers, payload: { chapterId: 'heart' } }))
        .statusCode,
    ).toBe(404);
    expect((await app.inject({ url: '/v1/children/c_mira/adventures', headers })).statusCode).toBe(
      404,
    );
    await app.close();
  });
});
