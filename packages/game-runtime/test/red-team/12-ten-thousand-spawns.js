// expect: runtime budget:bodies
game.on('tick', () => {
  for (let i = 0; i < 10000; i++) {
    game.spawn('fly', { x: i % 16, y: 1, tags: ['fly'] });
  }
  game.score(1);
});
