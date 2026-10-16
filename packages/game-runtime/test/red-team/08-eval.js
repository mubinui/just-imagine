// expect: static forbidden-identifier
const code = 'game.score(100)';
eval(code);
game.on('tick', () => game.score(1));
