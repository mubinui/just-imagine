/**
 * Resource budgets for a generated game script. The worker shim checks them
 * first; the host enforces them independently and terminates on breach.
 */
export const BUDGETS = {
  /** Live bodies a script may have spawned at once. */
  maxBodies: 200,
  /** Timers (`game.every` and `game.after`) alive at once. */
  maxTimers: 50,
  /** Wall-clock milliseconds a single handler may run. */
  handlerMs: 8,
  /** Wall-clock milliseconds of script time allowed per second. */
  aggregateMsPerSecond: 50,
  /** Largest accepted script source, in bytes of UTF-8. */
  maxSourceBytes: 20 * 1024,
  /** Milliseconds the host waits for an event acknowledgement before it treats the worker as hung. */
  hangMs: 500,
  /** Milliseconds the host waits for the worker to report ready. */
  readyMs: 5000,
  /** Commands a single handler run may queue before the worker gives up. */
  maxCommandsPerFlush: 2000,
} as const;

export type Budgets = { -readonly [K in keyof typeof BUDGETS]: number };

export type BudgetKind = 'bodies' | 'timers' | 'handler' | 'aggregate' | 'hang' | 'commands';

export interface BudgetBreach {
  kind: BudgetKind;
  /** Observed value: body count, timer count, milliseconds, or commands. */
  value: number;
  /** The limit that was crossed. */
  limit: number;
  /** Handler or event name when known. */
  where?: string;
}
