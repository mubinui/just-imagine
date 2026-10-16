// expect: static forbidden-identifier
const xhr = new XMLHttpRequest();
xhr.open('GET', 'https://evil.example/');
xhr.send();
game.on('tick', () => game.score(1));
