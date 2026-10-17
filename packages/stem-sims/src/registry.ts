import { z } from 'zod';
import { newtonCart } from './cart';
import { ohmsCircuit } from './circuit';
import { linearGraph } from './linear';
import { motionGraphs } from './motion';
import type { SimModel } from './types';
import { unitCircle } from './unit-circle';

export const SIMS = {
  'motion-graphs': motionGraphs,
  'newton-cart': newtonCart,
  'ohms-circuit': ohmsCircuit,
  'linear-graph': linearGraph,
  'unit-circle': unitCircle,
} as const;
export type SimId = keyof typeof SIMS;
export const SIM_IDS = Object.keys(SIMS) as readonly SimId[];
export const SimIdSchema = z.enum([
  'motion-graphs',
  'newton-cart',
  'ohms-circuit',
  'linear-graph',
  'unit-circle',
]);

export const SimTaskSchema = z.strictObject({
  predicate: z.string().min(1).max(64),
  args: z.unknown(),
});
export type SimTask = z.infer<typeof SimTaskSchema>;

export type TaskCheck =
  | { ok: true; met: boolean }
  | {
      ok: false;
      reason: 'unknown-sim' | 'invalid-params' | 'unknown-predicate' | 'invalid-args';
    };

const MODELS: Readonly<Record<string, SimModel<unknown>>> = SIMS;

/**
 * Grades a sim task from the submitted params alone. Client-reported readings are never
 * accepted: params are strictly parsed and the model recomputes everything it checks.
 */
export function checkSimTask(simId: string, rawParams: unknown, task: SimTask): TaskCheck {
  if (!Object.hasOwn(MODELS, simId)) return { ok: false, reason: 'unknown-sim' };
  const model = MODELS[simId]!;
  const params = model.params.safeParse(rawParams);
  if (!params.success) return { ok: false, reason: 'invalid-params' };
  if (!Object.hasOwn(model.predicates, task.predicate))
    return { ok: false, reason: 'unknown-predicate' };
  const check = model.predicates[task.predicate]!;
  const args = check.args.safeParse(task.args);
  if (!args.success) return { ok: false, reason: 'invalid-args' };
  return { ok: true, met: check.test(params.data, model.solve(params.data), args.data) };
}

export function describeSim(simId: SimId): { id: SimId; predicates: string[] } {
  return { id: simId, predicates: Object.keys(SIMS[simId].predicates) };
}
