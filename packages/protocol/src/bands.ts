import { z } from 'zod';
import { TierSchema } from '@just-imagine/scene-schema';

export const AgeBandSchema = z.enum(['6-7', '8-10', '11-13']);
export type AgeBand = z.infer<typeof AgeBandSchema>;

export { TierSchema };
export type Tier = z.infer<typeof TierSchema>;

export function defaultTierFor(band: AgeBand): Tier {
  return band === '11-13' ? 'lab' : 'playground';
}
