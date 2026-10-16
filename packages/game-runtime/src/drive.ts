import type { Dial } from '@just-imagine/scene-schema';
import type { Budgets, BudgetBreach } from './budgets';
import { createGameHost, type GameError, type WorkerFactory } from './host';
import type { Command, GameState } from './protocol';
import { checkScript, scanApiCalls, type ScriptIssue } from './static-check';

export interface StageCollision {
  a: string;
  b: string;
  impulse: number;
}

export interface StageDial {
  dial: Dial;
  value: string;
}

/** A world the driver can step, inspect, poke with scripted inputs and apply commands to. */
export interface Stage {
  /** Advances the world by `dt` seconds. */
  step(dt: number): void;
  state(): GameState;
  /** Contacts that began since the previous call. */
  collisions(): StageCollision[];
  /** Entities a child could tap, in order. */
  tappable(): string[];
  /** Dial changes available for the scripted input. */
  dials(): StageDial[];
  hero(): string | undefined;
  position(id: string): { x: number; y: number } | undefined;
  tap(id: string, at: { x: number; y: number }): void;
  flick(id: string, velocity: { x: number; y: number }): void;
  dial(dial: Dial, value: string): void;
  apply(command: Command): void;
  dispose?(): void;
}

export interface DriveOptions {
  seconds: number;
  seed?: number;
  worker?: WorkerFactory;
  budgets?: Partial<Budgets>;
  /** Ticks and state pushes per simulated second. Default 20. */
  rate?: number;
}

export interface DriveStats {
  seconds: number;
  ticks: number;
  commands: Partial<Record<Command['type'], number>>;
  spawned: number;
  score: number;
  won: boolean;
  lost: boolean;
  /** Every `say`, `ask` and `hud` string the script produced, deduplicated. */
  strings: string[];
  errors: number;
  taps: number;
}

export type DriveFailure =
  | { reason: 'static'; detail: { errors: ScriptIssue[] } }
  | { reason: 'no-goal'; detail: { message: string } }
  | { reason: 'runtime'; detail: GameError }
  | { reason: 'budget'; detail: BudgetBreach };

export type DriveResult = ({ ok: true } | ({ ok: false } & DriveFailure)) & { stats: DriveStats };

/** When the scripted inputs happen, in simulated seconds. */
export const SCRIPTED_INPUTS = {
  tapStart: 1,
  tapInterval: 0.25,
  dialAt: 2,
  flickAt: 3,
  flickVelocity: { x: 4, y: -6 },
} as const;

/**
 * Runs a script against a stage for a number of simulated seconds: ticks and
 * state at `rate` Hz, a tap on every tappable entity in turn, one dial change,
 * one flick, collisions as the stage reports them, and every command applied
 * back to the stage. Fails on a static error, a missing goal, a runtime error
 * or a budget breach.
 */
export async function driveScript(
  source: string,
  stage: Stage,
  options: DriveOptions,
): Promise<DriveResult> {
  const rate = options.rate ?? 20;
  const dt = 1 / rate;
  const total = Math.round(options.seconds * rate);
  const stats: DriveStats = {
    seconds: options.seconds,
    ticks: 0,
    commands: {},
    spawned: 0,
    score: 0,
    won: false,
    lost: false,
    strings: [],
    errors: 0,
    taps: 0,
  };
  const strings = new Set<string>();
  const addString = (text: string) => {
    if (!strings.has(text)) {
      strings.add(text);
      stats.strings.push(text);
    }
  };

  const check = checkScript(source);
  if (!check.ok) return { ok: false, reason: 'static', detail: { errors: check.errors }, stats };
  const calls = scanApiCalls(source);
  if (!calls.has('win') && !calls.has('score'))
    return {
      ok: false,
      reason: 'no-goal',
      detail: { message: 'the script never calls game.win or game.score' },
      stats,
    };

  const errors: GameError[] = [];
  const breaches: BudgetBreach[] = [];
  const pendingAsks: number[] = [];
  const handle = createGameHost(
    source,
    {
      onCommand: (command) => {
        stats.commands[command.type] = (stats.commands[command.type] ?? 0) + 1;
        switch (command.type) {
          case 'spawn':
            stats.spawned += 1;
            break;
          case 'score':
            stats.score += command.delta;
            break;
          case 'win':
            stats.won = true;
            break;
          case 'lose':
            stats.lost = true;
            break;
          case 'say':
            addString(command.text);
            break;
          case 'ask':
            addString(command.question);
            for (const option of command.options) addString(option);
            pendingAsks.push(command.id);
            break;
          case 'hud':
            if (command.label !== undefined) addString(command.label);
            break;
        }
        stage.apply(command);
      },
    },
    { worker: options.worker, budgets: options.budgets },
  );
  handle.onError((e) => errors.push(e));
  handle.onBudget((b) => breaches.push(b));

  handle.pushState(stage.state());
  handle.start(options.seed ?? 1);

  const tapEvery = Math.max(1, Math.round(SCRIPTED_INPUTS.tapInterval * rate));
  const tapFrom = Math.round(SCRIPTED_INPUTS.tapStart * rate);
  const dialAt = Math.round(SCRIPTED_INPUTS.dialAt * rate);
  const flickAt = Math.round(SCRIPTED_INPUTS.flickAt * rate);
  let tapIndex = 0;

  try {
    for (let i = 1; i <= total; i++) {
      if (handle.status === 'failed' || handle.status === 'stopped') break;
      stage.step(dt);
      const time = i * dt;
      handle.pushState(stage.state());
      for (const c of stage.collisions())
        handle.pushEvent({ type: 'collision', a: c.a, b: c.b, impulse: c.impulse });
      if (i >= tapFrom && (i - tapFrom) % tapEvery === 0) {
        const targets = stage.tappable();
        if (targets.length > 0) {
          const id = targets[tapIndex % targets.length]!;
          tapIndex += 1;
          const at = stage.position(id) ?? { x: 8, y: 4.5 };
          stage.tap(id, at);
          handle.pushEvent({ type: 'tap', target: id, x: at.x, y: at.y });
          stats.taps += 1;
        }
      }
      if (i === dialAt) {
        const d = stage.dials()[0];
        if (d) {
          stage.dial(d.dial, d.value);
          handle.pushEvent({ type: 'dial', dial: d.dial, value: d.value });
        }
      }
      if (i === flickAt) {
        const id = stage.hero() ?? stage.tappable()[0];
        if (id && stage.position(id)) {
          const v = SCRIPTED_INPUTS.flickVelocity;
          stage.flick(id, v);
          handle.pushEvent({ type: 'flick', target: id, vx: v.x, vy: v.y });
        }
      }
      handle.pushEvent({ type: 'tick', time, dt });
      for (const id of pendingAsks.splice(0)) handle.answer(id, 0);
      stats.ticks = i;
      await handle.drain();
      if (errors.length > 0 || breaches.length > 0) break;
    }
  } finally {
    handle.stop();
    stage.dispose?.();
  }

  stats.errors = errors.length;
  const breach = breaches[0];
  if (breach) return { ok: false, reason: 'budget', detail: breach, stats };
  const error = errors[0];
  if (error) return { ok: false, reason: 'runtime', detail: error, stats };
  if (!stats.won && (stats.commands.score ?? 0) === 0)
    return {
      ok: false,
      reason: 'no-goal',
      detail: { message: 'the script never called game.score or game.win during the run' },
      stats,
    };
  return { ok: true, stats };
}
