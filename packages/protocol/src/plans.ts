import { z } from 'zod';

export const PlanTierSchema = z.enum(['free', 'family']);
export type PlanTier = z.infer<typeof PlanTierSchema>;

export const PlanLimitsSchema = z.object({
  children: z.number().int().nonnegative(),
  voiceSecondsPerDay: z.number().int().nonnegative(),
  worldsPerDay: z.number().int().nonnegative(),
  imagesPerWorld: z.number().int().nonnegative(),
  savedWorlds: z.number().int().nonnegative(),
});
export type PlanLimits = z.infer<typeof PlanLimitsSchema>;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    children: 1,
    voiceSecondsPerDay: 15 * 60,
    worldsPerDay: 3,
    imagesPerWorld: 8,
    savedWorlds: 10,
  },
  family: {
    children: 4,
    voiceSecondsPerDay: 60 * 60,
    worldsPerDay: 20,
    imagesPerWorld: 16,
    savedWorlds: 200,
  },
};

export const QUOTA_WARNING_SECONDS = 120;
