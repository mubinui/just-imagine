import { BUDGETS, type Budgets, type BudgetBreach } from './budgets';
import { checkScript, type ScriptIssue } from './static-check';
import { buildWorkerSource } from './worker-shim';
import {
  GameEventSchema,
  GameStateSchema,
  WorkerMessageSchema,
  type Command,
  type GameEvent,
  type GameState,
  type HostMessage,
} from './protocol';

/** The slice of a Worker the host needs; lets tests and Node supply their own. */
export interface WorkerLike {
  postMessage(message: unknown): void;
  terminate(): void;
  onMessage(cb: (message: unknown) => void): void;
  onError(cb: (error: Error) => void): void;
}

export type WorkerFactory = (source: string) => WorkerLike;

export interface GameBridge {
  /** Receives every validated command the script issues, in order. */
  onCommand(command: Command): void;
}

export interface GameHostOptions {
  /** Creates the worker from the shimmed source. Defaults to a browser Blob worker. */
  worker?: WorkerFactory;
  budgets?: Partial<Budgets>;
}

export type GameError =
  | { code: 'static'; message: string; errors: ScriptIssue[] }
  | {
      code: 'runtime';
      message: string;
      phase: 'init' | 'handler' | 'timer' | 'async';
      line?: number;
      where?: string;
    }
  | { code: 'worker'; message: string };

export type GameStatus = 'idle' | 'starting' | 'running' | 'stopped' | 'failed';

export interface GameHandle {
  /** Runs the static check, creates the worker and starts the script with the seed. */
  start(seed: number): void;
  /** Terminates the worker. */
  stop(): void;
  /** Pushes an engine event; throws when the event is malformed. */
  pushEvent(event: GameEvent): void;
  /** Pushes the latest body states; throws when malformed. */
  pushState(state: GameState): void;
  /** Answers a `game.ask` prompt. */
  answer(id: number, index: number): void;
  onError(cb: (error: GameError) => void): () => void;
  onBudget(cb: (breach: BudgetBreach) => void): () => void;
  onLog(cb: (args: string[]) => void): () => void;
  /** Resolves once every pushed event has been acknowledged, or the game has ended. */
  drain(): Promise<void>;
  readonly status: GameStatus;
}

function blobWorkerFactory(source: string): WorkerLike {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }));
  const worker = new Worker(url, { name: 'game-script' });
  return {
    postMessage: (m) => worker.postMessage(m),
    terminate: () => {
      worker.terminate();
      URL.revokeObjectURL(url);
    },
    onMessage: (cb) => {
      worker.onmessage = (e) => cb(e.data);
    },
    onError: (cb) => {
      worker.onerror = (e) => cb(e.error instanceof Error ? e.error : new Error(e.message));
    },
  };
}

interface Listeners {
  error: Set<(error: GameError) => void>;
  budget: Set<(breach: BudgetBreach) => void>;
  log: Set<(args: string[]) => void>;
}

interface SpawnRecord {
  template: string;
  tags: string[];
}

export function createGameHost(
  source: string,
  bridge: GameBridge,
  options: GameHostOptions = {},
): GameHandle {
  const budgets: Budgets = { ...BUDGETS, ...options.budgets };
  const factory = options.worker ?? blobWorkerFactory;
  const listeners: Listeners = { error: new Set(), budget: new Set(), log: new Set() };

  let status: GameStatus = 'idle';
  let worker: WorkerLike | undefined;
  let ready = false;
  let seq = 0;
  const outbox: HostMessage[] = [];
  const pending: { seq: number; at: number; type: string }[] = [];
  const drainWaiters: (() => void)[] = [];
  const spawned = new Map<string, SpawnRecord>();
  const timers = new Set<number>();
  let hangTimer: ReturnType<typeof setTimeout> | undefined;
  let readyTimer: ReturnType<typeof setTimeout> | undefined;

  const emitError = (error: GameError) => {
    for (const cb of listeners.error) cb(error);
  };
  const emitBudget = (breach: BudgetBreach) => {
    for (const cb of listeners.budget) cb(breach);
  };

  const live = () => status === 'starting' || status === 'running';
  const inFlight = () => pending.length > 0 || outbox.some((m) => m.type === 'event');
  const settleDrain = () => {
    if (live() && inFlight()) return;
    for (const resolve of drainWaiters.splice(0)) resolve();
  };

  const terminate = (next: 'stopped' | 'failed') => {
    if (status === 'stopped' || status === 'failed') return;
    status = next;
    if (hangTimer !== undefined) clearTimeout(hangTimer);
    if (readyTimer !== undefined) clearTimeout(readyTimer);
    hangTimer = readyTimer = undefined;
    worker?.terminate();
    settleDrain();
  };

  const fail = (error: GameError) => {
    emitError(error);
    terminate('failed');
  };

  const breach = (b: BudgetBreach) => {
    emitBudget(b);
    terminate('failed');
  };

  const armHangTimer = () => {
    if (hangTimer !== undefined) clearTimeout(hangTimer);
    hangTimer = undefined;
    const oldest = pending[0];
    if (!oldest || status !== 'running') return;
    const wait = Math.max(0, oldest.at + budgets.hangMs - Date.now());
    hangTimer = setTimeout(() => {
      hangTimer = undefined;
      const head = pending[0];
      if (!head || status !== 'running') return;
      const age = Date.now() - head.at;
      if (age < budgets.hangMs) {
        armHangTimer();
        return;
      }
      breach({ kind: 'hang', value: age, limit: budgets.hangMs, where: head.type });
    }, wait);
  };

  const send = (message: HostMessage) => {
    if (status === 'idle') {
      // Only state may be queued before start, so a script can `game.find` at init.
      if (message.type === 'state') outbox.push(message);
      return;
    }
    if (status !== 'starting' && status !== 'running') return;
    if (!ready) {
      outbox.push(message);
      return;
    }
    if (message.type === 'event') {
      pending.push({ seq: message.seq, at: Date.now(), type: message.event.type });
      if (pending.length === 1) armHangTimer();
    }
    worker?.postMessage(message);
  };

  const applyCommand = (command: Command): boolean => {
    switch (command.type) {
      case 'spawn': {
        spawned.set(command.id, { template: command.template, tags: command.tags });
        if (spawned.size > budgets.maxBodies) {
          breach({ kind: 'bodies', value: spawned.size, limit: budgets.maxBodies, where: 'spawn' });
          return false;
        }
        break;
      }
      case 'remove':
        for (const [id, record] of spawned)
          if (
            id === command.target ||
            record.template === command.target ||
            record.tags.includes(command.target)
          )
            spawned.delete(id);
        break;
      case 'timer-set':
        timers.add(command.id);
        if (timers.size > budgets.maxTimers) {
          breach({
            kind: 'timers',
            value: timers.size,
            limit: budgets.maxTimers,
            where: 'timer-set',
          });
          return false;
        }
        break;
      case 'timer-clear':
        timers.delete(command.id);
        break;
    }
    bridge.onCommand(command);
    return true;
  };

  const onWorkerMessage = (raw: unknown) => {
    if (status !== 'starting' && status !== 'running') return;
    const parsed = WorkerMessageSchema.safeParse(raw);
    if (!parsed.success) {
      const type = (raw as { type?: unknown } | null)?.type;
      fail({
        code: 'worker',
        message: `the worker sent an invalid ${typeof type === 'string' ? type : 'message'}${
          type === 'commands' ? ' command' : ''
        }`,
      });
      return;
    }
    const message = parsed.data;
    switch (message.type) {
      case 'ready': {
        if (ready) return;
        ready = true;
        status = 'running';
        if (readyTimer !== undefined) clearTimeout(readyTimer);
        readyTimer = undefined;
        for (const queued of outbox.splice(0)) send(queued);
        return;
      }
      case 'ack': {
        const index = pending.findIndex((p) => p.seq === message.seq);
        if (index >= 0) pending.splice(0, index + 1);
        armHangTimer();
        settleDrain();
        return;
      }
      case 'commands': {
        for (const command of message.commands) if (!applyCommand(command)) return;
        return;
      }
      case 'budget':
        breach({
          kind: message.kind,
          value: message.value,
          limit: message.limit,
          ...(message.where !== undefined ? { where: message.where } : {}),
        });
        return;
      case 'error':
        emitError({
          code: 'runtime',
          message: message.message,
          phase: message.phase,
          ...(message.line !== undefined ? { line: message.line } : {}),
          ...(message.where !== undefined ? { where: message.where } : {}),
        });
        return;
      case 'log':
        for (const cb of listeners.log) cb(message.args);
        return;
    }
  };

  return {
    get status() {
      return status;
    },
    start(seed) {
      if (status !== 'idle') return;
      const check = checkScript(source);
      if (!check.ok) {
        status = 'failed';
        emitError({
          code: 'static',
          message: check.errors.map((e) => `line ${e.line}: ${e.message}`).join('; '),
          errors: check.errors,
        });
        return;
      }
      status = 'starting';
      worker = factory(buildWorkerSource(source, { budgets }));
      worker.onMessage(onWorkerMessage);
      worker.onError((error) =>
        fail({ code: 'worker', message: `the worker crashed: ${error.message}` }),
      );
      outbox.push({ type: 'start', seed });
      readyTimer = setTimeout(() => {
        readyTimer = undefined;
        if (!ready) fail({ code: 'worker', message: 'the worker never reported ready' });
      }, budgets.readyMs);
    },
    stop() {
      terminate('stopped');
    },
    pushEvent(event) {
      const parsed = GameEventSchema.safeParse(event);
      if (!parsed.success) throw new Error(`invalid game event: ${parsed.error.message}`);
      send({ type: 'event', seq: ++seq, event: parsed.data });
    },
    pushState(state) {
      const parsed = GameStateSchema.safeParse(state);
      if (!parsed.success) throw new Error(`invalid game state: ${parsed.error.message}`);
      send({ type: 'state', state: parsed.data });
    },
    answer(id, index) {
      send({ type: 'answer', id, index });
    },
    onError(cb) {
      listeners.error.add(cb);
      return () => listeners.error.delete(cb);
    },
    onBudget(cb) {
      listeners.budget.add(cb);
      return () => listeners.budget.delete(cb);
    },
    onLog(cb) {
      listeners.log.add(cb);
      return () => listeners.log.delete(cb);
    },
    drain() {
      if (!live() || !inFlight()) return Promise.resolve();
      return new Promise((resolve) => drainWaiters.push(resolve));
    },
  };
}
