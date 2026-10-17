import type { z } from 'zod';

/** A flat, serialisable reading of a sim; the tutor and graders only ever see these. */
export type ObservableValue = number | boolean | null;
export type Observable = Readonly<Record<string, ObservableValue>>;

/** A named check over a sim reading. `args` validates the lesson author's arguments. */
export interface Predicate<P> {
  readonly args: z.ZodType;
  test(params: P, observed: Observable, args: unknown): boolean;
}

export interface SimModel<P, Id extends string = string> {
  readonly id: Id;
  readonly params: z.ZodType<P>;
  /** End-of-run or steady values, recomputable on the server from params alone. */
  solve(params: P): Observable;
  /** Values at t seconds for animation; static sims return the same as solve. */
  at(params: P, t: number): Observable;
  readonly predicates: Readonly<Record<string, Predicate<P>>>;
}

export function predicate<P, A>(
  args: z.ZodType<A>,
  test: (params: P, observed: Observable, args: A) => boolean,
): Predicate<P> {
  return { args, test: (params, observed, raw) => test(params, observed, args.parse(raw)) };
}

/** True when value is a number within tol of target. */
export function within(value: ObservableValue | undefined, target: number, tol: number): boolean {
  return typeof value === 'number' && Math.abs(value - target) <= tol;
}
