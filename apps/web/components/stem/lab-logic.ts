import { MAX_IDEAL_PH_CONCENTRATION_M, parseEquation, type Reagent } from '@just-imagine/stem-sims';

export type LabAnswer = {
  reagentIds: string[];
  heat: boolean;
  amounts: Record<string, { volumeMl: number; concentrationM: number }>;
};

export type ReagentGroupId =
  'acid' | 'base' | 'salt' | 'carbonate' | 'metal' | 'indicator' | 'other';
export const REAGENT_GROUPS: Record<ReagentGroupId, [string, string]> = {
  acid: ['Acids', 'এসিড'],
  base: ['Bases and alkalis', 'ক্ষার ও ক্ষারক'],
  salt: ['Salt solutions', 'লবণের দ্রবণ'],
  carbonate: ['Carbonates', 'কার্বনেট'],
  metal: ['Metals', 'ধাতু'],
  indicator: ['Indicators', 'নির্দেশক'],
  other: ['Water, oxides and more', 'পানি, অক্সাইড ও অন্যান্য'],
};
const ORDER: ReagentGroupId[] = [
  'acid',
  'base',
  'salt',
  'carbonate',
  'metal',
  'indicator',
  'other',
];
function groupOf(reagent: Reagent): ReagentGroupId {
  return (ORDER as string[]).includes(reagent.kind) ? (reagent.kind as ReagentGroupId) : 'other';
}
export function groupReagents(reagents: readonly Reagent[]) {
  return ORDER.map((id) => ({ id, reagents: reagents.filter((r) => groupOf(r) === id) })).filter(
    (g) => g.reagents.length,
  );
}

/** The model computes pH only for the strong acid/base solutions below this concentration. */
const PH_SOLUTIONS = new Set(['hcl', 'naoh', 'koh']);
export function phRangeIssue(answer: LabAnswer): { id: string; concentrationM: number } | null {
  for (const id of answer.reagentIds) {
    const amount = answer.amounts[id];
    if (
      PH_SOLUTIONS.has(id) &&
      amount &&
      (amount.concentrationM > MAX_IDEAL_PH_CONCENTRATION_M || amount.concentrationM < 0.001)
    )
      return { id, concentrationM: amount.concentrationM };
  }
  return null;
}

export type LimitingSummary =
  | { kind: 'exact' }
  | { kind: 'limiting'; formula: string; leftover: { formula: string; moles: number }[] }
  | null;
/** Equal stoichiometric amounts have no limiting reagent; never name one arbitrarily. */
export function limitingSummary(
  quantities: { limitingReagent: string | null; remainingMoles: Record<string, number> },
  reaction: { equation: string },
  reagents: readonly Reagent[],
): LimitingSummary {
  if (!quantities.limitingReagent) return null;
  let formulas: string[];
  try {
    formulas = parseEquation(reaction.equation).reactants.map((t) => t.formula);
  } catch {
    return null;
  }
  const reactants = reagents.filter(
    (r) => r.formula && formulas.includes(r.formula) && r.id in quantities.remainingMoles,
  );
  const leftover = reactants
    .map((r) => ({ formula: r.formula!, moles: quantities.remainingMoles[r.id] ?? 0 }))
    .filter((r) => r.moles > 1e-9);
  if (!leftover.length) return { kind: 'exact' };
  const limiting = reagents.find((r) => r.id === quantities.limitingReagent);
  return { kind: 'limiting', formula: limiting?.formula ?? limiting?.id ?? '', leftover };
}
