// Marble run: the marble rolls down the ramps into the cup. Tap it for a nudge.
const touched = [];
let inCup = false;

game.hud({ score: 0, label: 'Roll the marble into the cup' });
game.say('Tap the marble to nudge it along the ramps.');

game.on('tap', (e) => {
  if (inCup || !e.target || !e.target.tags.includes('marble')) return;
  game.impulse(e.target.id, { x: 1.5, y: -0.5 });
  game.sound('boing');
});

game.on('collision', (e) => {
  if (inCup) return;
  const pair = [e.a, e.b];
  const marble = pair.find((p) => p.tags.includes('marble'));
  const other = pair.find((p) => !p.tags.includes('marble'));
  if (!marble || !other) return;
  if (other.tags.includes('ramp') && !touched.includes(other.id)) {
    touched.push(other.id);
    game.score(1);
    game.sound('ding');
    game.hud({ score: touched.length, label: 'Ramps: ' + touched.length });
  }
  if (other.tags.includes('cup')) {
    inCup = true;
    game.score(3);
    game.celebrate('splash');
    game.say('Plop! The marble landed in the cup!');
    game.win();
  }
});

game.every(2, () => {
  if (inCup) return;
  const marbles = game.find('marble');
  if (marbles.length === 0) {
    game.spawn('marble', { x: 1.5, y: 0.8, tags: ['marble'] });
    game.say('A new marble rolls in.');
    return;
  }
  const m = marbles[0];
  if (m.y > 7.5 && Math.abs(m.vx) < 0.1) {
    game.say('The marble is stuck on the ground. Give it a tap!');
    game.impulse(m.id, { x: 2, y: -3 });
  }
});

game.on('flick', (e) => {
  if (e.target.tags.includes('marble')) game.say('Whee! What a flick.');
});
