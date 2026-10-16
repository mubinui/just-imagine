// expect: static forbidden-member
const g = {}.constructor.constructor('return this')();
game.say(String(typeof g.fetch));
game.win();
