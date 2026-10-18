import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { adminAuth, db, isKillSwitchOn, verifyIdToken } from '@just-imagine/server-core';
import {
  AdminAuditDocSchema,
  AdminContentResponseSchema,
  AdminFamilyDetailSchema,
  AdminFamilyListResponseSchema,
  AdminOverviewResponseSchema,
  AdminSafetyResponseSchema,
  AdminSystemStatusSchema,
  AdminAuditResponseSchema,
  ADMIN_ROUTES,
  paths,
  yyyymmdd,
} from '@just-imagine/protocol';
import { createApi } from '../src/app';
import { FirestoreApiStore } from '../src/store';

process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
const project = 'demo-just-imagine';
const app = createApi({
  store: new FirestoreApiStore(),
  verifyToken: verifyIdToken,
  origins: [],
});
afterAll(() => app.close());

async function tokenFor(uid: string, email: string, claims?: Record<string, unknown>) {
  try {
    await adminAuth().createUser({ uid, email });
  } catch {
    /* already created in this run */
  }
  await adminAuth().setCustomUserClaims(uid, claims ?? null);
  const custom = await adminAuth().createCustomToken(uid);
  const res = await fetch(
    `http://${process.env['FIREBASE_AUTH_EMULATOR_HOST']}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  const body = (await res.json()) as { idToken?: string };
  if (!body.idToken) throw new Error('no id token');
  return body.idToken;
}

const now = Date.now();
const today = yyyymmdd(new Date(now));
const user = (email: string, plan: 'free' | 'family' = 'free') => ({
  email,
  displayName: 'Parent',
  consentAt: 1,
  plan,
  stripeCustomerId: null,
  createdAt: 1,
});
const child = (firstName: string, ageBand: string) => ({
  firstName,
  avatar: 'owl',
  ageBand,
  tier: 'playground',
  labsUnlocked: false,
  captions: true,
  sessionTargetMinutes: 8,
  loopsCompleted: 0,
  createdAt: 1,
});
let adminToken = '';
let parentToken = '';

beforeEach(async () => {
  const fs = process.env['FIRESTORE_EMULATOR_HOST'];
  if (!fs || !process.env['FIREBASE_AUTH_EMULATOR_HOST']) throw new Error('Emulators required');
  const res = await fetch(
    `http://${fs}/emulator/v1/projects/${project}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error('clear failed');
  adminToken ||= await tokenFor('ops_admin', 'ops@example.test', { admin: true });
  parentToken ||= await tokenFor('fam_a', 'ana@example.test');
  await db().doc(paths.user('fam_a')).set(user('ana@example.test'));
  await db().doc(paths.user('fam_b')).set(user('ben@example.test', 'family'));
  await db().doc(paths.child('fam_a', 'c_a1')).set(child('Mira', '6-7'));
  await db().doc(paths.child('fam_b', 'c_b1')).set(child('Tariq', '8-10'));
  await db().doc(paths.child('fam_b', 'c_b2')).set(child('Noor', '8-10'));
  await db()
    .doc(paths.subscription('fam_b'))
    .set({
      stripeSubscriptionId: 'sub_1',
      status: 'active',
      tier: 'family',
      currentPeriodEnd: now + 1e9,
    });
  await db()
    .doc(paths.usageDaily('fam_a', today))
    .set({ uid: 'fam_a', date: today, voiceSeconds: 600, worlds: 2, images: 10 });
  await db()
    .doc('sessions/s_mod')
    .set({
      uid: 'fam_a',
      childId: 'c_a1',
      startedAt: now - 1000,
      endReason: 'moderation',
      summary: 'SECRET TRANSCRIPT',
    });
  await db()
    .doc('sessions/s_ok')
    .set({
      uid: 'fam_a',
      childId: 'c_a1',
      startedAt: now - 2000,
      endReason: 'parent',
    });
  await db().doc('builderJobs/j_ok').set({ uid: 'fam_a', status: 'complete', finishedAt: now });
  await db().doc('builderJobs/j_bad').set({ uid: 'fam_a', status: 'failed', finishedAt: now });
  await db()
    .doc('worlds/w_fail')
    .set({
      ownerUid: 'fam_a',
      childId: 'c_a1',
      title: 'Bouncy castle',
      status: 'failed',
      assets: { hero: { status: 'failed' }, backdrop: { status: 'ready', url: 'x' } },
      createdAt: now,
      updatedAt: now,
    });
});

const call = (
  route: keyof typeof ADMIN_ROUTES,
  options: { token?: string; params?: Record<string, string>; body?: unknown; query?: string } = {},
) => {
  let url = ADMIN_ROUTES[route].path.replace(
    /:(\w+)/g,
    (_, k: string) => options.params?.[k] ?? '',
  );
  if (options.query) url += `?${options.query}`;
  return app.inject({
    method: ADMIN_ROUTES[route].method,
    url,
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    ...(options.body === undefined ? {} : { payload: options.body as object }),
  });
};
const params = { uid: 'fam_a', worldId: 'w_fail' };
const bodies: Partial<Record<keyof typeof ADMIN_ROUTES, unknown>> = {
  setPlan: { plan: 'family', reason: 'Support comp' },
  resetQuota: { reason: 'Support reset' },
  setSuspension: { suspended: true, reason: 'Abuse report' },
  deleteFamily: { confirmation: 'delete ana@example.test', reason: 'Parent request' },
  setWorldVisibility: { hidden: true, reason: 'Pending review' },
  killSwitch: { on: true, reason: 'Vertex outage' },
  setAppearance: { theme: 'ocean', revision: 0, reason: 'Seasonal palette' },
};
async function audits() {
  const snap = await db().collection('adminAudit').orderBy('at', 'asc').get();
  return snap.docs.map((d) => AdminAuditDocSchema.parse(d.data()));
}

describe('admin authorization', () => {
  it('rejects every admin route without a token, and with a parent token', async () => {
    for (const route of Object.keys(ADMIN_ROUTES) as (keyof typeof ADMIN_ROUTES)[]) {
      const anonymous = await call(route, { params, body: bodies[route] });
      expect(anonymous.statusCode, route).toBe(401);
      const parent = await call(route, { params, body: bodies[route], token: parentToken });
      expect(parent.statusCode, route).toBe(403);
      expect(parent.json().error.code).toBe('FORBIDDEN');
    }
    expect(await audits()).toEqual([]);
    expect((await db().doc(paths.user('fam_a')).get()).exists).toBe(true);
  });
});

describe('admin reads', () => {
  it('aggregates the overview from users, children, subscriptions, usage, sessions and jobs', async () => {
    const res = await call('overview', { token: adminToken });
    expect(res.statusCode).toBe(200);
    const o = AdminOverviewResponseSchema.parse(res.json());
    expect(o.families).toBe(2);
    expect(o.children).toBe(3);
    expect(o.childrenByAgeBand).toEqual({ '6-7': 1, '8-10': 2, '11-13': 0 });
    expect(o.subscriptions).toEqual({ family: 1, comped: 0, free: 1, noPayment: 0 });
    expect(o.voiceMinutes.today).toBe(10);
    expect(o.worldsBuilt.last7).toBe(2);
    expect(o.images.last30).toBe(10);
    expect(o.sessions.today).toBe(2);
    expect(o.moderationBlocks.today).toBe(1);
    expect(o.builder).toEqual({ finished30: 2, failed30: 1, failureRate: 0.5 });
    expect(o.daily).toHaveLength(7);
    expect(o.daily.at(-1)?.date).toBe(today);
    expect(o.estimatedCostUsd.today).toBeCloseTo(10 * 0.05 + 2 * 0.02 + 10 * 0.04, 4);
    expect(res.body).not.toMatch(/Mira|Tariq|Noor|SECRET/);
  });
  it('searches families by email prefix and pages through them', async () => {
    const found = AdminFamilyListResponseSchema.parse(
      (await call('families', { token: adminToken, query: 'q=BEN' })).json(),
    );
    expect(found.families.map((f) => f.uid)).toEqual(['fam_b']);
    expect(found.families[0]).toMatchObject({ childrenCount: 2, subscriptionStatus: 'active' });
    const first = AdminFamilyListResponseSchema.parse(
      (await call('families', { token: adminToken, query: 'limit=1' })).json(),
    );
    expect(first.families.map((f) => f.uid)).toEqual(['fam_a']);
    expect(first.nextCursor).toBe('fam_a');
    const second = AdminFamilyListResponseSchema.parse(
      (await call('families', { token: adminToken, query: 'limit=1&cursor=fam_a' })).json(),
    );
    expect(second.families.map((f) => f.uid)).toEqual(['fam_b']);
    expect(second.nextCursor).toBeNull();
  });
  it('shows family detail with age bands and usage but never child names', async () => {
    const res = await call('family', { token: adminToken, params: { uid: 'fam_b' } });
    expect(res.statusCode).toBe(200);
    const detail = AdminFamilyDetailSchema.parse(res.json());
    expect(detail.children.map((c) => c.ageBand)).toEqual(['8-10', '8-10']);
    expect(detail.limits.worldsPerDay).toBe(20);
    expect(res.body).not.toMatch(/Tariq|Noor|owl/);
    const a = AdminFamilyDetailSchema.parse(
      (await call('family', { token: adminToken, params: { uid: 'fam_a' } })).json(),
    );
    expect(a.usageToday).toEqual({ voiceSeconds: 600, worlds: 2, images: 10 });
    expect(a.sessions30).toBe(2);
    expect(a.worlds).toBe(1);
    expect(
      (await call('family', { token: adminToken, params: { uid: 'nobody' } })).statusCode,
    ).toBe(404);
  });
  it('lists moderation events without text, and failed or rejected worlds', async () => {
    await db().doc('moderationEvents/m1').set({
      sessionId: 's_ok',
      uid: 'fam_a',
      category: 'redirect',
      source: 'transcript',
      at: now,
      text: 'SECRET TRANSCRIPT',
    });
    const res = await call('safety', { token: adminToken });
    const safety = AdminSafetyResponseSchema.parse(res.json());
    expect(safety.moderation.map((m) => [m.sessionId, m.category, m.source]).sort()).toEqual([
      ['s_mod', 'block', 'session'],
      ['s_ok', 'redirect', 'transcript'],
    ]);
    expect(safety.failedWorlds.map((w) => w.worldId)).toEqual(['w_fail']);
    expect(safety.imageRejections[0]).toMatchObject({ worldId: 'w_fail', failedAssets: 1 });
    expect(res.body).not.toMatch(/SECRET|Mira/);
  });
  it('reports content counts and system status', async () => {
    await db().doc('gameSmokeRuns/g1').set({ passed: true, failureReason: null, at: now });
    await db().doc('gameSmokeRuns/g2').set({ passed: false, failureReason: 'timeout', at: now });
    await db().doc('libraryAssets/a1').set({ qaStatus: 'approved' });
    const content = AdminContentResponseSchema.parse(
      (await call('content', { token: adminToken })).json(),
    );
    expect(content.worlds).toMatchObject({ total: 1, failed: 1 });
    expect(content.gameSmoke).toEqual({
      runs: 2,
      passed: 1,
      passRate: 0.5,
      topFailures: [{ reason: 'timeout', count: 1 }],
    });
    expect(content.assetLibrary).toEqual({ total: 1, approved: 1, rejected: 0, pending: 0 });
    const system = AdminSystemStatusSchema.parse(
      (await call('system', { token: adminToken })).json(),
    );
    expect(system.killSwitch.on).toBe(false);
    expect(system.services.find((s) => s.name === 'api')?.status).toBe('ok');
    expect(system.models.find((m) => m.role === 'voice')?.id).toBe('gemini-3.8-live');
  });
});

describe('admin writes are audited', () => {
  it('comps a family plan and records before and after', async () => {
    const res = await call('setPlan', { token: adminToken, params, body: bodies.setPlan });
    expect(res.statusCode).toBe(200);
    expect((await db().doc(paths.user('fam_a')).get()).data()?.['plan']).toBe('family');
    expect((await db().doc('adminFlags/fam_a').get()).data()?.['compPlan']).toBe('family');
    const [audit] = await audits();
    expect(audit).toMatchObject({
      actorUid: 'ops_admin',
      actorEmail: 'ops@example.test',
      action: 'plan.override',
      target: { kind: 'family', id: 'fam_a' },
      before: { plan: 'free', compPlan: null },
      after: { plan: 'family', compPlan: 'family' },
      reason: 'Support comp',
    });
    expect(res.json().auditId).toBeTruthy();
    await call('setPlan', {
      token: adminToken,
      params,
      body: { plan: 'free', reason: 'Comp ended' },
    });
    expect((await db().doc(paths.user('fam_a')).get()).data()?.['plan']).toBe('free');
    // Removing a comp keeps a paying family on its paid tier.
    await call('setPlan', { token: adminToken, params: { uid: 'fam_b' }, body: bodies.setPlan });
    await call('setPlan', {
      token: adminToken,
      params: { uid: 'fam_b' },
      body: { plan: 'free', reason: 'Comp ended' },
    });
    expect((await db().doc(paths.user('fam_b')).get()).data()?.['plan']).toBe('family');
    expect(await audits()).toHaveLength(4);
  });
  it('resets today’s quota', async () => {
    expect(
      (await call('resetQuota', { token: adminToken, params, body: bodies.resetQuota })).statusCode,
    ).toBe(200);
    expect((await db().doc(paths.usageDaily('fam_a', today)).get()).data()).toMatchObject({
      voiceSeconds: 0,
      worlds: 0,
      images: 0,
    });
    expect((await audits())[0]).toMatchObject({
      action: 'quota.reset',
      before: { voiceSeconds: 600, worlds: 2, images: 10 },
      after: { voiceSeconds: 0, worlds: 0, images: 0 },
    });
  });
  it('suspends an account so parent routes refuse it, then reinstates it', async () => {
    expect(
      (await app.inject({ url: '/v1/me', headers: { authorization: `Bearer ${parentToken}` } }))
        .statusCode,
    ).toBe(200);
    await call('setSuspension', { token: adminToken, params, body: bodies.setSuspension });
    const refused = await app.inject({
      url: '/v1/me',
      headers: { authorization: `Bearer ${parentToken}` },
    });
    expect(refused.statusCode).toBe(403);
    expect(refused.json().error.code).toBe('ACCOUNT_SUSPENDED');
    const child = await app.inject({
      url: '/v1/children/c_a1/worlds',
      headers: { authorization: `Bearer ${parentToken}` },
    });
    expect(child.json().error.code).toBe('ACCOUNT_SUSPENDED');
    await call('setSuspension', {
      token: adminToken,
      params,
      body: { suspended: false, reason: 'Resolved' },
    });
    expect(
      (await app.inject({ url: '/v1/me', headers: { authorization: `Bearer ${parentToken}` } }))
        .statusCode,
    ).toBe(200);
    expect((await audits()).map((a) => a.action)).toEqual(['account.suspend', 'account.reinstate']);
  });
  it('deletes a family only with the typed confirmation', async () => {
    const wrong = await call('deleteFamily', {
      token: adminToken,
      params,
      body: { confirmation: 'delete', reason: 'Parent request' },
    });
    expect(wrong.statusCode).toBe(400);
    expect(await audits()).toEqual([]);
    const ok = await call('deleteFamily', { token: adminToken, params, body: bodies.deleteFamily });
    expect(ok.statusCode).toBe(202);
    expect((await db().doc(paths.user('fam_a')).get()).exists).toBe(false);
    expect((await audits())[0]).toMatchObject({
      action: 'account.delete',
      target: { id: 'fam_a' },
    });
  });
  it('hides a world from its family pending review', async () => {
    await call('setWorldVisibility', {
      token: adminToken,
      params,
      body: bodies.setWorldVisibility,
    });
    expect((await db().doc('worlds/w_fail').get()).data()?.['hidden']).toBe(true);
    const safety = AdminSafetyResponseSchema.parse(
      (await call('safety', { token: adminToken })).json(),
    );
    expect(safety.hiddenWorlds.map((w) => w.worldId)).toEqual(['w_fail']);
    expect((await audits())[0]).toMatchObject({
      action: 'world.hide',
      target: { kind: 'world', id: 'w_fail' },
      before: { hidden: false },
      after: { hidden: true },
    });
    expect(
      (
        await call('setWorldVisibility', {
          token: adminToken,
          params: { worldId: 'w_none' },
          body: bodies.setWorldVisibility,
        })
      ).statusCode,
    ).toBe(404);
  });
  it('turns the kill switch on with a reason and lists the audit newest first', async () => {
    await call('killSwitch', { token: adminToken, body: bodies.killSwitch });
    expect(await isKillSwitchOn()).toBe(true);
    const system = AdminSystemStatusSchema.parse(
      (await call('system', { token: adminToken })).json(),
    );
    expect(system.killSwitch).toMatchObject({
      on: true,
      reason: 'Vertex outage',
      updatedBy: 'ops@example.test',
    });
    await call('killSwitch', { token: adminToken, body: { on: false, reason: 'Recovered' } });
    expect(await isKillSwitchOn()).toBe(false);
    const log = AdminAuditResponseSchema.parse((await call('audit', { token: adminToken })).json());
    expect(log.entries.map((e) => e.after?.['on'])).toEqual([false, true]);
    const page = AdminAuditResponseSchema.parse(
      (await call('audit', { token: adminToken, query: 'limit=1' })).json(),
    );
    expect(page.entries).toHaveLength(1);
    expect(page.nextCursor).toBe(page.entries[0]?.id);
  });
  it('validates write bodies before touching storage', async () => {
    const res = await call('setPlan', {
      token: adminToken,
      params,
      body: { plan: 'gold', reason: 'x' },
    });
    expect(res.statusCode).toBe(400);
    expect(await audits()).toEqual([]);
  });
});

describe('published appearance', () => {
  it('serves only the safe palette with a default and rejects invalid operator input', async () => {
    const initial = await app.inject('/v1/appearance');
    expect(initial.statusCode).toBe(200);
    expect(initial.headers['cache-control']).toBe('no-store');
    expect(initial.json()).toEqual({ theme: 'forest', revision: 0 });
    await db()
      .doc('config/appearance')
      .set({ theme: 'ocean', revision: 4, privateOperator: 'SECRET' });
    expect((await app.inject('/v1/appearance')).json()).toEqual({ theme: 'ocean', revision: 4 });
    const invalid = await call('setAppearance', {
      token: adminToken,
      body: { theme: 'unknown', revision: 4, reason: 'Seasonal palette' },
    });
    expect(invalid.statusCode).toBe(400);
    expect(await audits()).toEqual([]);
  });
  it('publishes with an audit and prevents stale or concurrent overwrites', async () => {
    const saved = await call('setAppearance', { token: adminToken, body: bodies.setAppearance });
    expect(saved.statusCode).toBe(200);
    expect((await app.inject('/v1/appearance')).json()).toEqual({ theme: 'ocean', revision: 1 });
    expect((await audits())[0]).toMatchObject({
      action: 'appearance.set',
      actorUid: 'ops_admin',
      target: { kind: 'system', id: 'appearance' },
      before: { theme: 'forest', revision: 0 },
      after: { theme: 'ocean', revision: 1 },
    });
    const stale = await call('setAppearance', { token: adminToken, body: bodies.setAppearance });
    expect(stale.statusCode).toBe(409);
    const race = await Promise.all(
      ['forest', 'terracotta'].map((theme) =>
        call('setAppearance', {
          token: adminToken,
          body: { theme, revision: 1, reason: 'Concurrent update' },
        }),
      ),
    );
    expect(race.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    expect((await app.inject('/v1/appearance')).json().revision).toBe(2);
    expect(await audits()).toHaveLength(2);
    expect((await db().doc(paths.runtimeConfig()).get()).exists).toBe(false);
  });
});
