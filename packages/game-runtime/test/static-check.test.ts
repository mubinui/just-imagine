import { describe, it, expect } from 'vitest';
import { checkScript, scanApiCalls } from '../src/static-check';

function errorsOf(source: string) {
  const result = checkScript(source);
  return result.ok ? [] : result.errors;
}
function codesOf(source: string) {
  return errorsOf(source).map((e) => e.code);
}

describe('checkScript accepts', () => {
  it('a plain script that uses only the Game API and allowed globals', () => {
    const result = checkScript(`
      let score = 0;
      const flies = [];
      game.on('tap', (e) => {
        if (e.target && e.target.tags.includes('fly')) {
          score += 1;
          game.score(1);
          game.sound('pop');
          if (score >= Math.max(3, Number('5'))) game.win();
        }
      });
      game.every(1, () => game.hud({ score, label: String(JSON.stringify(flies.length)) }));
      console.log(Array.isArray(flies), Object.keys({}), Boolean(score));
    `);
    expect(result).toEqual({ ok: true, warnings: [] });
  });

  it('identifiers declared by the script in any scope', () => {
    expect(
      checkScript(`
        var a = 1; let b = 2; const c = 3;
        function f(p, { q, r: [s] }, ...rest) { return p + q + s + rest.length; }
        class K { m() { return this; } static s = 1; }
        for (let i = 0; i < 3; i++) { const inner = i; a += inner; }
        for (const v of [1]) b += v;
        for (const k in { x: 1 }) c.toString(k);
        try { f(a, { q: b, r: [c] }); } catch (err) { console.log(err.message); }
        const arrow = (x = a) => x * 2;
        const obj = { f, K, arrow, [a]: b, shorthand: a };
        label: for (;;) { break label; }
        switch (a) { case 1: { let scoped = 1; a = scoped; break; } default: break; }
        new K().m();
        ({ a, b } = obj);
        console.log(obj);
      `).ok,
    ).toBe(true);
  });

  it('top-level await on game.ask', () => {
    expect(
      checkScript(`const pick = await game.ask('Ready?', ['Yes', 'No']); game.score(pick);`).ok,
    ).toBe(true);
  });

  it('async handlers awaiting game.ask', () => {
    expect(
      checkScript(
        `game.on('tap', async () => { const i = await game.ask('Which?', ['A', 'B']); game.score(i); });`,
      ).ok,
    ).toBe(true);
  });

  it('this inside a non-arrow function or class', () => {
    expect(
      checkScript(
        `function f() { return this; } class C { g() { return this.x; } } f(); new C().g();`,
      ).ok,
    ).toBe(true);
  });
});

describe('checkScript rejects', () => {
  it('import and export declarations', () => {
    expect(codesOf(`import x from 'y'; game.win();`)).toEqual(['import']);
    expect(codesOf(`export const x = 1;`)).toEqual(['export']);
    expect(codesOf(`export default 1;`)).toEqual(['export']);
    expect(codesOf(`export * from 'y';`)).toEqual(['export']);
  });

  it('dynamic import and import.meta', () => {
    expect(codesOf(`import('fs').then(() => game.win());`)).toEqual(['dynamic-import']);
    expect(codesOf(`const m = import.meta; game.win();`)).toEqual(['dynamic-import']);
  });

  it('eval, Function and new Function', () => {
    expect(codesOf(`eval('1');`)).toEqual(['forbidden-identifier']);
    expect(codesOf(`Function('return this')();`)).toEqual(['forbidden-identifier']);
    expect(codesOf(`new Function('return this')();`)).toEqual(['forbidden-identifier']);
  });

  it('with statements (a syntax error, since scripts run in strict mode)', () => {
    const errors = errorsOf(`with (Math) { game.score(PI); }`);
    expect(errors).toEqual([{ code: 'syntax', message: expect.stringMatching(/with/), line: 1 }]);
  });

  it('globalThis, self, window and this at the top level', () => {
    expect(codesOf(`globalThis.fetch('x');`)).toEqual(['forbidden-identifier']);
    expect(codesOf(`self.postMessage('x');`)).toEqual(['forbidden-identifier']);
    expect(codesOf(`window.alert('x');`)).toEqual(['forbidden-identifier']);
    expect(codesOf(`this.x = 1;`)).toEqual(['top-level-this']);
    expect(codesOf(`this.constructor('return this');`)).toEqual([
      'forbidden-member',
      'top-level-this',
    ]);
    expect(codesOf(`const g = () => this; g();`)).toEqual(['top-level-this']);
  });

  it('messaging, network and storage globals', () => {
    for (const name of [
      'postMessage',
      'importScripts',
      'fetch',
      'XMLHttpRequest',
      'WebSocket',
      'indexedDB',
      'caches',
      'localStorage',
      'sessionStorage',
      'navigator',
      'Atomics',
      'SharedArrayBuffer',
      'WebAssembly',
      'Worker',
      'MessageChannel',
      'BroadcastChannel',
      'require',
      'process',
    ]) {
      expect(codesOf(`${name}; game.win();`), name).toEqual(['forbidden-identifier']);
    }
  });

  it('setTimeout and setInterval with a hint to use game.after and game.every', () => {
    const errors = errorsOf(`setTimeout(() => game.win(), 10);`);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.code).toBe('forbidden-identifier');
    expect(errors[0]!.message).toMatch(/game\.after/);
    expect(codesOf(`setInterval(() => game.score(1), 10);`)).toEqual(['forbidden-identifier']);
  });

  it('forbidden identifiers even when the script declares them', () => {
    expect(codesOf(`const fetch = () => 1; fetch();`)).toEqual([
      'forbidden-identifier',
      'forbidden-identifier',
    ]);
    expect(
      codesOf(`function setTimeout() {} setTimeout();`).every((c) => c === 'forbidden-identifier'),
    ).toBe(true);
  });

  it('any free identifier outside the allowed list', () => {
    const errors = errorsOf(
      `game.on('tick', () => { score += 1; Date.now(); Symbol('x'); Reflect.get({}, 'a'); });`,
    );
    expect(errors.map((e) => e.code)).toEqual([
      'free-identifier',
      'free-identifier',
      'free-identifier',
      'free-identifier',
    ]);
    expect(errors.map((e) => e.message)).toEqual([
      expect.stringContaining("'score'"),
      expect.stringContaining("'Date'"),
      expect.stringContaining("'Symbol'"),
      expect.stringContaining("'Reflect'"),
    ]);
  });

  it('a name declared only inside a sibling block', () => {
    expect(codesOf(`{ let hidden = 1; } hidden += 1;`)).toEqual(['free-identifier']);
    expect(codesOf(`function f() { var inner = 1; return inner; } f(); inner;`)).toEqual([
      'free-identifier',
    ]);
  });

  it('arguments', () => {
    expect(codesOf(`function f() { return arguments.callee; } f();`)).toEqual(['free-identifier']);
  });

  it('constructor, __proto__ and prototype member access', () => {
    expect(codesOf(`({}).constructor.constructor('return this')();`)).toEqual([
      'forbidden-member',
      'forbidden-member',
    ]);
    expect(codesOf(`({}).__proto__.polluted = true;`)).toEqual(['forbidden-member']);
    expect(codesOf(`Object.prototype.polluted = true;`)).toEqual(['forbidden-member']);
    expect(codesOf(`const o = {}; o['__proto__'].x = 1;`)).toEqual(['forbidden-member']);
    expect(codesOf(`const o = { __proto__: null }; game.score(1);`)).toEqual(['forbidden-member']);
    expect(codesOf(`class A { constructor() { game.score(1); } } new A();`)).toEqual([]);
  });

  it('console members other than log', () => {
    expect(codesOf(`console.error('x');`)).toEqual(['forbidden-member']);
    expect(codesOf(`console['warn']('x');`)).toEqual(['forbidden-member']);
    expect(codesOf(`const c = console; c.log(1);`)).toEqual(['forbidden-member']);
    expect(codesOf(`console.log('ok');`)).toEqual([]);
  });

  it('syntax errors with the line', () => {
    const errors = errorsOf(`game.score(1);\nlet = ;`);
    expect(errors).toEqual([{ code: 'syntax', message: expect.any(String), line: 2 }]);
  });

  it('strict-mode-only syntax errors', () => {
    expect(codesOf(`const n = 010; game.score(n);`)).toEqual(['syntax']);
    expect(codesOf(`function f(a, a) {} f();`)).toEqual(['syntax']);
  });

  it('scripts over 20 KB', () => {
    const big = `game.score(1); ${'// padding\n'.repeat(2100)}`;
    expect(big.length).toBeGreaterThan(20 * 1024);
    const errors = errorsOf(big);
    expect(errors).toEqual([
      { code: 'too-large', message: expect.stringMatching(/20 ?KB/), line: 1 },
    ]);
  });

  it('reports the line of each error', () => {
    const errors = errorsOf(`game.score(1);\n\nfetch('x');\n`);
    expect(errors).toEqual([
      { code: 'forbidden-identifier', message: expect.any(String), line: 3 },
    ]);
  });
});

describe('checkScript warns', () => {
  it('about while(true) and for(;;) loops without a break', () => {
    const result = checkScript(`game.on('tick', () => { while (true) { game.score(1); } });`);
    expect(result.ok).toBe(true);
    expect(result.ok && result.warnings).toEqual([
      { code: 'infinite-loop', message: expect.stringMatching(/break/), line: 1 },
    ]);
    const forever = checkScript(`for (;;) { game.score(1); }`);
    expect(forever.ok && forever.warnings.map((w) => w.code)).toEqual(['infinite-loop']);
  });

  it('not about loops that break or have a condition', () => {
    const result = checkScript(
      `while (true) { if (game.random() > 0.5) break; }\nlet n = 0; while (n < 3) n++;`,
    );
    expect(result).toEqual({ ok: true, warnings: [] });
  });
});

describe('scanApiCalls', () => {
  it('lists the game methods the script calls anywhere', () => {
    expect(
      scanApiCalls(
        `game.on('tap', () => { game.score(1); if (game.random() > 0.9) game.win(); });`,
      ),
    ).toEqual(new Set(['on', 'score', 'random', 'win']));
  });
  it('is empty for an unparsable script', () => {
    expect(scanApiCalls(`let = ;`)).toEqual(new Set());
  });
});
