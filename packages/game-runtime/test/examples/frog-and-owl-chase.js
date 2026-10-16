// Frog and owl chase: hop away from the owl; every second you stay free earns a point.
let free = 0;
let lives = 3;
let over = false;

game.hud({ score: 0, lives: 3, label: 'Hop away from the owl!' });
game.say('The owl is chasing you! Tap the frog to hop.');

function frog() {
  const frogs = game.find('frog');
  return frogs.length > 0 ? frogs[0] : undefined;
}

game.on('tap', (e) => {
  if (over || !e.target || !e.target.tags.includes('frog')) return;
  const owls = game.find('owl');
  const away = owls.length > 0 && owls[0].x > e.target.x ? -1 : 1;
  game.impulse(e.target.id, { x: 2.5 * away, y: -4 });
  game.sound('boing');
});

game.on('tick', () => {
  if (over) return;
  const f = frog();
  if (!f) return;
  for (const owl of game.find('owl')) {
    const dir = f.x > owl.x ? 1 : -1;
    if (Math.abs(owl.vx) < 1.2) game.impulse(owl.id, { x: 0.15 * dir, y: 0 });
  }
});

game.every(1, () => {
  if (over) return;
  free += 1;
  game.score(1);
  game.hud({ score: free });
  if (free >= 20) {
    over = true;
    game.celebrate('confetti');
    game.say('The owl gave up. You are free!');
    game.win();
  }
});

game.on('collision', (e) => {
  if (over) return;
  const pair = [e.a, e.b];
  const f = pair.find((p) => p.tags.includes('frog'));
  const owl = pair.find((p) => p.tags.includes('owl'));
  if (!f || !owl) return;
  lives -= 1;
  game.lives(-1);
  game.hud({ lives });
  game.sound('splat');
  game.say('Hoot! The owl caught you. Hop faster!');
  game.impulse(owl.id, { x: owl.x > f.x ? 4 : -4, y: -2 });
  if (lives <= 0) {
    over = true;
    game.lose();
  }
});
