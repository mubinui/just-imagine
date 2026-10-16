// Soft moon landing: tap the rocket to fire the thruster and touch down gently.
const SAFE_SPEED = 2.5;
let landed = false;
let lives = 3;
let hover = 0;
let lastVy = 0;

game.hud({ lives, score: 0, label: 'Land softly on the Moon' });
game.say('Tap the rocket to fire the thruster. Land slower than ' + SAFE_SPEED + ' m/s!');

game.on('tap', (e) => {
  if (landed || !e.target || !e.target.tags.includes('rocket')) return;
  game.impulse(e.target.id, { x: 0, y: -1.5 });
  game.sound('whoosh');
});

game.on('tick', () => {
  const rockets = game.find('rocket');
  if (rockets.length > 0) lastVy = rockets[0].vy;
});

game.every(1, () => {
  if (landed) return;
  const rockets = game.find('rocket');
  if (rockets.length > 0 && rockets[0].y < 7) {
    hover += 1;
    game.score(1);
    game.hud({ score: hover, label: 'Hovering ' + hover + ' s' });
  }
});

game.on('collision', (e) => {
  if (landed) return;
  const pair = [e.a, e.b];
  const rocket = pair.find((p) => p.tags.includes('rocket'));
  const moon = pair.find((p) => p.tags.includes('moon') || p.tags.includes('rock'));
  if (!rocket || !moon) return;
  const speed = Math.max(Math.abs(lastVy), Math.abs(rocket.vy));
  if (speed <= SAFE_SPEED) {
    landed = true;
    game.score(5);
    game.celebrate('sparkle');
    game.say('A perfect soft landing!');
    game.win();
    return;
  }
  lives -= 1;
  game.lives(-1);
  game.hud({ lives });
  game.impulse(rocket.id, { x: 0, y: -speed * 0.8 });
  game.sound('boing');
  game.say('Too fast! The rocket bounced away.');
  if (lives <= 0) {
    landed = true;
    game.lose();
  }
});

game.on('dial', (e) => {
  if (e.dial === 'gravity') game.say('Gravity is now ' + e.value + '.');
});
