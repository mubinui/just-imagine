import { describe, it, expect } from 'vitest';
import {
  ChildDocSchema,
  SessionDocSchema,
  UsageDailyDocSchema,
  WorldDocSchema,
  paths,
  yyyymmdd,
} from '../src/firestore';

describe('paths', () => {
  it('builds the collection paths from the spec', () => {
    expect(paths.user('u1')).toBe('users/u1');
    expect(paths.child('u1', 'c1')).toBe('users/u1/children/c1');
    expect(paths.discovery('u1', 'c1', 'bounce')).toBe('users/u1/children/c1/discoveries/bounce');
    expect(paths.world('w1')).toBe('worlds/w1');
    expect(paths.worldVersion('w1', 3)).toBe('worlds/w1/versions/3');
    expect(paths.session('s1')).toBe('sessions/s1');
    expect(paths.usageDaily('u1', '20261015')).toBe('usageDaily/u1_20261015');
    expect(paths.subscription('u1')).toBe('subscriptions/u1');
    expect(paths.assetCache('abc')).toBe('assetCache/abc');
    expect(paths.runtimeConfig()).toBe('config/runtime');
  });
});

describe('yyyymmdd', () => {
  it('formats in UTC', () => {
    expect(yyyymmdd(new Date('2026-10-15T23:59:59Z'))).toBe('20261015');
    expect(yyyymmdd(new Date('2026-10-15T00:00:00+06:00'))).toBe('20261014');
  });
});

describe('document schemas', () => {
  it('accepts a child document and rejects an age band outside the product', () => {
    const child = {
      firstName: 'Ayaan',
      avatar: 'fox',
      ageBand: '6-7',
      tier: 'playground',
      labsUnlocked: false,
      captions: false,
      sessionTargetMinutes: 8,
      loopsCompleted: 0,
      createdAt: 1,
    };
    expect(ChildDocSchema.safeParse(child).success).toBe(true);
    expect(ChildDocSchema.safeParse({ ...child, ageBand: '14-16' }).success).toBe(false);
    expect(ChildDocSchema.safeParse({ ...child, ageBand: '11-13', tier: 'lab' }).success).toBe(
      true,
    );
  });
  it('requires integer epoch timestamps', () => {
    const usage = { uid: 'u1', date: '20261015', voiceSeconds: 10, worlds: 1, images: 3 };
    expect(UsageDailyDocSchema.safeParse(usage).success).toBe(true);
    const session = {
      uid: 'u1',
      childId: 'c1',
      characterIds: ['bhombol'],
      worldIds: [],
      startedAt: '2026-10-15',
      endedAt: null,
      voiceSeconds: 0,
      turns: 0,
      beats: 0,
      summary: null,
      discoveries: [],
      predictions: [],
      endReason: null,
      active: true,
    };
    expect(SessionDocSchema.safeParse(session).success).toBe(false);
  });
  it('requires a world document to embed a SceneDoc', () => {
    expect(
      WorldDocSchema.safeParse({
        ownerUid: 'u1',
        childId: 'c1',
        title: 't',
        status: 'building',
        doc: {},
        schemaVersion: 1,
        promptVersion: 'p',
        styleVersion: 's',
        assets: {},
        concepts: [],
        thumbnailUrl: null,
        jobId: 'j',
        createdAt: 1,
        updatedAt: 1,
      }).success,
    ).toBe(false);
  });
});
