// Keep the bubble alive: tap it to puff it upward; every second it floats earns a point.
let alive = true;
let seconds = 0;

game.setGravity(0.6);
game.hud({ score: 0, lives: 1, label: 'Keep the bubble floating' });
game.say('Tap the bubble to puff it up. Keep it away from the thorns!');

game.on('tap', (e) => {
  if (!alive || !e.target || !e.target.tags.includes('bubble')) return;
  game.impulse(e.target.id, { x: (game.random() - 0.5) * 2, y: -2.5 });
  game.sound('pop');
});

game.on('tick', () => {
  if (!alive) return;
  const bubbles = game.find('bubble');
  if (bubbles.length === 0) return;
  const b = bubbles[0];
  if (b.y < 1.5 && b.vy < 0) game.impulse(b.id, { x: 0, y: 0.8 });
  if (b.y > 6.5 && b.vy > 0.5) game.impulse(b.id, { x: 0, y: -1.2 });
});

game.every(1, () => {
  if (!alive) return;
  seconds += 1;
  game.score(1);
  game.hud({ score: seconds, label: seconds + ' seconds afloat' });
  if (seconds === 5) game.say('Halfway there!');
  if (seconds >= 10) {
    alive = false;
    game.celebrate('confetti');
    game.say('The bubble made it!');
    game.win();
  }
});

game.on('collision', (e) => {
  if (!alive) return;
  const pair = [e.a, e.b];
  const bubble = pair.find((p) => p.tags.includes('bubble'));
  const danger = pair.find((p) => p.tags.includes('thorn') || p.tags.includes('ground'));
  if (!bubble || !danger) return;
  alive = false;
  game.remove(bubble.id);
  game.sound('splat');
  game.lives(-1);
  game.say('Pop! The bubble burst.');
  game.lose();
});
