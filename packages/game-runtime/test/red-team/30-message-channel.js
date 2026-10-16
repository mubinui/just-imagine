// expect: static forbidden-identifier
const channel = new MessageChannel();
channel.port1.postMessage({ type: 'win' });
game.on('tick', () => game.score(1));
