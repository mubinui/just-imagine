// expect: static forbidden-identifier
game.on('tick', () => {
  game.score(1);
  process.exit(1);
});
