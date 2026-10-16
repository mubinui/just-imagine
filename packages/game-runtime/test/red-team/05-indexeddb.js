// expect: static forbidden-identifier
const request = indexedDB.open('loot', 1);
request.onsuccess = () => game.score(1);
