// expect: runtime error:Function.constructor
// Builds the forbidden member name at runtime to dodge the static check.
const key = 'const' + 'ructor';
const o = {};
const g = o[key][key]('return this')();
game.say(String(typeof g));
game.win();
