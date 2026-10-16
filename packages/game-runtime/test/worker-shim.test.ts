import { describe, it, expect, afterEach } from 'vitest';
import { parse } from 'acorn';
import { buildWorkerSource } from '../src/worker-shim';
import { spawnEvalWorker, type EvalWorker } from './helpers/node-worker';

const workers: EvalWorker[] = [];
afterEach(async () => {
  await Promise.all(workers.splice(0).map((w) => w.terminate()));
});

const ofType = (type: string) => (m: Record<string, unknown>) => m.type === type;

// Tests that are not about timing get generous wall-clock budgets so slow CI runners
// (first-call JIT, stack capture on throw) cannot trip the 8 ms handler limit.
const RELAXED_TIMING = { handlerMs: 1000, aggregateMsPerSecond: 5000 };

async function boot(script: string, budgets?: Record<string, number>, seed = 7) {
  const worker = spawnEvalWorker(
    buildWorkerSource(script, { budgets: { ...RELAXED_TIMING, ...budgets } }),
  );
  workers.push(worker);
  await worker.until(ofType('ready'));
  worker.send({ type: 'start', seed });
  return worker;
}

const state = (entities: Record<string, unknown>[], time = 0) => ({
  type: 'state',
  state: {
    time,
    entities: entities.map((e) => ({
      tags: [],
      x: 0,
      y: 0,
      rotation: 0,
      vx: 0,
      vy: 0,
      width: 1,
      height: 1,
      ...e,
    })),
  },
});

let seq = 0;
const event = (e: Record<string, unknown>) => ({ type: 'event', seq: ++seq, event: e });
const tick = (time: number) => event({ type: 'tick', time, dt: 0.05 });

describe('buildWorkerSource', () => {
  it('produces a script that parses as ECMAScript', () => {
    const source = buildWorkerSource(`game.on('tick', () => game.score(1));`);
    expect(() => parse(source, { ecmaVersion: 2022, sourceType: 'script' })).not.toThrow();
  });

  it('posts ready, runs handlers on events and acks each event with its time', async () => {
    const worker = await boot(
      `game.on('tick', (e) => { game.score(1); game.hud({ timer: e.time }); });`,
    );
    worker.send(tick(0.05));
    const commands = await worker.until<{ commands: unknown[] }>(ofType('commands'));
    expect(commands.commands).toEqual([
      { type: 'score', delta: 1 },
      { type: 'hud', timer: 0.05 },
    ]);
    const ack = await worker.until<{ seq: number; ms: number }>(ofType('ack'));
    expect(ack.seq).toBe(seq);
    expect(ack.ms).toBeGreaterThanOrEqual(0);
  });

  it('acks events that no handler listens to', async () => {
    const worker = await boot(`game.score(0);`);
    worker.send(tick(0.05));
    await worker.until((m) => m.type === 'ack' && m.seq === seq);
  });

  it('leaves no network, storage, messaging or timer globals reachable', async () => {
    const worker = await boot(`
      console.log(typeof fetch, typeof XMLHttpRequest, typeof WebSocket, typeof importScripts,
        typeof indexedDB, typeof caches, typeof localStorage, typeof postMessage, typeof setTimeout,
        typeof setInterval, typeof Atomics, typeof SharedArrayBuffer, typeof WebAssembly,
        typeof globalThis, typeof self, typeof window, typeof require, typeof process, typeof module,
        typeof Function, typeof eval, typeof navigator, typeof MessageChannel, typeof Worker);
    `);
    const log = await worker.until<{ args: string[] }>(ofType('log'));
    expect(new Set(log.args)).toEqual(new Set(['undefined']));
  });

  it('reports top-level errors with phase init and the script line', async () => {
    const worker = await boot(`game.score(1);\n\nconst x = {};\nx.missing.deep = 1;`);
    const error = await worker.until<{ message: string; phase: string; line: number }>(
      ofType('error'),
    );
    expect(error.phase).toBe('init');
    expect(error.message).toMatch(/setting 'deep'/);
    expect(error.line).toBe(4);
  });

  it('blocks the Function constructor reached through constructor chains', async () => {
    const worker = await boot(`({}).constructor.constructor('return this')();`);
    const error = await worker.until<{ message: string }>(ofType('error'));
    expect(error.message).toMatch(/Function constructor/);
    const worker2 = await boot(`(async () => {}).constructor('return this')();`);
    const error2 = await worker2.until<{ message: string }>(ofType('error'));
    expect(error2.message).toMatch(/Function constructor/);
  });

  it('blocks prototype pollution because the intrinsic prototypes are frozen', async () => {
    const worker = await boot(`({}).__proto__.polluted = true; game.win();`);
    const error = await worker.until<{ message: string }>(ofType('error'));
    expect(error.message).toMatch(/not extensible|read only|polluted/);
    const worker2 = await boot(`Object.prototype.polluted = true; game.win();`);
    await worker2.until(ofType('error'));
  });

  it('catches handler errors, reports them, and keeps running', async () => {
    const worker = await boot(`
      game.on('tick', (e) => { if (e.time < 0.1) throw new Error('first tick blew up'); game.score(1); });
    `);
    worker.send(tick(0.05));
    const error = await worker.until<{ message: string; phase: string; where: string }>(
      ofType('error'),
    );
    expect(error.phase).toBe('handler');
    expect(error.where).toBe('tick');
    expect(error.message).toMatch(/first tick blew up/);
    await worker.until((m) => m.type === 'ack' && m.seq === seq);
    worker.send(tick(0.1));
    const commands = await worker.until<{ commands: unknown[] }>(ofType('commands'));
    expect(commands.commands).toEqual([{ type: 'score', delta: 1 }]);
  });

  it('reports rejections from async handlers', async () => {
    const worker = await boot(`game.on('tap', async () => { throw new Error('async boom'); });`);
    worker.send(event({ type: 'tap', x: 1, y: 1 }));
    const error = await worker.until<{ message: string; phase: string }>(ofType('error'));
    expect(error.phase).toBe('async');
    expect(error.message).toMatch(/async boom/);
  });

  it('reports a handler over the per-handler budget', async () => {
    const worker = await boot(
      `game.on('tick', () => { let n = 0; for (let i = 0; i < 3e7; i++) n += i; game.score(n > 0 ? 1 : 0); });`,
      { handlerMs: 1 },
    );
    worker.send(tick(0.05));
    const budget = await worker.until<{
      kind: string;
      value: number;
      limit: number;
      where: string;
    }>(ofType('budget'));
    expect(budget.kind).toBe('handler');
    expect(budget.limit).toBe(1);
    expect(budget.value).toBeGreaterThan(1);
    expect(budget.where).toBe('tick');
  });

  it('reports script time over the aggregate budget within a second', async () => {
    const worker = await boot(
      `game.on('tick', () => { let n = 0; for (let i = 0; i < 2e6; i++) n += i; game.score(n > 0 ? 1 : 0); });`,
      { handlerMs: 1000, aggregateMsPerSecond: 2 },
    );
    for (let i = 1; i <= 30; i++) worker.send(tick(i * 0.05));
    const budget = await worker.until<{ kind: string }>(ofType('budget'));
    expect(budget.kind).toBe('aggregate');
  });

  it('runs every and after timers on game time and reports timer-set and timer-clear', async () => {
    const worker = await boot(`
      const beat = game.every(0.5, () => game.score(1));
      game.after(1.2, () => { game.win(); game.cancel(beat); });
      game.on('timer', (t) => game.hud({ label: 'timer ' + t.id + (t.repeat ? ' r' : ' once') }));
    `);
    const setup = await worker.until<{ commands: unknown[] }>(ofType('commands'));
    expect(setup.commands).toEqual([
      { type: 'timer-set', id: 1, seconds: 0.5, repeat: true },
      { type: 'timer-set', id: 2, seconds: 1.2, repeat: false },
    ]);
    const fired: unknown[] = [];
    for (let i = 1; i <= 26; i++) {
      worker.send(tick(i * 0.05));
      const ack = await worker.until((m) => m.type === 'ack' && m.seq === seq);
      expect(ack).toBeTruthy();
    }
    for (const m of worker.messages())
      if (m.type === 'commands') fired.push(...(m.commands as unknown[]));
    expect(fired.slice(2)).toEqual([
      { type: 'score', delta: 1 },
      { type: 'hud', label: 'timer 1 r' },
      { type: 'score', delta: 1 },
      { type: 'hud', label: 'timer 1 r' },
      { type: 'win' },
      { type: 'timer-clear', id: 1 },
      { type: 'hud', label: 'timer 2 once' },
      { type: 'timer-clear', id: 2 },
    ]);
  });

  it('refuses more timers than the budget', async () => {
    const worker = await boot(`for (let i = 0; i < 60; i++) game.every(1, () => game.score(1));`, {
      maxTimers: 50,
    });
    const budget = await worker.until<{ kind: string; value: number; limit: number }>(
      ofType('budget'),
    );
    expect(budget).toMatchObject({ kind: 'timers', value: 51, limit: 50 });
  });

  it('refuses more spawned bodies than the budget', async () => {
    const worker = await boot(
      `game.on('tick', () => { for (let i = 0; i < 10000; i++) game.spawn('fly', { x: i, y: 1, tags: ['fly'] }); });`,
      { maxBodies: 200 },
    );
    worker.send(tick(0.05));
    const budget = await worker.until<{ kind: string; value: number; limit: number }>(
      ofType('budget'),
    );
    expect(budget).toMatchObject({ kind: 'bodies', value: 201, limit: 200 });
  });

  it('spawns with generated ids and lets remove free the body budget', async () => {
    const worker = await boot(`
      const a = game.spawn('fly', { x: 1, y: 2, tags: ['buzz'] });
      const b = game.spawn('lib/meadow/acorn', { x: 3, y: 4, material: 'wood' });
      game.remove(a);
      game.remove('lib/meadow/acorn');
      console.log(a, b);
    `);
    const commands = await worker.until<{ commands: Record<string, unknown>[] }>(
      ofType('commands'),
    );
    expect(commands.commands).toEqual([
      { type: 'spawn', id: 's1_fly', template: 'fly', x: 1, y: 2, tags: ['buzz'] },
      {
        type: 'spawn',
        id: 's2_lib_meadow_acorn',
        template: 'lib/meadow/acorn',
        x: 3,
        y: 4,
        tags: [],
        material: 'wood',
      },
      { type: 'remove', target: 's1_fly' },
      { type: 'remove', target: 'lib/meadow/acorn' },
    ]);
  });

  it('answers find from the latest state and resolves collision and tap targets', async () => {
    const worker = await boot(`
      game.on('collision', (e) => game.say(e.a.id + ' hit ' + e.b.tags.join('+') + ' at ' + e.impulse));
      game.on('tap', (e) => game.say((e.target ? e.target.id : 'nothing') + ' tapped at ' + e.x + ',' + e.y));
      game.on('tick', () => game.hud({ label: game.find('fly').map((f) => f.id + '@' + f.x).join(' ') }));
    `);
    worker.send(
      state([
        { id: 'frog', tags: ['frog'] },
        { id: 'f1', tags: ['fly'], x: 3 },
        { id: 'f2', tags: ['fly'], x: 5 },
      ]),
    );
    worker.send(event({ type: 'collision', a: 'frog', b: 'f1', impulse: 2 }));
    worker.send(event({ type: 'tap', target: 'f2', x: 5, y: 1 }));
    worker.send(event({ type: 'tap', x: 7, y: 1 }));
    worker.send(tick(0.05));
    await worker.until((m) => m.type === 'ack' && m.seq === seq);
    const commands = worker
      .messages()
      .filter((m) => m.type === 'commands')
      .flatMap((m) => m.commands as unknown[]);
    expect(commands).toEqual([
      { type: 'say', text: 'frog hit fly at 2' },
      { type: 'say', text: 'f2 tapped at 5,1' },
      { type: 'say', text: 'nothing tapped at 7,1' },
      { type: 'hud', label: 'f1@3 f2@5' },
    ]);
  });

  it('resolves ask when the host answers', async () => {
    const worker = await boot(`
      game.on('tap', async () => { const i = await game.ask('Which?', ['Left', 'Right']); game.score(i + 10); });
    `);
    worker.send(event({ type: 'tap', x: 1, y: 1 }));
    const asked = await worker.until<{ commands: Record<string, unknown>[] }>(ofType('commands'));
    expect(asked.commands).toEqual([
      { type: 'ask', id: 1, question: 'Which?', options: ['Left', 'Right'] },
    ]);
    worker.send({ type: 'answer', id: 1, index: 1 });
    const scored = await worker.until<{ commands: unknown[] }>(ofType('commands'));
    expect(scored.commands).toEqual([{ type: 'score', delta: 11 }]);
  });

  it('seeds game.random and Math.random from the start seed', async () => {
    const script = `console.log(game.random().toFixed(6), Math.random().toFixed(6));`;
    const a = await boot(script, undefined, 42);
    const b = await boot(script, undefined, 42);
    const c = await boot(script, undefined, 43);
    const [la, lb, lc] = await Promise.all(
      [a, b, c].map((w) => w.until<{ args: string[] }>(ofType('log'))),
    );
    expect(la!.args).toEqual(lb!.args);
    expect(la!.args).not.toEqual(lc!.args);
    expect(la!.args[0]).not.toBe(la!.args[1]);
  });

  it('maps every API call to its command and validates arguments', async () => {
    const worker = await boot(`
      game.impulse('frog', { x: 1, y: -2 });
      game.setGravity(1.62); game.setGravity({ x: 0.5, y: 3 });
      game.setWind(2); game.setWind({ x: -1, y: 0 });
      game.setMaterial('pad', 'ice');
      game.lives(-1); game.level(2); game.lose();
      game.sound('ding'); game.celebrate('sparkle');
      game.say('  Hello  ');
      try { game.score('lots'); } catch (e) { console.log(e.message); }
      try { game.sound('scream'); } catch (e) { console.log(e.message); }
      try { game.say(''); } catch (e) { console.log(e.message); }
    `);
    const commands = await worker.until<{ commands: unknown[] }>(ofType('commands'));
    expect(commands.commands).toEqual([
      { type: 'impulse', target: 'frog', x: 1, y: -2 },
      { type: 'setGravity', x: 0, y: 1.62 },
      { type: 'setGravity', x: 0.5, y: 3 },
      { type: 'setWind', x: 2, y: 0 },
      { type: 'setWind', x: -1, y: 0 },
      { type: 'setMaterial', target: 'pad', material: 'ice' },
      { type: 'lives', delta: -1 },
      { type: 'level', n: 2 },
      { type: 'lose' },
      { type: 'sound', cue: 'ding' },
      { type: 'celebrate', style: 'sparkle' },
      { type: 'say', text: 'Hello' },
    ]);
    const logs = worker
      .messages()
      .filter((m) => m.type === 'log')
      .map((m) => (m.args as string[])[0]);
    expect(logs).toEqual([
      expect.stringMatching(/game\.score.*number/),
      expect.stringMatching(/game\.sound.*scream/),
      expect.stringMatching(/game\.say.*text/),
    ]);
  });

  it('unsubscribes handlers returned by game.on', async () => {
    const worker = await boot(`const off = game.on('tick', () => { game.score(1); off(); });`);
    worker.send(tick(0.05));
    worker.send(tick(0.1));
    await worker.until((m) => m.type === 'ack' && m.seq === seq);
    const commands = worker
      .messages()
      .filter((m) => m.type === 'commands')
      .flatMap((m) => m.commands as unknown[]);
    expect(commands).toEqual([{ type: 'score', delta: 1 }]);
  });

  it('rejects unknown event names', async () => {
    const worker = await boot(`game.on('explode', () => {});`);
    const error = await worker.until<{ message: string }>(ofType('error'));
    expect(error.message).toMatch(/explode/);
  });
});
