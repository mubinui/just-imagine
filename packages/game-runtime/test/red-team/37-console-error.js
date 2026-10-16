// expect: static forbidden-member
console.error('leaking', JSON.stringify(game));
game.on('tick', () => game.score(1));
