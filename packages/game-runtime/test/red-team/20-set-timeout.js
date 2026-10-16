// expect: static forbidden-identifier
setTimeout(() => game.win(), 1000);
game.on('tick', () => game.score(1));
