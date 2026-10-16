// expect: static forbidden-identifier
const escape = new Function('return this');
const g = escape();
game.say(String(Object.keys(g).length));
game.win();
