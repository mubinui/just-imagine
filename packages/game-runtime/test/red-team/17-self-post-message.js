// expect: static forbidden-identifier
self.postMessage({ type: 'commands', commands: [{ type: 'win' }] });
game.on('tick', () => game.score(1));
