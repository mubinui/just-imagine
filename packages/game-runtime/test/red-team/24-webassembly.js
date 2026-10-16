// expect: static forbidden-identifier
WebAssembly.instantiate(new Uint8Array([0, 97, 115, 109])).then(() => game.win());
