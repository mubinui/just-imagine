import { z } from 'zod';
import { predicate, within, type Observable, type ObservableValue, type SimModel } from '../types';

export const EXPERIMENTS = ['coin', 'die', 'spinner'] as const;
export const MAX_OUTCOMES = 8;

/** Repeated trials of a coin, a die or a spinner. The seed makes every run reproducible, so the
 *  server can grade a student's run from the params alone. */
export const ProbabilityParamsSchema = z.strictObject({
  experiment: z.enum(EXPERIMENTS),
  trials: z.number().int().min(1).max(10000),
  /** Chance of heads, for the coin only. */
  bias: z.number().min(0.05).max(0.95),
  /** Equal sectors, for the spinner only. */
  sectors: z.number().int().min(2).max(MAX_OUTCOMES),
  seed: z
    .number()
    .int()
    .min(0)
    .max(2 ** 31 - 1),
});
export type ProbabilityParams = z.infer<typeof ProbabilityParamsSchema>;

/** Mulberry32: small, fast and identical on every JavaScript engine. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function outcomeCount(p: ProbabilityParams): number {
  return p.experiment === 'coin' ? 2 : p.experiment === 'die' ? 6 : p.sectors;
}

export function theoretical(p: ProbabilityParams): number[] {
  const k = outcomeCount(p);
  if (p.experiment === 'coin') return [p.bias, 1 - p.bias];
  return Array.from({ length: k }, () => 1 / k);
}

/** Trials per second while animating; a full run takes about eight seconds. */
export function trialRate(p: ProbabilityParams): number {
  return Math.max(4, p.trials / 8);
}

function run(p: ProbabilityParams, done: number): Observable {
  const k = outcomeCount(p),
    next = mulberry32(p.seed),
    counts = new Array<number>(k).fill(0);
  let last: number | null = null;
  for (let i = 0; i < done; i++) {
    const r = next();
    last = p.experiment === 'coin' ? (r < p.bias ? 0 : 1) : Math.min(k - 1, Math.floor(r * k));
    counts[last]! += 1;
  }
  const odds = theoretical(p);
  const out: Record<string, ObservableValue> = { outcomes: k, trials: p.trials, done, last };
  for (let i = 0; i < MAX_OUTCOMES; i++) {
    out['count' + i] = i < k ? counts[i]! : null;
    out['relative' + i] = i < k && done > 0 ? counts[i]! / done : null;
    out['theoretical' + i] = i < k ? odds[i]! : null;
  }
  return out;
}

export const probability: SimModel<ProbabilityParams, 'probability'> = {
  id: 'probability',
  params: ProbabilityParamsSchema,
  solve: (p) => run(p, p.trials),
  at: (p, t) => run(p, Math.min(p.trials, Math.floor(Math.max(0, t) * trialRate(p)))),
  predicates: {
    relativeFrequency: predicate(
      z.strictObject({
        outcome: z
          .number()
          .int()
          .min(0)
          .max(MAX_OUTCOMES - 1),
        value: z.number().min(0).max(1),
        tol: z.number().positive(),
      }),
      (_p, o, a) => within(o['relative' + a.outcome], a.value, a.tol),
    ),
    trialsAtLeast: predicate(
      z.strictObject({ trials: z.number().int().min(1) }),
      (p, _o, a) => p.trials >= a.trials,
    ),
  },
};
