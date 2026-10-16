import { describe, it, expect, vi, afterEach } from 'vitest';
import { createSimulation, type Simulation } from '@just-imagine/engine';
import { GAME_WORLDS, FIXTURE_WORLDS } from '@just-imagine/fixtures';
import { nodeWorkerFactory } from '@just-imagine/game-runtime/node';
import type { WorkerLike } from '@just-imagine/game-runtime';
import {
  mountGameBridge,
  gameCue,
  type GameBridgeCallbacks,
  type GameHud,
} from '../lib/game-bridge';

class FakeWorker implements WorkerLike {
  sent: Record<string, unknown>[] = [];
  terminated = false;
  private listener: (m: unknown) => void = () => {};
  postMessage(message: unknown) {
    this.sent.push(message as Record<string, unknown>);
  }
  terminate() {
    this.terminated = true;
  }
  onMessage(cb: (m: unknown) => void) {
    this.listener = cb;
  }
  onError() {}
  emit(message: unknown) {
    this.listener(message);
  }
  of(type: string) {
    return this.sent.filter((m) => m.type === type);
  }
}

function callbacks() {
  const calls = {
    hud: [] as GameHud[],
    say: [] as string[],
    ask: [] as unknown[],
    sound: [] as string[],
    tangled: [] as string[],
  };
  const cb: GameBridgeCallbacks = {
    onHud: (hud) => calls.hud.push(hud),
    onSay: (text) => calls.say.push(text),
    onAsk: (ask) => calls.ask.push(ask),
    onSound: (cue) => calls.sound.push(cue),
    onTangled: (reason) => calls.tangled.push(reason),
  };
  return { cb, calls };
}

let sims: Simulation[] = [];
afterEach(() => {
  for (const s of sims) s.dispose();
  sims = [];
  vi.useRealTimers();
});
async function sim(doc = FIXTURE_WORLDS.moonBounce) {
  const s = await createSimulation(doc);
  sims.push(s);
  return s;
}

describe('gameCue', () => {
  it('maps Game API cues to the sound pack, tada to success and buzz to fail_soft', () => {
    expect(gameCue('pop')).toBe('pop');
    expect(gameCue('boing')).toBe('boing');
    expect(gameCue('tada')).toBe('success');
    expect(gameCue('buzz')).toBe('fail_soft');
  });
});

describe('mountGameBridge with a scripted worker', () => {
  async function mounted() {
    vi.useFakeTimers();
    const engine = await sim();
    const worker = new FakeWorker();
    const { cb, calls } = callbacks();
    const bridge = mountGameBridge(engine, 'game.score(1);', cb, { worker: () => worker });
    worker.emit({ type: 'ready' });
    return { engine, worker, calls, bridge };
  }

  it('starts the script with the engine state, then streams state and ticks at 20 Hz', async () => {
    const { engine, worker, bridge } = await mounted();
    expect(worker.of('state')[0]).toMatchObject({
      state: {
        entities: expect.arrayContaining([
          expect.objectContaining({ id: 'ball', tags: ['ball', 'hero'] }),
        ]),
      },
    });
    expect(worker.of('start')).toHaveLength(1);
    engine.step(6);
    vi.advanceTimersByTime(50);
    expect(worker.of('state').length).toBeGreaterThanOrEqual(2);
    expect(worker.of('event').map((m) => (m.event as { type: string }).type)).toContain('tick');
    bridge.stop();
    expect(worker.terminated).toBe(true);
  });

  it('forwards taps with world coordinates and contacts as collisions', async () => {
    const { engine, worker } = await mounted();
    engine.tap('ball', { x: 5, y: 2 });
    engine.tap('', { x: 14, y: 6 });
    engine.setGravity({ x: 0, y: 9.81 });
    engine.step(240);
    const events = worker.of('event').map((m) => m.event as Record<string, unknown>);
    expect(events).toContainEqual({ type: 'tap', target: 'ball', x: 5, y: 2 });
    expect(events).toContainEqual({ type: 'tap', x: 14, y: 6 });
    expect(events.some((e) => e.type === 'collision')).toBe(true);
  });

  it('applies commands through the engine and reports HUD, say, ask and sound', async () => {
    const { engine, worker, calls, bridge } = await mounted();
    worker.emit({
      type: 'commands',
      commands: [
        { type: 'spawn', id: 's1_ball', template: 'ball', x: 12, y: 3, tags: ['extra'] },
        { type: 'setGravity', x: 0, y: 0 },
        { type: 'impulse', target: 's1_ball', x: 2, y: 0 },
        { type: 'remove', target: 'bolt' },
        { type: 'score', delta: 2 },
        { type: 'lives', delta: 3 },
        { type: 'hud', timer: 30, label: 'Catch them' },
        { type: 'level', n: 2 },
        { type: 'say', text: 'Go!' },
        { type: 'ask', id: 1, question: 'Ready?', options: ['Yes', 'No'] },
        { type: 'sound', cue: 'tada' },
        { type: 'celebrate', style: 'confetti' },
      ],
    });
    const frame = engine.frame();
    expect(frame.entities.find((p) => p.id === 's1_ball')?.tags).toEqual(['ball', 'hero', 'extra']);
    expect(frame.entities.find((p) => p.id === 's1_ball')?.vx).toBeCloseTo(2, 3);
    expect(frame.entities.some((p) => p.id === 'bolt_toy')).toBe(false);
    expect(frame.gravity).toEqual({ x: 0, y: 0 });
    expect(calls.hud.at(-1)).toEqual({
      score: 2,
      lives: 3,
      timer: 30,
      label: 'Catch them',
      level: 2,
    });
    expect(calls.say).toEqual(['Go!']);
    expect(calls.ask).toEqual([{ id: 1, question: 'Ready?', options: ['Yes', 'No'] }]);
    expect(calls.sound).toEqual(['success']);
    bridge.answer(0);
    expect(worker.of('answer')).toEqual([{ type: 'answer', id: 1, index: 0 }]);
    expect(calls.ask.at(-1)).toBeUndefined();
  });

  it('reports a win or a loss on the HUD', async () => {
    const { worker, calls } = await mounted();
    worker.emit({ type: 'commands', commands: [{ type: 'win' }] });
    expect(calls.hud.at(-1)).toMatchObject({ outcome: 'won' });
  });

  it('shows the tangled state on a budget breach or a runtime error', async () => {
    const a = await mounted();
    a.worker.emit({ type: 'budget', kind: 'handler', value: 12, limit: 8, where: 'tick' });
    expect(a.calls.tangled).toHaveLength(1);
    expect(a.worker.terminated).toBe(true);
    const b = await mounted();
    b.worker.emit({ type: 'error', message: 'boom', phase: 'handler' });
    expect(b.calls.tangled).toHaveLength(1);
    expect(b.worker.terminated).toBe(true);
  });

  it('shows the tangled state for a script that fails the static check', async () => {
    const engine = await sim();
    const { cb, calls } = callbacks();
    mountGameBridge(engine, 'fetch("x"); game.score(1);', cb, { worker: () => new FakeWorker() });
    expect(calls.tangled).toHaveLength(1);
  });
});

describe('mountGameBridge with the real sandbox', () => {
  it('runs an interactive toy without introducing a score', async () => {
    const engine = await sim();
    const { cb, calls } = callbacks();
    const bridge = mountGameBridge(
      engine,
      "game.say('Ready');game.on('tap',()=>game.move('ball',{x:8,y:3}));",
      cb,
      { worker: nodeWorkerFactory },
    );
    try {
      await vi.waitFor(() => expect(calls.say).toContain('Ready'));
      engine.tap('ball');
      await vi.waitFor(() =>
        expect(engine.frame().entities.find((e) => e.id === 'ball')?.x).toBeCloseTo(8),
      );
      expect(calls.hud.every((hud) => hud.score === undefined)).toBe(true);
      expect(calls.tangled).toEqual([]);
    } finally {
      bridge.stop();
    }
  });
  it('plays the fixture game: a tap on a fly scores', async () => {
    const doc = GAME_WORLDS.catchTheFlies;
    const engine = await sim(doc);
    const { cb, calls } = callbacks();
    const bridge = mountGameBridge(engine, doc.game!.script.source, cb, {
      worker: nodeWorkerFactory,
    });
    await vi.waitFor(() => expect(calls.ask).toHaveLength(1), { timeout: 5000 });
    expect(calls.say[0]).toMatch(/owl/);
    expect(calls.hud.at(-1)).toMatchObject({ score: 0, timer: 45 });
    bridge.answer(0);
    const fly = engine.frame().entities.find((p) => p.id === 'fly_1')!;
    engine.tap('fly_1', { x: fly.x, y: fly.y });
    await vi.waitFor(() => expect(calls.hud.at(-1)?.score).toBe(1), { timeout: 5000 });
    expect(engine.frame().entities.some((p) => p.id === 'fly_1')).toBe(false);
    expect(calls.sound).toContain('pop');
    expect(calls.tangled).toEqual([]);
    // Game time follows the engine: the script's one-second timer counts down.
    const timer = setInterval(() => engine.step(6), 50);
    await vi.waitFor(() => expect(calls.hud.at(-1)?.timer).toBeLessThan(42), { timeout: 5000 });
    clearInterval(timer);
    bridge.stop();
  });
});

it('passes initial and live custom rule values into the real game sandbox without changing physics', async () => {
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
  doc.variables = {
    target: {
      label: 'Stars to find',
      min: 2,
      max: 12,
      step: 1,
      value: 5,
      unit: '',
      binds: { kind: 'game' },
    },
  };
  const engine = await sim(doc);
  const { cb, calls } = callbacks();
  const bridge = mountGameBridge(
    engine,
    'let target=0; game.score(0); game.on("variable", e => { if(e.id === "target") { target=e.value; game.hud({label:"Find " + target}); } }); game.on("tap", () => game.score(target));',
    cb,
    { worker: nodeWorkerFactory },
  );
  try {
    await vi.waitFor(() => expect(calls.hud.at(-1)?.label).toBe('Find 5'));
    const gravity = { ...engine.frame().gravity };
    engine.setVariable('target', 9.6);
    await vi.waitFor(() => expect(calls.hud.at(-1)?.label).toBe('Find 10'));
    engine.tap('ball');
    await vi.waitFor(() => expect(calls.hud.at(-1)?.score).toBe(10));
    expect(engine.frame().gravity).toEqual(gravity);
    expect(calls.tangled).toEqual([]);
  } finally {
    bridge.stop();
  }
});

it('makes a custom orbit-speed control change a static character path through the real sandbox', async () => {
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce);
  const planet = doc.entities.find((e) => e.id === 'bolt_toy')!;
  planet.body.isStatic = true;
  doc.variables = {
    orbit_speed: {
      label: 'Orbit speed',
      min: 1,
      max: 4,
      step: 1,
      value: 1,
      unit: '×',
      binds: { kind: 'game' },
    },
  };
  const engine = await sim(doc);
  const { cb, calls } = callbacks();
  const bridge = mountGameBridge(
    engine,
    'let speed=1; let phase=0; game.score(0); game.say("Orbit ready"); game.on("variable", e => { if(e.id === "orbit_speed") speed=e.value; }); game.on("tick", e => { phase += e.dt*speed; game.move("bolt_toy", {x:8+Math.cos(phase),y:3+Math.sin(phase)}); });',
    cb,
    { worker: nodeWorkerFactory },
  );
  const at = () => engine.frame().entities.find((e) => e.id === 'bolt_toy')!;
  try {
    await vi.waitFor(() => expect(calls.say).toContain('Orbit ready'));
    engine.step(6);
    await vi.waitFor(() => expect(at().x).toBeCloseTo(8 + Math.cos(0.1), 3));
    engine.setVariable('orbit_speed', 4);
    engine.step(6);
    await vi.waitFor(() => expect(at().x).toBeCloseTo(8 + Math.cos(0.5), 3));
    expect(at().y).toBeCloseTo(3 + Math.sin(0.5), 3);
    expect(calls.tangled).toEqual([]);
  } finally {
    bridge.stop();
  }
});
