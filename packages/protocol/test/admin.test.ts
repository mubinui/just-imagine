import { describe, it, expect } from 'vitest';
import {
  ADMIN_ROUTES,
  ADMIN_COST_PER_UNIT_USD,
  AdminAuditDocSchema,
  AdminFamilyDetailSchema,
  AdminFamilyListQuerySchema,
  AdminFlagsDocSchema,
  AdminDeleteFamilyBodySchema,
  AdminKillSwitchBodySchema,
  AdminModerationEntrySchema,
  AdminOverviewResponseSchema,
  AdminPlanBodySchema,
  AdminSuspensionBodySchema,
  AdminSystemStatusSchema,
  AdminWorldVisibilityBodySchema,
  ACCOUNT_SUSPENDED,
  adminPaths,
  deletionConfirmationFor,
  estimateCostUsd,
} from '../src/index';

const window = { today: 1, last7: 3, last30: 9 };
const overview = {
  generatedAt: 1,
  families: 2,
  children: 3,
  childrenByAgeBand: { '6-7': 1, '8-10': 2, '11-13': 0 },
  subscriptions: { family: 1, comped: 1, free: 0 },
  sessions: window,
  voiceMinutes: window,
  worldsBuilt: window,
  images: window,
  moderationBlocks: window,
  builder: { finished30: 10, failed30: 1, failureRate: 0.1 },
  daily: [
    {
      date: '20261016',
      sessions: 1,
      voiceMinutes: 2,
      worlds: 1,
      images: 3,
      estimatedCostUsd: 0.5,
    },
  ],
  estimatedCostUsd: { today: 0.5, last7: 1, last30: 2 },
};

describe('admin routes', () => {
  it('lives entirely under /v1/admin', () => {
    expect(Object.keys(ADMIN_ROUTES).length).toBeGreaterThanOrEqual(12);
    for (const r of Object.values(ADMIN_ROUTES)) expect(r.path.startsWith('/v1/admin/')).toBe(true);
  });
  it('names a route for every page and action', () => {
    expect(Object.keys(ADMIN_ROUTES).sort()).toEqual([
      'appearance',
      'audit',
      'content',
      'deleteFamily',
      'families',
      'family',
      'killSwitch',
      'overview',
      'resetQuota',
      'safety',
      'setAppearance',
      'setPlan',
      'setSuspension',
      'setWorldVisibility',
      'system',
    ]);
  });
});

describe('admin reads', () => {
  it('accepts a complete overview and rejects a missing window', () => {
    expect(AdminOverviewResponseSchema.safeParse(overview).success).toBe(true);
    expect(
      AdminOverviewResponseSchema.safeParse({ ...overview, sessions: { today: 1 } }).success,
    ).toBe(false);
  });
  it('pages the family list with a bounded size and trims the email search', () => {
    expect(AdminFamilyListQuerySchema.parse({})).toEqual({ limit: 25 });
    expect(AdminFamilyListQuerySchema.parse({ q: '  Ana@Example.test ', limit: '10' })).toEqual({
      q: 'ana@example.test',
      limit: 10,
    });
    expect(AdminFamilyListQuerySchema.safeParse({ limit: '500' }).success).toBe(false);
  });
  it('never carries child names in a family detail', () => {
    const detail = {
      uid: 'u1',
      email: 'p@example.test',
      displayName: 'Parent',
      plan: 'family',
      compPlan: 'family',
      subscriptionStatus: null,
      suspended: false,
      suspendedReason: null,
      childrenCount: 1,
      createdAt: 1,
      deletionPending: false,
      hasBillingAccount: false,
      children: [{ ageBand: '8-10', tier: 'playground', createdAt: 1, firstName: 'Mira' }],
      limits: {
        children: 4,
        voiceSecondsPerDay: 3600,
        worldsPerDay: 20,
        imagesPerWorld: 16,
        savedWorlds: 200,
      },
      usageToday: { voiceSeconds: 1, worlds: 0, images: 0 },
      usage7: { voiceSeconds: 1, worlds: 0, images: 0 },
      worlds: 2,
      sessions30: 3,
    };
    const parsed = AdminFamilyDetailSchema.parse(detail);
    expect(JSON.stringify(parsed)).not.toContain('Mira');
  });
  it('keeps moderation entries free of transcript text', () => {
    const entry = AdminModerationEntrySchema.parse({
      id: 's1',
      sessionId: 's1',
      category: 'block',
      source: 'session',
      at: 5,
      text: 'something a child said',
    });
    expect(entry).not.toHaveProperty('text');
  });
  it('describes system status with the kill switch and service health', () => {
    expect(
      AdminSystemStatusSchema.safeParse({
        killSwitch: { on: false, reason: null, updatedAt: null, updatedBy: null },
        services: [{ name: 'api', status: 'ok', version: '0.1.0', checkedAt: 1 }],
        models: [{ role: 'voice', id: 'gemini-3.8-live' }],
        versions: { api: '0.1.0', revision: null, commit: null },
      }).success,
    ).toBe(true);
  });
});

describe('admin writes', () => {
  it('requires a reason on every write', () => {
    expect(AdminPlanBodySchema.safeParse({ plan: 'family' }).success).toBe(false);
    expect(AdminPlanBodySchema.safeParse({ plan: 'family', reason: 'Support comp' }).success).toBe(
      true,
    );
    expect(AdminSuspensionBodySchema.safeParse({ suspended: true, reason: ' ' }).success).toBe(
      false,
    );
    expect(AdminKillSwitchBodySchema.safeParse({ on: true, reason: 'Vertex outage' }).success).toBe(
      true,
    );
    expect(
      AdminWorldVisibilityBodySchema.safeParse({ hidden: true, reason: 'Review' }).success,
    ).toBe(true);
  });
  it('builds the typed deletion confirmation from the parent email', () => {
    expect(deletionConfirmationFor('Ana@Example.test')).toBe('delete ana@example.test');
    expect(
      AdminDeleteFamilyBodySchema.safeParse({
        confirmation: 'delete ana@example.test',
        reason: 'Parent request',
      }).success,
    ).toBe(true);
  });
});

describe('admin storage', () => {
  it('keeps flags and audit under their own collections', () => {
    expect(adminPaths.flags('u1')).toBe('adminFlags/u1');
    expect(adminPaths.audit('a1')).toBe('adminAudit/a1');
    expect(() => adminPaths.flags('a/b')).toThrow();
  });
  it('defaults flags to an active, uncomped account', () => {
    expect(AdminFlagsDocSchema.parse({ updatedAt: 1 })).toEqual({
      suspended: false,
      suspendedReason: null,
      compPlan: null,
      updatedAt: 1,
    });
  });
  it('records audit before and after as flat scalar maps', () => {
    const audit = {
      actorUid: 'admin',
      actorEmail: 'ops@example.test',
      action: 'plan.override',
      target: { kind: 'family', id: 'u1' },
      before: { plan: 'free', compPlan: null },
      after: { plan: 'family', compPlan: 'family' },
      reason: 'Support comp',
      at: 1,
    };
    expect(AdminAuditDocSchema.safeParse(audit).success).toBe(true);
    expect(AdminAuditDocSchema.safeParse({ ...audit, before: { nested: { a: 1 } } }).success).toBe(
      false,
    );
  });
  it('exports the suspension error code', () => {
    expect(ACCOUNT_SUSPENDED).toBe('ACCOUNT_SUSPENDED');
  });
});

describe('cost estimate', () => {
  it('multiplies usage by the documented per-unit table', () => {
    const cost = estimateCostUsd({ voiceSeconds: 600, worlds: 2, images: 10 });
    expect(cost).toBeCloseTo(
      10 * ADMIN_COST_PER_UNIT_USD.voiceMinute +
        2 * ADMIN_COST_PER_UNIT_USD.worldBuild +
        10 * ADMIN_COST_PER_UNIT_USD.image,
      6,
    );
  });
});
