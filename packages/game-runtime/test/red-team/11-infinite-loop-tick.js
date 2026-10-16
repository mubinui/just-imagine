// expect: runtime budget:hang
// Looks like a game but the tick handler never returns.
let n = 0;
game.on('tick', () => {
  while (true) {
    n += 1;
    if (n < 0) game.score(1);
  }
});
