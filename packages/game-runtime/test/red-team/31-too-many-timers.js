// expect: runtime budget:timers
for (let i = 0; i < 100; i++) {
  game.every(0.5, () => game.score(1));
}
