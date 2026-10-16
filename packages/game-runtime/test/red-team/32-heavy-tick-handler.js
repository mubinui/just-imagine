// expect: runtime budget:handler|budget:aggregate
// Each tick burns far more than the handler budget.
game.on('tick', () => {
  let n = 0;
  for (let i = 0; i < 40000000; i++) n = (n + i) % 7;
  game.score(n > 100 ? 1 : 0);
});
