// Catapult the acorns at the cans: tap an acorn to launch it and knock every can over.
const knocked = [];
let launched = 0;
let done = false;

game.hud({ score: 0, label: 'Knock over the cans' });
game.say('Tap an acorn to launch it at the cans!');

game.on('tap', (e) => {
  if (done || !e.target || !e.target.tags.includes('acorn')) return;
  launched += 1;
  game.impulse(e.target.id, { x: 8, y: -6 });
  game.sound('whoosh');
  game.hud({ label: 'Acorns launched: ' + launched });
});

game.on('collision', (e) => {
  if (done) return;
  const pair = [e.a, e.b];
  const acorn = pair.find((p) => p.tags.includes('acorn'));
  const can = pair.find((p) => p.tags.includes('can'));
  if (!acorn || !can || knocked.includes(can.id)) return;
  knocked.push(can.id);
  game.score(1);
  game.sound('splat');
  game.celebrate('sparkle');
  game.hud({ score: knocked.length });
  game.after(0.5, () => game.remove(can.id));
  if (knocked.length >= 3) {
    done = true;
    game.say('All the cans are down!');
    game.win();
  }
});

game.every(3, () => {
  if (done) return;
  const acorns = game.find('acorn');
  const waiting = acorns.filter((a) => a.x < 3 && Math.abs(a.vx) < 0.1);
  if (waiting.length === 0) {
    game.spawn('acorn_1', { x: 2, y: 7.6, tags: ['acorn'] });
    game.say('Here is another acorn.');
  }
});
