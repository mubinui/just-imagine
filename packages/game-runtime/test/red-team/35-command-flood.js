// expect: runtime budget:commands
game.on('tick', () => {
  for (let i = 0; i < 100000; i++) game.score(1);
});
