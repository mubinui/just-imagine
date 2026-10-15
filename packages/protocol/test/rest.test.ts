import { describe, it, expect } from 'vitest';
import {
  ROUTES,
  CreateChildBodySchema,
  UpdateChildBodySchema,
  UsageTodayResponseSchema,
  ApiErrorSchema,
} from '../src/rest';

describe('ROUTES', () => {
  it('declares every endpoint from the spec under /v1', () => {
    const keys = Object.keys(ROUTES).sort();
    expect(keys).toEqual([
      'checkout',
      'createChild',
      'deleteAccountData',
      'deleteChild',
      'deleteWorld',
      'getWorld',
      'listDiscoveries',
      'listSessions',
      'listWorlds',
      'me',
      'portal',
      'stripeWebhook',
      'updateChild',
      'usageToday',
    ]);
    for (const r of Object.values(ROUTES)) expect(r.path.startsWith('/v1/')).toBe(true);
  });
});

describe('bodies', () => {
  it('accepts a child creation body with only the three allowed fields', () => {
    expect(
      CreateChildBodySchema.safeParse({ firstName: 'Mira', avatar: 'owl', ageBand: '8-10' })
        .success,
    ).toBe(true);
    expect(
      CreateChildBodySchema.safeParse({
        firstName: 'Mira',
        avatar: 'owl',
        ageBand: '8-10',
        loopsCompleted: 9,
      }).success,
    ).toBe(false);
  });
  it('allows partial updates including the session target', () => {
    expect(UpdateChildBodySchema.safeParse({ sessionTargetMinutes: 12 }).success).toBe(true);
    expect(UpdateChildBodySchema.safeParse({ sessionTargetMinutes: 45 }).success).toBe(false);
  });
});

describe('responses', () => {
  it('shapes usage today with plan limits and used counters', () => {
    const r = UsageTodayResponseSchema.safeParse({
      plan: 'free',
      limits: {
        children: 1,
        voiceSecondsPerDay: 900,
        worldsPerDay: 3,
        imagesPerWorld: 8,
        savedWorlds: 10,
      },
      used: { voiceSeconds: 10, worlds: 1, images: 2 },
    });
    expect(r.success).toBe(true);
  });
  it('shapes errors as { error: { code, message } }', () => {
    expect(
      ApiErrorSchema.safeParse({ error: { code: 'NOT_FOUND', message: 'no such child' } }).success,
    ).toBe(true);
    expect(ApiErrorSchema.safeParse({ message: 'x' }).success).toBe(false);
  });
});
