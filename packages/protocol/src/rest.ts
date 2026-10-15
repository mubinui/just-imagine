import { z } from 'zod';
import { ConceptSchema } from '@just-imagine/scene-schema';
import { PlanLimitsSchema, PlanTierSchema } from './plans';
import {
  ChildDocSchema,
  DiscoveryDocSchema,
  SessionDocSchema,
  SubscriptionDocSchema,
  UsageDailyDocSchema,
  UserDocSchema,
  WorldDocSchema,
  WorldStatusSchema,
} from './firestore';

export const ApiErrorCodeSchema = z.enum([
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'INVALID_ARGUMENT',
  'QUOTA_EXHAUSTED',
  'PLAN_LIMIT',
  'INTERNAL',
]);
export const ApiErrorSchema = z.object({
  error: z.object({ code: ApiErrorCodeSchema, message: z.string() }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

const withId = <T extends z.ZodRawShape>(s: z.ZodObject<T>) => s.extend({ id: z.string() });

export const ChildResponseSchema = withId(ChildDocSchema);
export type ChildResponse = z.infer<typeof ChildResponseSchema>;

export const MeResponseSchema = z.object({
  uid: z.string(),
  user: UserDocSchema,
  children: z.array(ChildResponseSchema),
  subscription: SubscriptionDocSchema.nullable(),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;

export const CreateChildBodySchema = ChildDocSchema.pick({
  firstName: true,
  avatar: true,
  ageBand: true,
}).strict();
export type CreateChildBody = z.infer<typeof CreateChildBodySchema>;

export const UpdateChildBodySchema = ChildDocSchema.pick({
  firstName: true,
  avatar: true,
  ageBand: true,
  tier: true,
  labsUnlocked: true,
  captions: true,
  sessionTargetMinutes: true,
})
  .partial()
  .strict();
export type UpdateChildBody = z.infer<typeof UpdateChildBodySchema>;

export const WorldSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  status: WorldStatusSchema,
  concepts: z.array(ConceptSchema),
  thumbnailUrl: z.string().nullable(),
  createdAt: z.number().int(),
});
export const WorldListResponseSchema = z.object({ worlds: z.array(WorldSummarySchema) });
export type WorldListResponse = z.infer<typeof WorldListResponseSchema>;

export const WorldResponseSchema = withId(WorldDocSchema);
export type WorldResponse = z.infer<typeof WorldResponseSchema>;

export const SessionListResponseSchema = z.object({ sessions: z.array(withId(SessionDocSchema)) });
export type SessionListResponse = z.infer<typeof SessionListResponseSchema>;

export const DiscoveryListResponseSchema = z.object({ discoveries: z.array(DiscoveryDocSchema) });
export type DiscoveryListResponse = z.infer<typeof DiscoveryListResponseSchema>;

export const UsageTodayResponseSchema = z.object({
  plan: PlanTierSchema,
  limits: PlanLimitsSchema,
  used: UsageDailyDocSchema.pick({ voiceSeconds: true, worlds: true, images: true }),
});
export type UsageTodayResponse = z.infer<typeof UsageTodayResponseSchema>;

export const CheckoutBodySchema = z.strictObject({ tier: z.literal('family') });
export const CheckoutResponseSchema = z.object({ url: z.string() });
export const PortalResponseSchema = z.object({ url: z.string() });
export type CheckoutBody = z.infer<typeof CheckoutBodySchema>;
export type CheckoutResponse = z.infer<typeof CheckoutResponseSchema>;
export type PortalResponse = z.infer<typeof PortalResponseSchema>;
export type WorldSummary = z.infer<typeof WorldSummarySchema>;

export const ROUTES = {
  me: { method: 'GET', path: '/v1/me' },
  deleteAccountData: { method: 'POST', path: '/v1/me/delete' },
  createChild: { method: 'POST', path: '/v1/children' },
  updateChild: { method: 'PATCH', path: '/v1/children/:childId' },
  deleteChild: { method: 'DELETE', path: '/v1/children/:childId' },
  listWorlds: { method: 'GET', path: '/v1/children/:childId/worlds' },
  listSessions: { method: 'GET', path: '/v1/children/:childId/sessions' },
  listDiscoveries: { method: 'GET', path: '/v1/children/:childId/discoveries' },
  getWorld: { method: 'GET', path: '/v1/worlds/:worldId' },
  deleteWorld: { method: 'DELETE', path: '/v1/worlds/:worldId' },
  usageToday: { method: 'GET', path: '/v1/usage/today' },
  checkout: { method: 'POST', path: '/v1/billing/checkout' },
  portal: { method: 'POST', path: '/v1/billing/portal' },
  stripeWebhook: { method: 'POST', path: '/v1/billing/webhook' },
} as const satisfies Record<string, { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; path: string }>;
export type RouteKey = keyof typeof ROUTES;
