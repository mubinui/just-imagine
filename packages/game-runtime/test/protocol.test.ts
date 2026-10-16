import { describe, it, expect } from 'vitest';
import {
  CommandSchema,
  GameEventSchema,
  GameStateSchema,
  WorkerMessageSchema,
  type Command,
} from '../src/protocol';

describe('CommandSchema', () => {
  it('accepts every command kind', () => {
    const commands: Command[] = [
      { type: 'spawn', id: 'fly_s1', template: 'fly', x: 1, y: 2, tags: ['fly', 'buzzing'] },
      {
        type: 'spawn',
        id: 'lib_s2',
        template: 'lib/meadow/acorn',
        x: 1,
        y: 2,
        tags: [],
        material: 'wood',
      },
      { type: 'remove', target: 'fly' },
      { type: 'impulse', target: 'frog', x: 0, y: -5 },
      { type: 'setGravity', x: 0, y: 1.62 },
      { type: 'setWind', x: 2, y: 0 },
      { type: 'setMaterial', target: 'pad', material: 'ice' },
      { type: 'score', delta: 1 },
      { type: 'lives', delta: -1 },
      { type: 'level', n: 2 },
      { type: 'win' },
      { type: 'lose' },
      { type: 'hud', score: 3, lives: 2, timer: 10, label: 'Catch the flies' },
      { type: 'say', text: 'Nice catch!' },
      { type: 'ask', id: 1, question: 'Faster?', options: ['Yes', 'No'] },
      { type: 'sound', cue: 'pop' },
      { type: 'celebrate', style: 'confetti' },
      { type: 'timer-set', id: 1, seconds: 0.5, repeat: true },
      { type: 'timer-clear', id: 1 },
    ];
    for (const c of commands)
      expect(CommandSchema.safeParse(c).success, JSON.stringify(c)).toBe(true);
  });

  it('rejects unknown kinds, bad numbers and oversized strings', () => {
    expect(CommandSchema.safeParse({ type: 'fetch', url: 'x' }).success).toBe(false);
    expect(CommandSchema.safeParse({ type: 'score', delta: NaN }).success).toBe(false);
    expect(CommandSchema.safeParse({ type: 'score', delta: Infinity }).success).toBe(false);
    expect(CommandSchema.safeParse({ type: 'say', text: 'x'.repeat(201) }).success).toBe(false);
    expect(CommandSchema.safeParse({ type: 'say', text: '' }).success).toBe(false);
    expect(
      CommandSchema.safeParse({ type: 'ask', id: 1, question: 'Q', options: ['one'] }).success,
    ).toBe(false);
    expect(CommandSchema.safeParse({ type: 'sound', cue: 'scream' }).success).toBe(false);
    expect(
      CommandSchema.safeParse({
        type: 'spawn',
        id: 'Bad Id',
        template: 'fly',
        x: 0,
        y: 0,
        tags: [],
      }).success,
    ).toBe(false);
    expect(
      CommandSchema.safeParse({
        type: 'spawn',
        id: 'ok',
        template: 'fly',
        x: 0,
        y: 0,
        tags: ['Not A Tag'],
      }).success,
    ).toBe(false);
    expect(CommandSchema.safeParse({ type: 'level', n: 1.5 }).success).toBe(false);
  });

  it('strips unknown keys so a polluted command cannot smuggle data', () => {
    const parsed = CommandSchema.parse({ type: 'win', extra: 'x' });
    expect(parsed).toEqual({ type: 'win' });
  });
});

describe('GameEventSchema and GameStateSchema', () => {
  it('accept the seven host-pushed events', () => {
    for (const e of [
      { type: 'tick', time: 0.05, dt: 0.05 },
      { type: 'collision', a: 'frog', b: 'fly_s1', impulse: 1.5 },
      { type: 'tap', target: 'fly_s1', x: 1, y: 2 },
      { type: 'tap', x: 1, y: 2 },
      { type: 'drag', target: 'frog', x: 1, y: 2 },
      { type: 'flick', target: 'frog', vx: 4, vy: -6 },
      { type: 'dial', dial: 'gravity', value: 'moon' },
      { type: 'variable', id: 'speed', value: 3 },
    ])
      expect(GameEventSchema.safeParse(e).success, JSON.stringify(e)).toBe(true);
  });
  it('reject timer and answer as pushed events', () => {
    expect(GameEventSchema.safeParse({ type: 'timer', id: 1 }).success).toBe(false);
    expect(GameEventSchema.safeParse({ type: 'answer', id: 1, index: 0 }).success).toBe(false);
  });
  it('accept a state snapshot', () => {
    const state = {
      time: 1,
      entities: [
        {
          id: 'frog',
          tags: ['frog', 'hero'],
          x: 1,
          y: 2,
          rotation: 0,
          vx: 0,
          vy: 0,
          width: 1,
          height: 1,
        },
        {
          id: 'fly_s1',
          tags: ['fly'],
          x: 3,
          y: 2,
          rotation: 0,
          vx: 1,
          vy: 0,
          width: 0.3,
          height: 0.3,
          templateId: 'fly',
        },
      ],
    };
    expect(GameStateSchema.safeParse(state).success).toBe(true);
  });
});

describe('WorkerMessageSchema', () => {
  it('accepts the messages a worker may send', () => {
    for (const m of [
      { type: 'ready' },
      { type: 'ack', seq: 1, ms: 0.2 },
      { type: 'commands', commands: [{ type: 'score', delta: 1 }] },
      { type: 'budget', kind: 'handler', value: 12, limit: 8, where: 'tick' },
      { type: 'error', message: 'boom', phase: 'handler', line: 3 },
      { type: 'log', args: ['hello', '1'] },
    ])
      expect(WorkerMessageSchema.safeParse(m).success, JSON.stringify(m)).toBe(true);
  });
  it('rejects anything else', () => {
    expect(WorkerMessageSchema.safeParse({ type: 'exec', code: 'x' }).success).toBe(false);
    expect(
      WorkerMessageSchema.safeParse({ type: 'commands', commands: [{ type: 'nope' }] }).success,
    ).toBe(false);
    expect(WorkerMessageSchema.safeParse('ready').success).toBe(false);
  });
});
