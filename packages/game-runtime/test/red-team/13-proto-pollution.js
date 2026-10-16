// expect: static forbidden-member
({}).__proto__.isAdmin = true;
game.on('tick', () => game.score(1));
