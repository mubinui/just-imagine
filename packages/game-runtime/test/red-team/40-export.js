// expect: static export
export const score = 1;
game.on('tick', () => game.score(score));
