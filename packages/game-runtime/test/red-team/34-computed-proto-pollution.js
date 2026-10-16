// expect: runtime error:extensible|error:read.only
const key = '__pro' + 'to__';
const o = {};
o[key].isAdmin = true;
game.on('tick', () => game.score(1));
