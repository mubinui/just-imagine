import { z } from 'zod';
import { parseEquation } from './formula';
export const SolutionAmountSchema = z.strictObject({
  volumeMl: z.number().min(1).max(1000),
  concentrationM: z.number().min(0.001).max(5),
});
export const SolutionAmountsSchema = z.record(z.string(), SolutionAmountSchema);
export type SolutionAmounts = z.infer<typeof SolutionAmountsSchema>;
export const DEFAULT_SOLUTION_AMOUNT = { volumeMl: 50, concentrationM: 0.1 } as const;
/** Ideal concentration-based pH at 25°C, limited to dilute monoprotic HCl/NaOH/KOH.
 * Higher input concentrations remain usable for stoichiometry, without claiming a pH. */
export const MAX_IDEAL_PH_CONCENTRATION_M = 0.1;

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
  quantities?: {
    volumeMl: number;
    limitingReagent: string | null;
    productsMoles: Record<string, number>;
    remainingMoles: Record<string, number>;
  };
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
  input: { reagentIds: readonly string[]; heat: boolean; amounts?: SolutionAmounts },
  reagents: readonly Reagent[],
  reactions: readonly Reaction[],
): MixResult {
  const byId = new Map(reagents.map((r) => [r.id, r]));
  const amounts = input.amounts ? SolutionAmountsSchema.parse(input.amounts) : undefined;
  if (
    amounts &&
    Object.keys(amounts).some(
      (id) =>
        !input.reagentIds.includes(id) ||
        byId.get(id)?.kind === 'indicator' ||
        byId.get(id)?.state !== 'aq',
    )
  )
    throw new MixError('Quantities must belong to selected solution reagents.');
  const chosen = [...new Set(input.reagentIds)].map((id) => {
    const reagent = byId.get(id);
    if (!reagent) throw new MixError(`Unknown reagent "${id}".`);
    return reagent;
  });
  if (chosen.filter((r) => r.kind === 'indicator').length > 1)
    throw new MixError('Choose one indicator at a time.');
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
  let ph = reaction
    ? (reaction.phAfter ?? null)
    : solutionPhs.length === 1
      ? solutionPhs[0]!
      : null;
  let quantities: MixResult['quantities'];
  if (amounts) {
    const solutions = chosen.filter((r) => r.kind !== 'indicator' && r.state === 'aq');
    const volumeMl = solutions.reduce(
      (sum, r) => sum + (amounts[r.id] ?? DEFAULT_SOLUTION_AMOUNT).volumeMl,
      0,
    );
    const moles = Object.fromEntries(
      solutions.map((r) => {
        const a = amounts[r.id] ?? DEFAULT_SOLUTION_AMOUNT;
        return [r.id, (a.volumeMl / 1000) * a.concentrationM];
      }),
    );
    const remainingMoles = { ...moles },
      productsMoles: Record<string, number> = {};
    let limitingReagent: string | null = null;
    if (reaction) {
      const equation = parseEquation(reaction.equation);
      const reactants = equation.reactants.map((term) => ({
        term,
        reagent: chosen.find((r) => r.formula === term.formula),
      }));
      if (reactants.every((r) => r.reagent && moles[r.reagent.id] !== undefined)) {
        const limiting = reactants.reduce((a, b) =>
          moles[a.reagent!.id]! / a.term.coefficient <= moles[b.reagent!.id]! / b.term.coefficient
            ? a
            : b,
        );
        const extent = moles[limiting.reagent!.id]! / limiting.term.coefficient;
        limitingReagent = limiting.reagent!.id;
        for (const r of reactants)
          remainingMoles[r.reagent!.id] = Math.max(
            0,
            moles[r.reagent!.id]! - extent * r.term.coefficient,
          );
        for (const product of equation.products)
          productsMoles[product.formula] = extent * product.coefficient;
      }
    }
    // A supplied amount changes the reference bench conditions: unsupported quantitative
    // mixtures must never reuse a curated reference pH (or assume full sulfate dissociation).
    ph = null;
    const acidEq: Record<string, number> = { hcl: 1 };
    const baseEq: Record<string, number> = { naoh: 1, koh: 1 };
    const supported = chosen.every(
      (r) =>
        r.kind === 'indicator' ||
        (r.state === 'aq' &&
          (acidEq[r.id] || baseEq[r.id]) &&
          (amounts[r.id] ?? DEFAULT_SOLUTION_AMOUNT).concentrationM <=
            MAX_IDEAL_PH_CONCENTRATION_M),
    );
    if (solutions.length && supported && volumeMl > 0) {
      const excess =
        solutions.reduce(
          (sum, r) => sum + moles[r.id]! * ((acidEq[r.id] ?? 0) - (baseEq[r.id] ?? 0)),
          0,
        ) /
        (volumeMl / 1000);
      const hydrogen = (excess + Math.sqrt(excess * excess + 4e-14)) / 2;
      const hydroxide = (-excess + Math.sqrt(excess * excess + 4e-14)) / 2;
      ph = Math.min(
        14,
        Math.max(0, excess >= 0 ? -Math.log10(hydrogen) : 14 + Math.log10(hydroxide)),
      );
    }
    quantities = { volumeMl, limitingReagent, productsMoles, remainingMoles };
  }
  return {
    key: mixKey(contents, input.heat),
    ...(quantities ? { quantities } : {}),
    contents,
    reaction,
    ph,
    indicator: indicatorReagent
      ? {
          id: indicatorReagent.id,
          colour: ph === null ? null : indicatorColour(indicatorReagent.id, ph),
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

/**
 * Grades a student's lab submission for a labTask item: every submitted reagent must be one the
 * item offers, and the mix is recomputed on the server before the task is checked.
 */
export function gradeLabSubmission(
  item: { reagentIds: readonly string[] },
  submitted: { reagentIds: readonly string[]; heat: boolean; amounts?: SolutionAmounts },
  task: LabTask,
  reagents: readonly Reagent[],
  reactions: readonly Reaction[],
):
  | { ok: true; met: boolean; result: MixResult }
  | { ok: false; reason: 'reagent-not-offered' | 'unknown-reagent' } {
  if (!submitted.reagentIds.every((id) => item.reagentIds.includes(id)))
    return { ok: false, reason: 'reagent-not-offered' };
  let result: MixResult;
  try {
    result = mix(submitted, reagents, reactions);
  } catch (error) {
    if (error instanceof MixError) return { ok: false, reason: 'unknown-reagent' };
    throw error;
  }
  return { ok: true, met: checkLabTask(result, task), result };
}
