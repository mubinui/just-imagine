import {
  createGameHost,
  type Command,
  type GameEvent,
  type GameState,
  type SoundCue,
  type WorkerFactory,
} from '@just-imagine/game-runtime';
import type { Engine, EngineEvent } from '@just-imagine/engine';
import type { CueName } from './sound/manifest';

/**
 * Connects a generated game script (Game API v1, running in the sandboxed
 * worker from `@just-imagine/game-runtime`) to the mounted engine. The engine
 * keeps the physics; the bridge streams body states and events to the worker
 * at 20 Hz and applies the script's commands through the engine's public game
 * API, so a script can never bypass the material table or the spawn budget.
 */

/** The engine surface the bridge drives; a headless `Simulation` satisfies it too. */
export type GameEngine = Pick<
  Engine,
  | 'subscribe'
  | 'frame'
  | 'spawn'
  | 'remove'
  | 'impulse'
  | 'move'
  | 'setGravity'
  | 'setWind'
  | 'setMaterial'
  | 'celebrate'
>;

export interface GameHud {
  score?: number;
  lives?: number;
  /** Seconds shown on the timer pill. */
  timer?: number;
  label?: string;
  level?: number;
  outcome?: 'won' | 'lost';
}

export interface GameAsk {
  id: number;
  question: string;
  options: string[];
}

export interface GameBridgeCallbacks {
  onHud(hud: GameHud): void;
  /** A line for the caption (and the friend's voice when it is live). */
  onSay(text: string): void;
  /** A question sheet to show, or undefined once it is answered. */
  onAsk(ask: GameAsk | undefined): void;
  onSound(cue: CueName): void;
  /** The script broke a budget, threw, or failed the static check: show the recovery state. */
  onTangled(reason: string): void;
}

export interface GameBridgeOptions {
  /** Worker factory; defaults to the browser Blob-URL worker. */
  worker?: WorkerFactory;
  seed?: number;
  /** State and tick rate. Default 20 Hz. */
  rateHz?: number;
}

export interface GameBridge {
  /** Answers the open `game.ask` sheet. */
  answer(index: number): void;
  stop(): void;
}

const CUES: Record<SoundCue, CueName> = {
  boing: 'boing',
  splat: 'splat',
  splash: 'splash',
  whoosh: 'whoosh',
  ding: 'ding',
  pop: 'pop',
  tada: 'success',
  buzz: 'fail_soft',
};

/** Game API sound cues mapped onto the Studio sound pack. */
export function gameCue(cue: SoundCue): CueName {
  return CUES[cue];
}

const point = (value: unknown): { x: number; y: number } | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const { x, y } = value as { x?: unknown; y?: unknown };
  return typeof x === 'number' && typeof y === 'number' && Number.isFinite(x) && Number.isFinite(y)
    ? { x, y }
    : undefined;
};

function stateOf(engine: GameEngine): GameState {
  const frame = engine.frame();
  return {
    time: frame.time,
    entities: frame.entities.slice(0, 512).map((p) => ({
      id: p.id,
      tags: (p.tags ?? []).slice(0, 16),
      x: p.x,
      y: p.y,
      rotation: p.rotation,
      vx: p.vx,
      vy: p.vy,
      width: p.width,
      height: p.height,
      ...(p.templateId && p.templateId !== p.id ? { templateId: p.templateId } : {}),
    })),
  };
}

/** Maps an engine event to the Game API event the worker understands, if any. */
function gameEventFor(engine: GameEngine, event: EngineEvent): GameEvent | undefined {
  switch (event.type) {
    case 'contact':
      return event.a && event.b
        ? { type: 'collision', a: event.a, b: event.b, impulse: event.impulse ?? 0 }
        : undefined;
    case 'tap': {
      const at = point(event.value) ??
        point(engine.frame().entities.find((p) => p.id === event.target)) ?? { x: 8, y: 4.5 };
      return { type: 'tap', ...(event.target ? { target: event.target } : {}), ...at };
    }
    case 'drag': {
      const at = point(event.value);
      return event.target && at ? { type: 'drag', target: event.target, ...at } : undefined;
    }
    case 'flick': {
      const v = point(event.value);
      return event.target && v
        ? { type: 'flick', target: event.target, vx: v.x, vy: v.y }
        : undefined;
    }
    case 'dial':
      return event.target && typeof event.value === 'string'
        ? ({ type: 'dial', dial: event.target, value: event.value } as GameEvent)
        : undefined;
    case 'variable':
      return event.target && typeof event.value === 'number'
        ? { type: 'variable', id: event.target, value: event.value }
        : undefined;
    default:
      return undefined;
  }
}

export function mountGameBridge(
  engine: GameEngine,
  source: string,
  callbacks: GameBridgeCallbacks,
  options: GameBridgeOptions = {},
): GameBridge {
  const hud: GameHud = {};
  let ask: GameAsk | undefined;
  let stopped = false;
  let interval: ReturnType<typeof setInterval> | undefined;
  let unsubscribe = () => {};
  const showHud = () => callbacks.onHud({ ...hud });

  const apply = (command: Command) => {
    switch (command.type) {
      case 'spawn':
        engine.spawn(command.template, { x: command.x, y: command.y }, command.tags, {
          id: command.id,
          ...(command.material ? { material: command.material } : {}),
        });
        return;
      case 'remove':
        engine.remove(command.target);
        return;
      case 'impulse':
        engine.impulse(command.target, { x: command.x, y: command.y });
        return;
      case 'move':
        engine.move(command.target, { x: command.x, y: command.y });
        return;
      case 'setGravity':
        engine.setGravity({ x: command.x, y: command.y });
        return;
      case 'setWind':
        engine.setWind({ x: command.x, y: command.y });
        return;
      case 'setMaterial':
        engine.setMaterial(command.target, command.material);
        return;
      case 'score':
        hud.score = (hud.score ?? 0) + command.delta;
        showHud();
        return;
      case 'lives':
        hud.lives = (hud.lives ?? 0) + command.delta;
        showHud();
        return;
      case 'level':
        hud.level = command.n;
        showHud();
        return;
      case 'win':
      case 'lose':
        hud.outcome = command.type === 'win' ? 'won' : 'lost';
        showHud();
        return;
      case 'hud':
        if (command.score !== undefined) hud.score = command.score;
        if (command.lives !== undefined) hud.lives = command.lives;
        if (command.timer !== undefined) hud.timer = command.timer;
        if (command.label !== undefined) hud.label = command.label;
        showHud();
        return;
      case 'say':
        callbacks.onSay(command.text);
        return;
      case 'ask':
        ask = { id: command.id, question: command.question, options: command.options };
        callbacks.onAsk(ask);
        return;
      case 'sound':
        callbacks.onSound(gameCue(command.cue));
        return;
      case 'celebrate':
        engine.celebrate(command.style);
        return;
      default:
        return;
    }
  };

  const handle = createGameHost(
    source,
    { onCommand: (command) => !stopped && apply(command) },
    options.worker ? { worker: options.worker } : {},
  );

  const stop = () => {
    if (stopped) return;
    stopped = true;
    if (interval !== undefined) clearInterval(interval);
    unsubscribe();
    handle.stop();
  };
  const tangle = (reason: string) => {
    if (stopped) return;
    stop();
    callbacks.onTangled(reason);
  };
  handle.onError((error) => tangle(error.message));
  handle.onBudget((b) => tangle(`the ${b.kind} budget was exceeded`));

  const push = (event: GameEvent) => {
    if (stopped) return;
    try {
      handle.pushEvent(event);
    } catch {
      // An event the worker protocol cannot carry (an odd id, say) is dropped, not fatal.
    }
  };

  handle.pushState(stateOf(engine));
  showHud();
  handle.start(options.seed ?? 1);
  for (const [id, value] of Object.entries(engine.frame().variables ?? {}))
    push({ type: 'variable', id, value });
  if (stopped) return { answer: () => {}, stop };

  unsubscribe = engine.subscribe((event) => {
    const mapped = gameEventFor(engine, event);
    if (mapped) push(mapped);
  });
  let last = engine.frame().time;
  interval = setInterval(
    () => {
      if (stopped) return;
      const state = stateOf(engine);
      try {
        handle.pushState(state);
      } catch {
        return;
      }
      if (state.time < last) last = state.time;
      if (state.time > last) {
        push({ type: 'tick', time: state.time, dt: state.time - last });
        last = state.time;
      }
    },
    1000 / (options.rateHz ?? 20),
  );

  return {
    answer(index) {
      if (!ask || stopped) return;
      handle.answer(ask.id, index);
      ask = undefined;
      callbacks.onAsk(undefined);
    },
    stop,
  };
}
