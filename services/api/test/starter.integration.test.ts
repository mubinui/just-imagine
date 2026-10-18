import { beforeEach, describe, expect, it } from 'vitest';
import { db, writeDoc } from '@just-imagine/server-core';
import { StoryDocSchema, UserDocSchema, WorldDocSchema, paths } from '@just-imagine/protocol';
import { FirestoreApiStore } from '../src/store';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
process.env['WEB_URL'] = 'https://app.example';

const store = new FirestoreApiStore();
beforeEach(async () => {
  await writeDoc(paths.user('starter_parent'), UserDocSchema, {
    email: 'starter@example.test',
    displayName: 'Parent',
    consentAt: 1,
    plan: 'family',
    stripeCustomerId: null,
    createdAt: 1,
  });
});
const worldsOf = async (childId: string) =>
  (await db().collection('worlds').where('childId', '==', childId).get()).docs.map((d) =>
    WorldDocSchema.parse(d.data()),
  );
const storiesOf = async (childId: string) =>
  (await db().collection('stories').where('childId', '==', childId).get()).docs.map((d) =>
    StoryDocSchema.parse(d.data()),
  );

describe('starter stories and games', () => {
  it('give every new explorer three ready worlds, including a game', async () => {
    const child = await store.createChild('starter_parent', {
      firstName: 'Ari',
      avatar: 'owl',
      ageBand: '8-10',
    });
    const worlds = await worldsOf(child.id);
    expect(worlds).toHaveLength(3);
    for (const world of worlds) {
      expect(world).toMatchObject({
        ownerUid: 'starter_parent',
        childId: child.id,
        status: 'ready',
      });
      expect(world.doc.worldId).not.toBe('');
    }
    expect(worlds.some((w) => w.doc.game)).toBe(true);
    expect(new Set(worlds.map((w) => w.doc.worldId)).size).toBe(3);
  });

  it('give three illustrated stories, ready to read, in the explorer’s language', async () => {
    const child = await store.createChild('starter_parent', {
      firstName: 'Mira',
      avatar: 'owl',
      ageBand: '6-7',
      language: 'bn',
    });
    const stories = await storiesOf(child.id);
    expect(stories).toHaveLength(3);
    for (const story of stories) {
      expect(story).toMatchObject({ status: 'ready', language: 'bn', ageBand: '6-7' });
      expect(story.manuscript?.title).toMatch(/[ঀ-৿]/);
      for (const scene of story.manuscript!.scenes)
        expect(story.images[scene.id]).toMatchObject({ status: 'ready' });
      expect(Object.values(story.images)[0]?.url).toMatch(/^https:\/\/app\.example\/learn\//);
    }
  });

  it('do not use up the day’s creation allowance', async () => {
    const child = await store.createChild('starter_parent', {
      firstName: 'Nila',
      avatar: 'owl',
      ageBand: '8-10',
    });
    const usage = await store.usageToday('starter_parent');
    expect(usage.used.worlds).toBe(0);
    expect(child.id).toBeTruthy();
  });
});
