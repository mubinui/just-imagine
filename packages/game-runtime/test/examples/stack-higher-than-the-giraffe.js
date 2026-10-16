// Stack blocks higher than the giraffe: tap anywhere to drop a block; the wind grows each level.
let level = 1;
let done = false;
const resting = [];

game.level(1);
game.hud({ score: 0, label: 'Stack higher than the giraffe' });
game.say('Tap to drop a block. Stack them higher than the giraffe!');

function giraffeTop() {
  const giraffes = game.find('giraffe');
  if (giraffes.length === 0) return 5;
  return giraffes[0].y - giraffes[0].height / 2;
}

game.on('tap', () => {
  if (done) return;
  const x = 8 + (game.random() - 0.5) * 0.4;
  game.spawn('block', { x, y: 0.6, tags: ['block', 'dropped'] });
  game.sound('whoosh');
});

game.every(0.5, () => {
  if (done) return;
  let top = 8;
  for (const b of game.find('block')) {
    const still = Math.abs(b.vy) < 0.05 && Math.abs(b.vx) < 0.05;
    const blockTop = b.y - b.height / 2;
    if (still && blockTop < top) top = blockTop;
    if (still && b.tags.includes('dropped') && !resting.includes(b.id)) {
      resting.push(b.id);
      game.score(1);
      game.sound('ding');
    }
  }
  const height = 8 - top;
  game.hud({ score: resting.length, label: 'Height ' + height.toFixed(1) + ' m' });
  if (top < giraffeTop() - 0.1) {
    done = true;
    game.celebrate('confetti');
    game.say('Taller than the giraffe!');
    game.win();
  } else if (resting.length >= level * 4) {
    level += 1;
    game.level(level);
    game.setWind(level - 1);
    game.say('Level ' + level + '! The wind is picking up.');
  }
});
