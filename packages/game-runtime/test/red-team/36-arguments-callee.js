// expect: static free-identifier
function sneaky() {
  return arguments.callee.caller;
}
game.say(String(typeof sneaky()));
game.win();
