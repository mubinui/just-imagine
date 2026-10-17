import { z } from 'zod';

export const BilingualSchema = z.strictObject({
  en: z.string().trim().min(1).max(400),
  bn: z.string().trim().min(1).max(400),
});
export const HexColourSchema = z.string().regex(/^#[0-9a-f]{6}$/);
export const PhysicalStateSchema = z.enum(['s', 'l', 'g', 'aq']);
export const ReagentKindSchema = z.enum([
  'acid',
  'base',
  'salt',
  'metal',
  'oxide',
  'carbonate',
  'indicator',
  'catalyst',
  'peroxide',
  'water',
  'gas',
]);

export const ReagentSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Null only for mixtures such as litmus. */
  formula: z.string().min(1).nullable(),
  name: BilingualSchema,
  kind: ReagentKindSchema,
  state: PhysicalStateSchema,
  /** pH of the bench solution, where it has one. */
  ph: z.number().min(0).max(14).optional(),
  colour: HexColourSchema,
});
export type Reagent = z.infer<typeof ReagentSchema>;

export const ReactionSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Bench reagent ids that must all be present, catalysts included, indicators excluded. */
  reagents: z.array(z.string()).min(1).max(3),
  requires: z.strictObject({ heat: z.boolean() }),
  equation: z.string().min(3),
  products: z
    .array(
      z.strictObject({
        formula: z.string().min(1),
        state: PhysicalStateSchema,
        name: BilingualSchema,
      }),
    )
    .min(1),
  observations: z.strictObject({
    colourTo: HexColourSchema.optional(),
    gas: z.string().optional(),
    precipitate: z.strictObject({ formula: z.string(), colour: HexColourSchema }).optional(),
    tempChange: z.enum(['up', 'down', 'none']),
  }),
  phAfter: z.number().min(0).max(14).optional(),
  explanation: BilingualSchema,
});
export type Reaction = z.infer<typeof ReactionSchema>;

export const INDICATOR_IDS = ['litmus', 'phenolphthalein', 'methyl-orange'] as const;
const RED = '#d1495b';

/** Indicator colour at a pH; null means colourless. Unknown indicators are colourless. */
export function indicatorColour(id: string, ph: number): string | null {
  switch (id) {
    case 'litmus':
      return ph < 5 ? RED : ph > 8 ? '#3d6fb6' : '#8e6bb0';
    case 'phenolphthalein':
      return ph >= 8.2 ? '#e85d9b' : null;
    case 'methyl-orange':
      return ph < 3.1 ? RED : ph > 4.4 ? '#f2c14e' : '#f08a3c';
    default:
      return null;
  }
}

export class MixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MixError';
  }
}

export interface MixResult {
  /** Sorted, de-duplicated non-indicator reagent ids, plus `|heat`; the AI-fallback cache key. */
  key: string;
  contents: string[];
  reaction: Reaction | null;
  ph: number | null;
  indicator: { id: string; colour: string | null } | null;
}

export function mixKey(reagentIds: readonly string[], heat: boolean): string {
  return [...new Set(reagentIds)].sort().join('+') + (heat ? '|heat' : '');
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedB = [...b].sort();
  return [...a].sort().every((v, i) => v === sortedB[i]);
}

export function mix(
  input: { reagentIds: readonly string[]; heat: boolean },
  reagents: readonly Reagent[],
  reactions: readonly Reaction[],
): MixResult {
  const byId = new Map(reagents.map((r) => [r.id, r]));
  const chosen = [...new Set(input.reagentIds)].map((id) => {
    const reagent = byId.get(id);
    if (!reagent) throw new MixError(`Unknown reagent "${id}".`);
    return reagent;
  });
  const indicatorReagent = chosen.find((r) => r.kind === 'indicator') ?? null;
  const contents = chosen
    .filter((r) => r.kind !== 'indicator')
    .map((r) => r.id)
    .sort();
  const reaction =
    reactions.find((r) => sameSet(r.reagents, contents) && (!r.requires.heat || input.heat)) ??
    null;
  const solutionPhs = chosen
    .filter((r) => r.kind !== 'indicator' && r.ph !== undefined)
    .map((r) => r.ph!);
  const ph = reaction?.phAfter ?? (solutionPhs.length === 1 ? solutionPhs[0]! : null);
  return {
    key: mixKey(contents, input.heat),
    contents,
    reaction,
    ph,
    indicator: indicatorReagent
      ? {
          id: indicatorReagent.id,
          colour: ph === null ? indicatorReagent.colour : indicatorColour(indicatorReagent.id, ph),
        }
      : null,
  };
}

export const LabTaskSchema = z.discriminatedUnion('predicate', [
  z.strictObject({ predicate: z.literal('solutionColour'), colour: HexColourSchema }),
  z.strictObject({
    predicate: z.literal('pHBetween'),
    min: z.number().min(0).max(14),
    max: z.number().min(0).max(14),
  }),
  z.strictObject({ predicate: z.literal('producedGas'), gas: z.string().min(1) }),
  z.strictObject({ predicate: z.literal('formedPrecipitate'), formula: z.string().min(1) }),
]);
export type LabTask = z.infer<typeof LabTaskSchema>;

/** Graded on a server-recomputed MixResult, never on client-reported observations. */
export function checkLabTask(result: MixResult, task: LabTask): boolean {
  const obs = result.reaction?.observations;
  switch (task.predicate) {
    case 'solutionColour':
      return obs?.colourTo === task.colour || result.indicator?.colour === task.colour;
    case 'pHBetween':
      return result.ph !== null && result.ph >= task.min && result.ph <= task.max;
    case 'producedGas':
      return obs?.gas === task.gas;
    case 'formedPrecipitate':
      return obs?.precipitate?.formula === task.formula;
  }
}
