import {
  CreateChildBodySchema,
  UpdateChildBodySchema,
  defaultTierFor,
  PLAN_LIMITS,
  type MeResponse,
  type RouteKey,
} from '@just-imagine/protocol';
import {
  FIXTURE_WORLDS,
  fixtureWorldDoc,
  type FixtureWorldKey,
} from '@just-imagine/fixtures/browser';
const key = 'just-imagine-preview-v1';
export function readDemo(): MeResponse {
  const raw = localStorage.getItem(key);
  if (raw) return JSON.parse(raw) as MeResponse;
  const now = Date.now();
  return {
    uid: 'u_fixture',
    user: {
      email: 'parent@example.test',
      displayName: 'Sample family',
      consentAt: now,
      createdAt: now,
      plan: 'family',
      stripeCustomerId: null,
    },
    subscription: null,
    children: [
      {
        id: 'c_fixture',
        firstName: 'Ari',
        avatar: 'fox',
        ageBand: '8-10',
        tier: 'playground',
        labsUnlocked: true,
        captions: true,
        sessionTargetMinutes: 15,
        loopsCompleted: 0,
        createdAt: now,
      },
    ],
  };
}
export function writeDemo(data: MeResponse) {
  localStorage.setItem(key, JSON.stringify(data));
}
export function demoRequest(
  route: RouteKey,
  params: Record<string, string>,
  body: unknown,
): unknown {
  const data = readDemo();
  const child = data.children.find((c) => c.id === params.childId);
  switch (route) {
    case 'me':
      return data;
    case 'createChild': {
      if (data.children.length >= PLAN_LIMITS[data.user.plan].children)
        throw new Error('Your plan has reached its child profile limit.');
      const b = CreateChildBodySchema.parse(body);
      const c = {
        ...b,
        id: crypto.randomUUID(),
        tier: defaultTierFor(b.ageBand),
        labsUnlocked: b.ageBand === '11-13',
        captions: b.ageBand !== '6-7',
        sessionTargetMinutes: 15,
        loopsCompleted: 0,
        createdAt: Date.now(),
      };
      data.children.push(c);
      writeDemo(data);
      return c;
    }
    case 'updateChild': {
      if (!child) throw new Error('Explorer not found');
      Object.assign(child, UpdateChildBodySchema.parse(body));
      writeDemo(data);
      return child;
    }
    case 'deleteChild':
      data.children = data.children.filter((c) => c.id !== params.childId);
      writeDemo(data);
      return {};
    case 'deleteAccountData':
      localStorage.removeItem(key);
      localStorage.removeItem('ji-child');
      localStorage.removeItem('ji-preview-auth');
      return {};
    case 'usageToday':
      return {
        plan: data.user.plan,
        limits: PLAN_LIMITS[data.user.plan],
        used: { voiceSeconds: 0, worlds: 0, images: 0 },
      };
    case 'listWorlds':
      return {
        worlds: Object.entries(FIXTURE_WORLDS)
          .filter(
            ([, d]) =>
              !JSON.parse(localStorage.getItem('ji-deleted-worlds') || '[]').includes(d.worldId),
          )
          .map(([, d]) => ({
            id: d.worldId,
            title: d.title,
            status: 'ready',
            concepts: d.learning.concepts,
            thumbnailUrl: null,
            createdAt: Date.now(),
          })),
      };
    case 'getWorld': {
      const entry = Object.entries(FIXTURE_WORLDS).find(([, d]) => d.worldId === params.worldId);
      if (!entry) throw new Error('World not found');
      return fixtureWorldDoc(entry[0] as FixtureWorldKey);
    }
    case 'deleteWorld': {
      const removed = JSON.parse(localStorage.getItem('ji-deleted-worlds') || '[]') as string[];
      removed.push(params.worldId!);
      localStorage.setItem('ji-deleted-worlds', JSON.stringify(removed));
      return {};
    }
    case 'listSessions':
      return { sessions: [] };
    case 'listDiscoveries':
      return { discoveries: [] };
    case 'checkout':
    case 'portal':
      throw new Error('Billing is unavailable in the local preview. No payment has been taken.');
    default:
      throw new Error('Unsupported preview operation');
  }
}
