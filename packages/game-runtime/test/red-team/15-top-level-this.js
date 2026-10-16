// expect: static top-level-this
const scope = this;
game.say(String(typeof scope));
game.win();
