import { describe, it, expect } from 'vitest';
import { createGameHost, type GameError } from '../src/host';
import type { Command } from '../src/protocol';
import type { BudgetBreach } from '../src/budgets';
import { fakeWorkerFactory } from './helpers/fake-worker';

const VALID = `game.on('tick', () => game.score(1));`;

function harness(source = VALID, budgets?: Record<string, number>) {
  const { factory, created } = fakeWorkerFactory();
  const commands: Command[] = [];
  const errors: GameError[] = [];
  const breaches: BudgetBreach[] = [];
  const handle = createGameHost(
    source,
    { onCommand: (c) => commands.push(c) },
    { worker: factory, budgets },
  );
  handle.onError((e) => errors.push(e));
  handle.onBudget((b) => breaches.push(b));
  return { handle, created, commands, errors, breaches, worker: () => created[0]! };
}

const tick = (time: number) => ({ type: 'tick' as const, time, dt: 0.05 });

describe('createGameHost', () => {
  it('refuses to start a script that fails the static check and never creates a worker', () => {
    const h = harness(`fetch('https://example.com'); game.win();`);
    h.handle.start(1);
    expect(h.created).toHaveLength(0);
    expect(h.handle.status).toBe('failed');
    expect(h.errors).toEqual([
      {
        code: 'static',
        message: expect.stringMatching(/fetch/),
        errors: [{ code: 'forbidden-identifier', message: expect.any(String), line: 1 }],
      },
    ]);
  });

  it('builds the worker from the shimmed source and sends start once the worker is ready', () => {
    const h = harness();
    h.handle.start(42);
    expect(h.handle.status).toBe('starting');
    expect(h.created).toHaveLength(1);
    expect(h.worker().source).toContain(VALID);
    expect(h.worker().source).toContain("'use strict'");
    expect(h.worker().sent).toEqual([]);
    h.worker().ready();
    expect(h.handle.status).toBe('running');
    expect(h.worker().sent).toEqual([{ type: 'start', seed: 42 }]);
  });

  it('queues events and state pushed before ready and sends them in order afterwards', () => {
    const h = harness();
    h.handle.start(1);
    h.handle.pushState({ time: 0, entities: [] });
    h.handle.pushEvent(tick(0.05));
    h.handle.pushEvent({ type: 'tap', x: 1, y: 1 });
    expect(h.worker().sent).toEqual([]);
    h.worker().ready();
    expect(h.worker().sent).toEqual([
      { type: 'start', seed: 1 },
      { type: 'state', state: { time: 0, entities: [] } },
      { type: 'event', seq: 1, event: tick(0.05) },
      { type: 'event', seq: 2, event: { type: 'tap', x: 1, y: 1 } },
    ]);
  });

  it('rejects malformed events from the bridge instead of forwarding them', () => {
    const h = harness();
    h.handle.start(1);
    h.worker().ready();
    expect(() => h.handle.pushEvent({ type: 'tick', time: NaN, dt: 0.05 })).toThrow(/event/);
    expect(() => h.handle.pushEvent({ type: 'boom' } as never)).toThrow(/event/);
    expect(h.worker().sentOfType('event')).toEqual([]);
  });

  it('delivers validated commands and rejects a whole batch holding an invalid one', () => {
    const h = harness();
    h.handle.start(1);
    h.worker().ready();
    h.worker().commands({ type: 'score', delta: 2 }, { type: 'say', text: 'Nice!' });
    expect(h.commands).toEqual([
      { type: 'score', delta: 2 },
      { type: 'say', text: 'Nice!' },
    ]);
    h.worker().commands({ type: 'score', delta: 1 }, { type: 'exec', code: 'x' });
    expect(h.commands).toHaveLength(2);
    expect(h.errors).toEqual([{ code: 'worker', message: expect.stringMatching(/command/) }]);
    expect(h.worker().terminated).toBe(true);
    expect(h.handle.status).toBe('failed');
  });

  it('treats non-protocol messages from the worker as a worker fault', () => {
    const h = harness();
    h.handle.start(1);
    h.worker().ready();
    h.worker().emit({ type: 'steal', data: 'x' });
    expect(h.errors[0]?.code).toBe('worker');
    expect(h.worker().terminated).toBe(true);
  });

  it('forwards script errors without stopping the game', () => {
    const h = harness();
    h.handle.start(1);
    h.worker().ready();
    h.worker().emit({ type: 'error', message: 'boom', phase: 'handler', line: 3, where: 'tick' });
    expect(h.errors).toEqual([
      { code: 'runtime', message: 'boom', phase: 'handler', line: 3, where: 'tick' },
    ]);
    expect(h.handle.status).toBe('running');
    expect(h.worker().terminated).toBe(false);
  });

  it('forwards logs', () => {
    const h = harness();
    const logs: string[][] = [];
    h.handle.onLog((args) => logs.push(args));
    h.handle.start(1);
    h.worker().ready();
    h.worker().emit({ type: 'log', args: ['hi', '2'] });
    expect(logs).toEqual([['hi', '2']]);
  });

  it('terminates on a budget breach reported by the worker', () => {
    const h = harness();
    h.handle.start(1);
    h.worker().ready();
    h.worker().emit({ type: 'budget', kind: 'handler', value: 12.5, limit: 8, where: 'tick' });
    expect(h.breaches).toEqual([{ kind: 'handler', value: 12.5, limit: 8, where: 'tick' }]);
    expect(h.worker().terminated).toBe(true);
    expect(h.handle.status).toBe('failed');
  });

  it('counts spawned bodies itself and terminates past the budget', () => {
    const h = harness(VALID, { maxBodies: 3 });
    h.handle.start(1);
    h.worker().ready();
    const spawn = (n: number, tags: string[] = []) => ({
      type: 'spawn',
      id: `s${n}_fly`,
      template: 'fly',
      x: 0,
      y: 0,
      tags,
    });
    h.worker().commands(spawn(1), spawn(2, ['buzz']));
    h.worker().commands({ type: 'remove', target: 'buzz' });
    h.worker().commands(spawn(3), spawn(4));
    expect(h.breaches).toEqual([]);
    h.worker().commands(spawn(5));
    expect(h.breaches).toEqual([{ kind: 'bodies', value: 4, limit: 3, where: 'spawn' }]);
    expect(h.worker().terminated).toBe(true);
    expect(h.commands.filter((c) => c.type === 'spawn')).toHaveLength(4);
  });

  it('counts timers itself and terminates past the budget', () => {
    const h = harness(VALID, { maxTimers: 2 });
    h.handle.start(1);
    h.worker().ready();
    h.worker().commands(
      { type: 'timer-set', id: 1, seconds: 1, repeat: true },
      { type: 'timer-set', id: 2, seconds: 1, repeat: false },
      { type: 'timer-clear', id: 2 },
      { type: 'timer-set', id: 3, seconds: 1, repeat: false },
    );
    expect(h.breaches).toEqual([]);
    h.worker().commands({ type: 'timer-set', id: 4, seconds: 1, repeat: false });
    expect(h.breaches).toEqual([{ kind: 'timers', value: 3, limit: 2, where: 'timer-set' }]);
    expect(h.worker().terminated).toBe(true);
  });

  it('terminates a worker that does not ack an event within the hang budget', async () => {
    const h = harness(VALID, { hangMs: 30 });
    h.handle.start(1);
    h.worker().ready();
    h.handle.pushEvent(tick(0.05));
    h.worker().ack(1);
    h.handle.pushEvent(tick(0.1));
    await new Promise((r) => setTimeout(r, 80));
    expect(h.breaches).toEqual([
      { kind: 'hang', value: expect.any(Number), limit: 30, where: 'tick' },
    ]);
    expect(h.worker().terminated).toBe(true);
    expect(h.handle.status).toBe('failed');
  });

  it('does not report a hang while events are acked in time', async () => {
    const h = harness(VALID, { hangMs: 40 });
    h.handle.start(1);
    h.worker().ready();
    for (let i = 1; i <= 4; i++) {
      h.handle.pushEvent(tick(i * 0.05));
      await new Promise((r) => setTimeout(r, 15));
      h.worker().ack(i);
    }
    await new Promise((r) => setTimeout(r, 60));
    expect(h.breaches).toEqual([]);
    expect(h.handle.status).toBe('running');
  });

  it('fails when the worker never reports ready', async () => {
    const h = harness(VALID, { readyMs: 20 });
    h.handle.start(1);
    await new Promise((r) => setTimeout(r, 50));
    expect(h.errors).toEqual([{ code: 'worker', message: expect.stringMatching(/ready/) }]);
    expect(h.worker().terminated).toBe(true);
    expect(h.handle.status).toBe('failed');
  });

  it('fails when the worker crashes', () => {
    const h = harness();
    h.handle.start(1);
    h.worker().ready();
    h.worker().crash(new Error('segfault-ish'));
    expect(h.errors).toEqual([{ code: 'worker', message: expect.stringMatching(/segfault-ish/) }]);
    expect(h.handle.status).toBe('failed');
  });

  it('drain resolves once every pushed event is acked, and immediately when idle', async () => {
    const h = harness();
    h.handle.start(1);
    h.worker().ready();
    await h.handle.drain();
    h.handle.pushEvent(tick(0.05));
    h.handle.pushEvent(tick(0.1));
    let drained = false;
    const promise = h.handle.drain().then(() => (drained = true));
    h.worker().ack(1);
    await Promise.resolve();
    expect(drained).toBe(false);
    h.worker().ack(2);
    await promise;
    expect(drained).toBe(true);
  });

  it('drain resolves when the game is terminated mid-flight', async () => {
    const h = harness();
    h.handle.start(1);
    h.worker().ready();
    h.handle.pushEvent(tick(0.05));
    const promise = h.handle.drain();
    h.handle.stop();
    await promise;
    expect(h.handle.status).toBe('stopped');
  });

  it('forwards answers to the worker', () => {
    const h = harness();
    h.handle.start(1);
    h.worker().ready();
    h.handle.answer(3, 1);
    expect(h.worker().sent.at(-1)).toEqual({ type: 'answer', id: 3, index: 1 });
  });

  it('stop terminates the worker and ignores later pushes', () => {
    const h = harness();
    h.handle.start(1);
    h.worker().ready();
    h.handle.stop();
    expect(h.worker().terminated).toBe(true);
    expect(h.handle.status).toBe('stopped');
    h.handle.pushEvent(tick(0.05));
    expect(h.worker().sentOfType('event')).toEqual([]);
    h.handle.start(2);
    expect(h.created).toHaveLength(1);
  });
});
