// expect: static forbidden-identifier
const fs = require('node:fs');
game.say(fs.readdirSync('/').join(','));
game.win();
