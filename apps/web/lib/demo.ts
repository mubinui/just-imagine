import {
  CreateChildBodySchema,
  UpdateChildBodySchema,
  defaultTierFor,
  PLAN_LIMITS,
  DiscoveryDocSchema,
  type ServerMessage,
  type DiscoveryDoc,
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
function demoDiscoveries(childId: string): DiscoveryDoc[] {
  try {
    return DiscoveryDocSchema.array().parse(
      JSON.parse(localStorage.getItem(`ji-discoveries:${childId}`) || '[]'),
    );
  } catch {
    return [];
  }
}
export function recordDemoDiscovery(
  childId: string,
  worldId: string,
  card: Extract<ServerMessage, { type: 'discovery' }>,
) {
  if (!readDemo().children.some((child) => child.id === childId)) return;
  const cards = demoDiscoveries(childId);
  const prior = cards.find((entry) => entry.concept === card.concept);
  if (prior) {
    if (prior.worldIds.includes(worldId)) return;
    prior.worldIds.push(worldId);
    prior.count++;
  } else
    cards.push(
      DiscoveryDocSchema.parse({ ...card, firstAt: Date.now(), count: 1, worldIds: [worldId] }),
    );
  localStorage.setItem(`ji-discoveries:${childId}`, JSON.stringify(cards));
}
export function demoRequest(
  route: RouteKey,
  params: Record<string, string>,
  body: unknown,
): unknown {
  const data = readDemo();
  const child = data.children.find((c) => c.id === params.childId);
  switch (route) {
    case 'createCompanion':
      throw new Error(
        'Photo companions need a connected Gemini service. Choose a ready-made friend in this preview.',
      );
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
      localStorage.removeItem(`ji-discoveries:${params.childId}`);
      if (JSON.parse(localStorage.getItem('ji-child') || 'null')?.id === params.childId)
        localStorage.removeItem('ji-child');
      data.children = data.children.filter((c) => c.id !== params.childId);
      writeDemo(data);
      return {};
    case 'deleteAccountData':
      for (const c of data.children) localStorage.removeItem(`ji-discoveries:${c.id}`);
      localStorage.removeItem('ji-deleted-worlds');
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
    case 'listStories':
      return { stories: [] };
    case 'createStory':
      throw new Error(
        'Open the running app at localhost:3300 to generate a real illustrated story.',
      );
    case 'listSessions':
      return { sessions: [] };
    case 'listDiscoveries':
      return { discoveries: child ? demoDiscoveries(child.id) : [] };
    case 'checkout':
    case 'portal':
      throw new Error('Billing is unavailable in the local preview. No payment has been taken.');
    default:
      throw new Error('Unsupported preview operation');
  }
}
