import { it, expect } from 'vitest';
import { GAME_WISHES } from '../src/evals/game-wishes';
import { wantsGame } from '../src/imagine-game';

it('ships at least twenty game wishes and a playground control set with unique ids', () => {
  expect(GAME_WISHES.filter((w) => w.kind === 'game').length).toBeGreaterThanOrEqual(20);
  expect(GAME_WISHES.filter((w) => w.kind === 'playground').length).toBeGreaterThanOrEqual(8);
  expect(new Set(GAME_WISHES.map((w) => w.id)).size).toBe(GAME_WISHES.length);
});

it.each(GAME_WISHES)('$id: "$description" is a $kind wish', (wish) => {
  expect(wantsGame(wish.description) ? 'game' : 'playground').toBe(wish.kind);
});
