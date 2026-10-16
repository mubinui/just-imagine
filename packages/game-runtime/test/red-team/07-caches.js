// expect: static forbidden-identifier
caches
  .open('v1')
  .then((cache) => cache.keys())
  .then(() => game.win());
