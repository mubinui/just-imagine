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
  drag?(id: string, at: { x: number; y: number }): void;
  release?(id: string): void;
  dial(dial: Dial, value: string): void;
  apply(command: Command): void;
  dispose?(): void;
}

export interface DriveOptions {
  seconds: number;
  /** Open-ended toys need no score or terminal win condition. Defaults to true. */
  requireGoal?: boolean;
  seed?: number;
  worker?: WorkerFactory;
  budgets?: Partial<Budgets>;
  /** Ticks and state pushes per simulated second. Default 20. */
  rate?: number;
  /** Exact child input playback. Even an empty array disables synthetic input. */
  playback?: TimedInput[];
  /** Browser parity: dispatch each scene default once after start and before the first tick. */
  initialVariables?: Record<string, number>;
  /** Trusted host observer; never supplied as executable model output. */
  onFrame?: (time: number, state: GameState, commands: readonly Command[]) => void;
}

export type TimedInput = { at: number } & (
  | { type: 'tap'; target?: string; x?: number; y?: number }
  | { type: 'drag'; target: string; x: number; y: number }
  | { type: 'release'; target: string }
  | { type: 'flick'; target: string; vx: number; vy: number }
  | { type: 'answer'; choice: number }
);

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
  if (!check.ok) {
    stage.dispose?.();
    return { ok: false, reason: 'static', detail: { errors: check.errors }, stats };
  }
  const calls = scanApiCalls(source);
  if (options.requireGoal !== false && !calls.has('win') && !calls.has('score')) {
    stage.dispose?.();
    return {
      ok: false,
      reason: 'no-goal',
      detail: { message: 'the script never calls game.win or game.score' },
      stats,
    };
  }

  const errors: GameError[] = [];
  const breaches: BudgetBreach[] = [];
  const pendingAsks: { id: number; choices: number }[] = [];
  const frameCommands: Command[] = [];
  const handle = createGameHost(
    source,
    {
      onCommand: (command) => {
        if (options.onFrame) frameCommands.push(command);
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
            pendingAsks.push({ id: command.id, choices: command.options.length });
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
  const playback = [...(options.playback ?? [])].sort((a, b) => a.at - b.at);
  let inputIndex = 0;

  const play = (input: TimedInput) => {
    if (input.type === 'answer') {
      const question = pendingAsks.shift();
      if (question === undefined) throw new Error('No question is waiting for the scripted answer');
      if (input.choice < 0 || input.choice >= question.choices)
        throw new Error('The scripted answer is outside the available choices');
      handle.answer(question.id, input.choice);
      return;
    }
    const position = input.target ? stage.position(input.target) : undefined;
    if (input.target && !position) throw new Error(`Input target ${input.target} is missing`);
    if (input.type === 'tap') {
      const x = input.x ?? position?.x;
      const y = input.y ?? position?.y;
      if (x === undefined || y === undefined) throw new Error('A stage tap needs coordinates');
      if (input.target) stage.tap(input.target, { x, y });
      handle.pushEvent({ type: 'tap', ...(input.target ? { target: input.target } : {}), x, y });
      stats.taps += 1;
    } else if (input.type === 'drag') {
      if (!stage.drag) throw new Error('Stage does not support dragging');
      stage.drag(input.target, input);
      handle.pushEvent({ type: 'drag', target: input.target, x: input.x, y: input.y });
    } else if (input.type === 'release') {
      if (!stage.release) throw new Error('Stage does not support drag release');
      stage.release(input.target);
    } else {
      stage.flick(input.target, { x: input.vx, y: input.vy });
      handle.pushEvent({ type: 'flick', target: input.target, vx: input.vx, vy: input.vy });
    }
  };

  try {
    for (const [id, value] of Object.entries(options.initialVariables ?? {}))
      handle.pushEvent({ type: 'variable', id, value });
    for (let i = 1; i <= total; i++) {
      if (handle.status === 'failed' || handle.status === 'stopped') break;
      stage.step(dt);
      const time = i * dt;
      handle.pushState(stage.state());
      for (const c of stage.collisions())
        handle.pushEvent({ type: 'collision', a: c.a, b: c.b, impulse: c.impulse });
      if (options.playback !== undefined) {
        while (inputIndex < playback.length && playback[inputIndex]!.at <= time + 1e-8) {
          play(playback[inputIndex++]!);
          // Let a question or scene change take effect before another input at this time.
          await handle.drain();
          handle.pushState(stage.state());
        }
      }
      if (options.playback === undefined && i >= tapFrom && (i - tapFrom) % tapEvery === 0) {
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
      if (options.playback === undefined && i === dialAt) {
        const d = stage.dials()[0];
        if (d) {
          stage.dial(d.dial, d.value);
          handle.pushEvent({ type: 'dial', dial: d.dial, value: d.value });
        }
      }
      if (options.playback === undefined && i === flickAt) {
        const id = stage.hero() ?? stage.tappable()[0];
        if (id && stage.position(id)) {
          const v = SCRIPTED_INPUTS.flickVelocity;
          stage.flick(id, v);
          handle.pushEvent({ type: 'flick', target: id, vx: v.x, vy: v.y });
        }
      }
      handle.pushEvent({ type: 'tick', time, dt });
      if (options.playback === undefined)
        for (const question of pendingAsks.splice(0)) handle.answer(question.id, 0);
      stats.ticks = i;
      await handle.drain();
      options.onFrame?.(time, stage.state(), frameCommands.splice(0));
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
  if (options.requireGoal !== false && !stats.won && (stats.commands.score ?? 0) === 0)
    return {
      ok: false,
      reason: 'no-goal',
      detail: { message: 'the script never called game.score or game.win during the run' },
      stats,
    };
  return { ok: true, stats };
}
