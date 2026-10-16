// expect: static forbidden-identifier
const shared = new SharedArrayBuffer(16);
const view = new Int32Array(shared);
Atomics.wait(view, 0, 0, 60000);
game.win();
