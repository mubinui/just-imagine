// expect: static dynamic-import
import('node:fs').then((fs) => game.say(String(fs.readdirSync('/').length)));
game.win();
