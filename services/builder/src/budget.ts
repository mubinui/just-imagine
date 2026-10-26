/**
 * One time budget for a world build. Every model call in a build checks the
 * budget first so that no call starts that cannot finish before the hard
 * deadline.
 */
export interface BuildBudget {
  readonly start: number;
  readonly hard: number; // start + hardMs
  canStart(callMs: number): boolean; // now + callMs <= hard
  remainingMs(): number; // max(0, hard - now)
  deadlineFor(phaseMs: number): number; // min(hard, now + phaseMs)
}

export const HARD_BUDGET_MS = 780000;
export const ART_PHASE_MS = 180000;

export function createBudget(options: { now?: () => number; hardMs?: number } = {}): BuildBudget {
  const now = options.now ?? Date.now;
  const hardMs = options.hardMs ?? HARD_BUDGET_MS;
  const start = now();
  const hard = start + hardMs;
  return {
    start,
    hard,
    canStart: (callMs: number) => now() + callMs <= hard,
    remainingMs: () => Math.max(0, hard - now()),
    deadlineFor: (phaseMs: number) => Math.min(hard, now() + phaseMs),
  };
}
