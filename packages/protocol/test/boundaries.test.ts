import { describe, expect, it } from 'vitest';
import { paths, UsageDailyDocSchema, yyyymmdd } from '../src/firestore';
import { BuilderJobSchema } from '../src/jobs';
import { CheckoutBodySchema, CreateChildBodySchema, UsageTodayResponseSchema } from '../src/rest';
import { ClientMessageSchema, ServerMessageSchema } from '../src/ws';

describe('WebSocket boundaries', () => {
  it.each(['tap', 'drag', 'flick'])('requires an entity for a %s interaction', (kind) => {
    expect(ClientMessageSchema.safeParse({ type: 'interaction', kind }).success).toBe(false);
  });

  it('requires a dial and value for a dial interaction', () => {
    expect(ClientMessageSchema.safeParse({ type: 'interaction', kind: 'dial' }).success).toBe(
      false,
    );
    expect(
      ClientMessageSchema.safeParse({ type: 'interaction', kind: 'dial', dial: 'gravity' }).success,
    ).toBe(false);
  });

  it('rejects scene content attached to a control message', () => {
    expect(ClientMessageSchema.safeParse({ type: 'end', doc: { entities: [] } }).success).toBe(
      false,
    );
    expect(
      ServerMessageSchema.safeParse({ type: 'interrupted', doc: { entities: [] } }).success,
    ).toBe(false);
  });

  it('rejects negative remaining quota and empty session ids', () => {
    expect(ServerMessageSchema.safeParse({ type: 'quota', voiceSecondsLeft: -1 }).success).toBe(
      false,
    );
    expect(
      ServerMessageSchema.safeParse({ type: 'ready', sessionId: '', characterId: 'bhombol' })
        .success,
    ).toBe(false);
  });

  it('allows only guides to be summoned', () => {
    expect(ServerMessageSchema.safeParse({ type: 'summon', characterId: 'mishti' }).success).toBe(
      false,
    );
    expect(ServerMessageSchema.safeParse({ type: 'summon', characterId: 'pori' }).success).toBe(
      true,
    );
  });

  it('requires a target for grow and shrink spells', () => {
    expect(ServerMessageSchema.safeParse({ type: 'spell', spell: 'grow' }).success).toBe(false);
    expect(ServerMessageSchema.safeParse({ type: 'spell', spell: 'shrink' }).success).toBe(false);
    expect(ServerMessageSchema.safeParse({ type: 'spell', spell: 'restore' }).success).toBe(true);
  });

  it('uses scene identifiers for variables and rejects non-finite values', () => {
    expect(
      ClientMessageSchema.safeParse({ type: 'variable', name: 'Launch Speed', value: 2 }).success,
    ).toBe(false);
    expect(
      ServerMessageSchema.safeParse({ type: 'variable', name: 'gravity', value: Infinity }).success,
    ).toBe(false);
  });
});

describe('document paths and daily usage', () => {
  it.each(['', '.', '..', 'u1/children/c2'])('rejects invalid path segment %s', (uid) => {
    expect(() => paths.user(uid)).toThrow();
    expect(() => paths.child('u1', uid)).toThrow();
  });

  it.each(['20260230', '20261301', '20261000'])('rejects invalid calendar date %s', (date) => {
    const usage = { uid: 'u1', date, voiceSeconds: 0, worlds: 0, images: 0 };
    expect(UsageDailyDocSchema.safeParse(usage).success).toBe(false);
    expect(() => paths.usageDaily('u1', date)).toThrow();
  });

  it('accepts leap days and refuses invalid Date objects', () => {
    expect(paths.usageDaily('u1', '20280229')).toBe('usageDaily/u1_20280229');
    expect(() => yyyymmdd(new Date('invalid'))).toThrow();
  });

  it('requires nonnegative integer version numbers', () => {
    expect(() => paths.worldVersion('w1', -1)).toThrow();
    expect(() => paths.worldVersion('w1', 1.5)).toThrow();
  });
});

describe('REST and builder boundaries', () => {
  it('rejects whitespace-only names and extra billing fields', () => {
    expect(
      CreateChildBodySchema.safeParse({ firstName: '   ', avatar: 'owl', ageBand: '8-10' }).success,
    ).toBe(false);
    expect(CheckoutBodySchema.safeParse({ tier: 'family', price: 1 }).success).toBe(false);
  });

  it('rejects negative plan limits', () => {
    const usage = {
      plan: 'free',
      limits: {
        children: -1,
        voiceSecondsPerDay: 900,
        worldsPerDay: 3,
        imagesPerWorld: 8,
        savedWorlds: 10,
      },
      used: { voiceSeconds: 0, worlds: 0, images: 0 },
    };
    expect(UsageTodayResponseSchema.safeParse(usage).success).toBe(false);
  });

  it('rejects lab kinds on playground jobs', () => {
    const job = {
      kind: 'build',
      jobId: 'j1',
      worldId: 'w1',
      uid: 'u1',
      childId: 'c1',
      sessionId: 's1',
      plan: 'free',
      description: 'a bouncing ball',
      concepts: [],
      ageBand: '6-7',
      tier: 'playground',
      labKind: 'projectile',
      styleVersion: 's1',
      promptVersion: 'p1',
      conversationSummary: '',
    };
    expect(BuilderJobSchema.safeParse(job).success).toBe(false);
    expect(BuilderJobSchema.safeParse({ ...job, tier: 'lab' }).success).toBe(true);
  });
});
