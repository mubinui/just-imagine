// expect: static free-identifier
const trap = new Proxy({}, { get: (t, k) => Reflect.get(t, k) });
game.say(String(trap.x));
game.win();
