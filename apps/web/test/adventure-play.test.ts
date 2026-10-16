import { describe, expect, it } from 'vitest';
import { ADVENTURES, type StoryGame } from '@just-imagine/learning-content/play';
import { adventureReducer, initialAdventure } from '../components/learn/adventure-model';

function path(game: Extract<StoryGame, { kind: 'trail' }>, from: number, to: number): number[] {
  const queue = [[from]],
    seen = new Set([from]);
  while (queue.length) {
    const route = queue.shift()!,
      last = route.at(-1)!;
    if (last === to) return route.slice(1);
    for (const next of [last - 1, last + 1, last - game.columns, last + game.columns]) {
      if (
        next < 0 ||
        next >= game.rows * game.columns ||
        seen.has(next) ||
        game.blocked.includes(next)
      )
        continue;
      if (
        Math.abs((next % game.columns) - (last % game.columns)) +
          Math.abs(Math.floor(next / game.columns) - Math.floor(last / game.columns)) !==
        1
      )
        continue;
      seen.add(next);
      queue.push([...route, next]);
    }
  }
  throw new Error('No safe route');
}
describe('story game consequences', () => {
  it('every authored non-classic chapter can be completed through its own actions', () => {
    for (const story of Object.values(ADVENTURES))
      for (const chapter of story.chapters) {
        const game = chapter.game;
        if (game.kind === 'classic') continue;
        let s = initialAdventure(game);
        const act = (a: Parameters<typeof adventureReducer>[2]) => {
          s = adventureReducer(game, s, a);
        };
        if (game.kind === 'assemble')
          for (let i = 0; i < game.pieces; i++) act({ type: 'place', piece: i, slot: i });
        if (game.kind === 'route')
          for (let i = 1; i < game.nodes.length; i++) act({ type: 'route', node: i });
        if (game.kind === 'trail')
          for (const target of [...game.collect, game.exit])
            for (const cell of path(game, s.position, target)) act({ type: 'walk', cell });
        if (game.kind === 'adjust') for (const value of game.goals) act({ type: 'adjust', value });
        if (game.kind === 'memory') for (const pad of game.sequence) act({ type: 'memory', pad });
        if (game.kind === 'hold')
          for (let ms = 0; ms < game.milliseconds; ms += 100) {
            const zone = Math.min(3, Math.floor(ms / (game.milliseconds / 4)));
            act({
              type: 'tick',
              milliseconds: 100,
              zone,
              holding: game.mode === 'breathe' ? zone % 2 === 0 : true,
            });
          }
        if (game.kind === 'cover')
          for (let i = 0; i < game.rounds; i++) {
            act({ type: 'cover', target: 'cover' });
            act({ type: 'cover', target: 'bin' });
          }
        expect(s.complete, `${story.packId}/${chapter.id}`).toBe(true);
        expect(adventureReducer(game, s, { type: 'reset' })).toEqual(initialAdventure(game));
      }
  });
  it('does not count a misplaced or repeatedly delivered assembly piece', () => {
    const game: StoryGame = { kind: 'assemble', pieces: 3, layout: 'rings' };
    let s = initialAdventure(game);
    s = adventureReducer(game, s, { type: 'place', piece: 0, slot: 1 });
    expect(s.placed).toEqual([]);
    s = adventureReducer(game, s, { type: 'place', piece: -1, slot: -1 });
    expect(s.placed).toEqual([]);
    s = adventureReducer(game, s, { type: 'place', piece: 0, slot: 0 });
    s = adventureReducer(game, s, { type: 'place', piece: 0, slot: 0 });
    expect(s.placed).toEqual([0]);
  });
  it('requires each route stop and rejects skipping the brain or food pipe', () => {
    const game = ADVENTURES.body!.chapters.find((c) => c.id === 'brain')!.game;
    let s = initialAdventure(game);
    s = adventureReducer(game, s, { type: 'route', node: 3 });
    expect(s.step).toBe(0);
    s = adventureReducer(game, s, { type: 'route', node: 1 });
    expect(s.step).toBe(1);
    expect(adventureReducer(game, s, { type: 'place', piece: 0, slot: 0 })).toBe(s);
  });
  it('does not allow teleporting, crossing row edges or walking into rocks', () => {
    const game: StoryGame = {
      kind: 'trail',
      columns: 6,
      rows: 4,
      start: 5,
      exit: 23,
      blocked: [4],
      collect: [12],
      theme: 'rover',
    };
    const s = initialAdventure(game);
    for (const cell of [6, 4, 23, -1, 100])
      expect(adventureReducer(game, s, { type: 'walk', cell }).position).toBe(5);
    expect(adventureReducer(game, s, { type: 'walk', cell: 11 }).position).toBe(11);
  });
  it('requires collected supplies before the exit can complete a trail', () => {
    const game: StoryGame = {
      kind: 'trail',
      columns: 3,
      rows: 2,
      start: 0,
      exit: 1,
      blocked: [],
      collect: [4],
      theme: 'tracks',
    };
    expect(adventureReducer(game, initialAdventure(game), { type: 'walk', cell: 1 }).complete).toBe(
      false,
    );
  });
  it('resets a remembered phrase after the wrong response', () => {
    const game = ADVENTURES.exercise!.chapters.find((c) => c.id === 'muscle')!.game;
    let s = initialAdventure(game);
    s = adventureReducer(game, s, { type: 'memory', pad: 0 });
    s = adventureReducer(game, s, { type: 'memory', pad: 3 });
    expect(s.step).toBe(0);
    expect(s.complete).toBe(false);
  });
  it('counts active wash time only in the current area and caps background time jumps', () => {
    const game: StoryGame = { kind: 'hold', mode: 'wash', milliseconds: 20000 };
    let s = initialAdventure(game);
    for (const [holding, zone] of [
      [false, 0],
      [true, 2],
    ] as const)
      s = adventureReducer(game, s, { type: 'tick', milliseconds: 100, holding, zone });
    expect(s.milliseconds).toBe(0);
    s = adventureReducer(game, s, { type: 'tick', milliseconds: 10000, holding: true, zone: 0 });
    expect(s.milliseconds).toBe(250);
  });
  it('requires disposal after each covered sneeze', () => {
    const game: StoryGame = { kind: 'cover', rounds: 3 };
    let s = initialAdventure(game);
    s = adventureReducer(game, s, { type: 'cover', target: 'bin' });
    expect(s.step).toBe(0);
    s = adventureReducer(game, s, { type: 'cover', target: 'cover' });
    s = adventureReducer(game, s, { type: 'cover', target: 'cover' });
    expect(s.step).toBe(0);
    expect(s.coverPhase).toBe('bin');
    s = adventureReducer(game, s, { type: 'cover', target: 'bin' });
    expect(s.step).toBe(1);
    expect(s.complete).toBe(false);
  });
});
