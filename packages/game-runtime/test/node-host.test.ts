import { describe, it, expect } from 'vitest';
import { createGameHost } from '../src/host';
import { nodeWorkerFactory } from '../src/node';
import type { Command } from '../src/protocol';

describe('createGameHost with a Node worker', () => {
  it('runs a valid script that receives events and emits commands', async () => {
    const commands: Command[] = [];
    const errors: unknown[] = [];
    const handle = createGameHost(
      `
        let caught = 0;
        game.hud({ label: 'Catch the flies' });
        game.on('tap', (e) => {
          if (e.target && e.target.tags.includes('fly')) {
            caught += 1;
            game.remove(e.target.id);
            game.score(1);
            game.sound('pop');
            if (caught >= 2) { game.celebrate('confetti'); game.win(); }
          }
        });
        game.every(0.5, () => game.hud({ score: caught }));
      `,
      { onCommand: (c) => commands.push(c) },
      { worker: nodeWorkerFactory },
    );
    handle.onError((e) => errors.push(e));
    handle.start(7);
    handle.pushState({
      time: 0,
      entities: [
        {
          id: 'fly_a',
          tags: ['fly'],
          x: 1,
          y: 1,
          rotation: 0,
          vx: 0,
          vy: 0,
          width: 0.3,
          height: 0.3,
        },
        {
          id: 'fly_b',
          tags: ['fly'],
          x: 2,
          y: 1,
          rotation: 0,
          vx: 0,
          vy: 0,
          width: 0.3,
          height: 0.3,
        },
        { id: 'frog', tags: ['frog'], x: 3, y: 1, rotation: 0, vx: 0, vy: 0, width: 1, height: 1 },
      ],
    });
    for (let i = 1; i <= 12; i++) handle.pushEvent({ type: 'tick', time: i * 0.05, dt: 0.05 });
    handle.pushEvent({ type: 'tap', target: 'frog', x: 3, y: 1 });
    handle.pushEvent({ type: 'tap', target: 'fly_a', x: 1, y: 1 });
    handle.pushEvent({ type: 'tap', target: 'fly_b', x: 2, y: 1 });
    await handle.drain();
    handle.stop();
    expect(errors).toEqual([]);
    expect(commands).toEqual([
      { type: 'hud', label: 'Catch the flies' },
      { type: 'timer-set', id: 1, seconds: 0.5, repeat: true },
      { type: 'hud', score: 0 },
      { type: 'remove', target: 'fly_a' },
      { type: 'score', delta: 1 },
      { type: 'sound', cue: 'pop' },
      { type: 'remove', target: 'fly_b' },
      { type: 'score', delta: 1 },
      { type: 'sound', cue: 'pop' },
      { type: 'celebrate', style: 'confetti' },
      { type: 'win' },
    ]);
  });

  it('terminates a script that spins forever inside a tick handler', async () => {
    const breaches: unknown[] = [];
    const handle = createGameHost(
      `game.on('tick', () => { while (true) { game.random(); } });`,
      { onCommand: () => {} },
      { worker: nodeWorkerFactory, budgets: { hangMs: 100 } },
    );
    handle.onBudget((b) => breaches.push(b));
    handle.start(1);
    handle.pushEvent({ type: 'tick', time: 0.05, dt: 0.05 });
    await handle.drain();
    expect(handle.status).toBe('failed');
    expect(breaches).toEqual([
      { kind: 'hang', value: expect.any(Number), limit: 100, where: 'tick' },
    ]);
  });
});
