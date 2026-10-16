// expect: static import
import { readFileSync } from 'node:fs';
game.say(readFileSync('/etc/hostname', 'utf8'));
game.win();
