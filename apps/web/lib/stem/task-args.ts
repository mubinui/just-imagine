import { z } from 'zod';
import { SIMS, type Observable, type SimId, type SimModel } from '@just-imagine/stem-sims';
import { SIM_DEFAULTS } from './sim-params';

type Args = Record<string, unknown>;

/** Hand-picked starting arguments for the original simulations' tasks. One is used only when its
 *  sim's own task accepts it, because several sims share a task name with different arguments. */
const CURATED: Record<string, Args> = {
  lineThrough: {
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    tol: 0.1,
  },
  stopsAt: { x: 10, tol: 0.1 },
  reachesSpeed: { v: 5, tol: 0.1 },
  displacementEquals: { x: 10, tol: 0.1 },
  justMoves: {},
  accelerationEquals: { a: 1, tol: 0.1 },
  currentEquals: { i: 0.5, tol: 0.01 },
  powerAtLeast: { index: 0, p: 1 },
  slopeEquals: { m: 1, tol: 0.1 },
  interceptEquals: { c: 0, tol: 0.1 },
  angleWithin: { min: 30, max: 60 },
  sinEquals: { v: 0.5, tol: 0.01 },
  cosEquals: { v: 0.5, tol: 0.01 },
};

/** The reading a task argument targets, where its name differs from the reading's. */
const TARGETS: Partial<Record<SimId, Record<string, Record<string, string>>>> = {
  projectile: { flightTimeEquals: { time: 'flightTime' }, hitsTarget: { x: 'range' } },
  pendulum: { maxSpeedEquals: { speed: 'maxSpeed' } },
  collision: { finalVelocityEquals: { v: 'v1' }, keLostEquals: { joules: 'keLost' } },
  orbit: { periodEquals: { hours: 'periodHours' } },
  titration: { equivalenceVolumeEquals: { volume: 'equivalenceVolume' } },
  'reaction-rate': { halfLifeEquals: { seconds: 'halfLife' } },
  'gas-law': { pressureEquals: { kPa: 'pressure' } },
  'function-grapher': {
    valueEquals: { y: 'value' },
    interceptEquals: { y: 'yIntercept' },
    hasRoot: { x: 'root1' },
    vertexAt: { x: 'vertexX', y: 'vertexY' },
  },
  'riemann-area': { estimateEquals: { area: 'estimate' } },
  probability: { relativeFrequency: { value: 'relative0' } },
  'trig-waves': { valueEquals: { y: 'value' }, amplitudeEquals: { amplitude: 'max' } },
};

const round = (v: number) => Number(v.toFixed(Math.abs(v) < 1 ? 3 : 2));

/**
 * Starting arguments for a lesson task, so a teacher who picks a task sees a sensible target to
 * adjust instead of an empty form. Numeric targets start at the reading the simulation's default
 * setup produces, tolerances at about 5 % of the target, and choices at the option that is true
 * of the starting picture. The result always satisfies the task's own argument schema, or is the
 * hand-picked default when there is one.
 */
export function defaultTaskArgs(simId: string, predicate: string): Args {
  const curated = CURATED[predicate];
  if (!Object.hasOwn(SIMS, simId)) return curated ?? {};
  const id = simId as SimId;
  const model = SIMS[id] as SimModel<unknown>;
  if (!Object.hasOwn(model.predicates, predicate)) return {};
  const check = model.predicates[predicate]!;
  if (curated && check.args.safeParse(curated).success) return curated;
  if (!(check.args instanceof z.ZodObject)) return {};

  const parsed = model.params.safeParse(SIM_DEFAULTS[id]);
  if (!parsed.success) return {};
  const params = parsed.data as Record<string, unknown>;
  const observed: Observable = model.solve(parsed.data);
  const targets = TARGETS[id]?.[predicate] ?? {};

  const args: Args = {};
  const choices: [string, unknown[]][] = [];
  let reference: number | undefined;
  for (const [key, field] of Object.entries(check.args.shape as Record<string, z.ZodType>)) {
    if (field instanceof z.ZodEnum) choices.push([key, field.options as unknown[]]);
    else if (field instanceof z.ZodBoolean) choices.push([key, [true, false]]);
    else if (field instanceof z.ZodNumber && key !== 'tol') {
      const reading = observed[targets[key] ?? key];
      const value = typeof reading === 'number' ? reading : params[key];
      args[key] = typeof value === 'number' ? round(value) : fallback(field);
      if (typeof value === 'number' && reference === undefined) reference = Math.abs(value);
    }
  }
  if ('tol' in check.args.shape)
    args['tol'] = reference === undefined ? 0.1 : Math.max(0.01, round(reference * 0.05));

  // Choices: the first combination that is true of the starting setup, else the first options.
  const combos = choices.reduce<Args[]>(
    (all, [key, options]) => all.flatMap((combo) => options.map((o) => ({ ...combo, [key]: o }))),
    [{}],
  );
  const holds = (candidate: Args) =>
    check.args.safeParse(candidate).success && check.test(parsed.data, observed, candidate);
  const chosen = combos.find((combo) => holds({ ...args, ...combo })) ?? combos[0] ?? {};
  const result = { ...args, ...chosen };
  if (check.args.safeParse(result).success) return result;
  const integers = Object.fromEntries(
    Object.entries(result).map(([k, v]) => [k, typeof v === 'number' ? Math.round(v) : v]),
  );
  return check.args.safeParse(integers).success ? integers : (curated ?? {});
}

function fallback(field: z.ZodNumber): number {
  const min = field.minValue,
    max = field.maxValue;
  if (min !== null && Number.isFinite(min)) return min > 0 ? min : Math.max(min, 1);
  if (max !== null && Number.isFinite(max) && max < 1) return max;
  return 1;
}
