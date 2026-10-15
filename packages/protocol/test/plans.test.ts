import { describe, it, expect } from 'vitest';
import { PLAN_LIMITS, PlanTierSchema } from '../src/plans';

describe('PLAN_LIMITS', () => {
  it('matches the spec table', () => {
    expect(PLAN_LIMITS.free).toEqual({
      children: 1,
      voiceSecondsPerDay: 900,
      worldsPerDay: 3,
      imagesPerWorld: 8,
      savedWorlds: 10,
    });
    expect(PLAN_LIMITS.family).toEqual({
      children: 4,
      voiceSecondsPerDay: 3600,
      worldsPerDay: 20,
      imagesPerWorld: 16,
      savedWorlds: 200,
    });
  });
  it('has a limits entry for every tier', () => {
    for (const tier of PlanTierSchema.options) expect(PLAN_LIMITS[tier]).toBeDefined();
  });
});
