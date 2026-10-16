// Snail race: push your snail across the pond; rain makes the lily pads slippery.
const FINISH = 14;
const checkpoints = [4, 8, 12];
let passed = 0;
let raining = false;
let finished = false;

game.hud({ score: 0, label: 'Race to the flag!' });
game.say('Tap your snail to push it. Watch out for the rain!');

game.on('tap', (e) => {
  if (finished || !e.target || !e.target.tags.includes('my_snail')) return;
  game.impulse(e.target.id, { x: raining ? 1.2 : 2, y: 0 });
  game.sound('boing');
});

game.every(0.5, () => {
  if (finished) return;
  for (const rival of game.find('rival')) {
    game.impulse(rival.id, { x: 0.6 + game.random() * 0.6, y: 0 });
  }
});

game.on('dial', (e) => {
  if (e.dial !== 'wind') return;
  raining = e.value !== 'none';
  game.setMaterial('pad', raining ? 'ice' : 'stone');
  game.say(raining ? 'Rain! The lily pads are slippery now.' : 'The rain stopped.');
});

game.on('tick', () => {
  if (finished) return;
  const mine = game.find('my_snail');
  if (mine.length === 0) return;
  const snail = mine[0];
  while (passed < checkpoints.length && snail.x >= checkpoints[passed]) {
    passed += 1;
    game.score(1);
    game.sound('ding');
    game.hud({ score: passed, label: 'Checkpoint ' + passed });
  }
  if (snail.x >= FINISH) {
    finished = true;
    game.celebrate('confetti');
    game.say('Your snail wins the race!');
    game.win();
    return;
  }
  for (const rival of game.find('rival')) {
    if (rival.x >= FINISH) {
      finished = true;
      game.say('The rival snail got there first. Try again!');
      game.lose();
    }
  }
});
