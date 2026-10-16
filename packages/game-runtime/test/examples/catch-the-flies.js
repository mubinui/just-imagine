// Catch the flies: tap the flies to catch them before the owl wakes up.
const GOAL = 10;
let caught = 0;
let owlAwake = false;

game.setGravity(0);
game.hud({ score: 0, label: 'Catch ' + GOAL + ' flies' });
game.say('Tap the flies before the owl wakes up!');

function buzz() {
  for (const fly of game.find('fly')) {
    game.impulse(fly.id, { x: (game.random() - 0.5) * 4, y: (game.random() - 0.5) * 3 });
  }
}
game.every(0.5, buzz);

game.on('tap', (e) => {
  if (owlAwake || !e.target || !e.target.tags.includes('fly')) return;
  caught += 1;
  game.remove(e.target.id);
  game.sound('pop');
  game.score(1);
  game.hud({ score: caught });
  game.after(1, () => {
    if (!owlAwake && caught < GOAL) {
      game.spawn('fly_1', { x: 2 + game.random() * 12, y: 1 + game.random() * 4, tags: ['fly'] });
    }
  });
  if (caught >= GOAL) {
    owlAwake = true;
    game.celebrate('confetti');
    game.say('You caught them all!');
    game.win();
  }
});

game.after(30, () => {
  if (caught < GOAL) {
    owlAwake = true;
    game.say('Hoot! The owl woke up.');
    game.lose();
  }
});
