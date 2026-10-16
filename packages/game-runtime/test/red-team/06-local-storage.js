// expect: static forbidden-identifier
localStorage.setItem('child', JSON.stringify({ tapped: true }));
game.on('tap', () => game.score(1));
