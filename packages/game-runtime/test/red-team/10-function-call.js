// expect: static forbidden-identifier
const g = Function('return this')();
game.say(String(typeof g));
game.win();
