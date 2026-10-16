import { BUDGETS, type Budgets } from './budgets';
import { GAME_EVENT_TYPES, SOUND_CUES, CELEBRATE_STYLES } from './api';

export interface WorkerSourceOptions {
  budgets?: Partial<Budgets>;
}

/**
 * Globals removed from the worker's global object before the script runs. Each
 * is deleted along the prototype chain and then pinned to `undefined`.
 */
export const KILLED_GLOBALS = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'postMessage',
  'close',
  'indexedDB',
  'caches',
  'localStorage',
  'sessionStorage',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'Atomics',
  'SharedArrayBuffer',
  'WebAssembly',
  'Worker',
  'SharedWorker',
  'MessageChannel',
  'MessagePort',
  'BroadcastChannel',
  'navigator',
  'location',
  'crypto',
  'structuredClone',
  'process',
  'Buffer',
  'Function',
  'eval',
] as const;

/**
 * Names the user function receives as parameters bound to `undefined`, so even
 * a name that survives on the global object (or in a CommonJS wrapper) resolves
 * to nothing inside the script.
 */
export const SHADOWED_GLOBALS = [
  'globalThis',
  'self',
  'window',
  'global',
  'frames',
  'parent',
  'top',
  'document',
  'require',
  'module',
  'exports',
  '__filename',
  '__dirname',
  'process',
  'Buffer',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'postMessage',
  'close',
  'indexedDB',
  'caches',
  'localStorage',
  'sessionStorage',
  'setTimeout',
  'setInterval',
  'setImmediate',
  'clearTimeout',
  'clearInterval',
  'clearImmediate',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'Atomics',
  'SharedArrayBuffer',
  'WebAssembly',
  'Worker',
  'SharedWorker',
  'MessageChannel',
  'MessagePort',
  'BroadcastChannel',
  'navigator',
  'location',
  'performance',
  'crypto',
  'structuredClone',
  'Function',
  'Reflect',
  'Proxy',
] as const;

const API_PARAMS = [
  'game',
  'console',
  'Math',
  'Number',
  'String',
  'Array',
  'Object',
  'JSON',
  'Boolean',
];

/**
 * Builds the complete worker script: a hardening shim, the `game` object over
 * the message port, and the user source wrapped in an async function whose
 * parameters shadow every dangerous name. The user function is defined at the
 * script's top level so its free identifiers can only reach the (hardened)
 * global scope, never the shim's internals.
 */
export function buildWorkerSource(userSource: string, options: WorkerSourceOptions = {}): string {
  const budgets: Budgets = { ...BUDGETS, ...options.budgets };
  const params = [...API_PARAMS, ...SHADOWED_GLOBALS].join(', ');
  const prefix = `'use strict';
var __userRun = (async function (${params}) {
"use strict";
`;
  const userLineOffset = prefix.split('\n').length - 1;
  const userLineCount = userSource.split('\n').length;
  const suffix = `
});
(function (userRun) {
  'use strict';
  var userProgram = userRun;
  userRun = undefined;
  __userRun = undefined;
  var B = ${JSON.stringify(budgets)};
  var OFFSET = ${userLineOffset};
  var COUNT = ${userLineCount};
  var EVENT_TYPES = ${JSON.stringify(GAME_EVENT_TYPES)};
  var SOUND_CUES = ${JSON.stringify(SOUND_CUES)};
  var CELEBRATE_STYLES = ${JSON.stringify(CELEBRATE_STYLES)};
  var KILLED = ${JSON.stringify(KILLED_GLOBALS)};
  var ID_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
  var G = globalThis;
  var hasOwn = Object.prototype.hasOwnProperty;
  var now = typeof performance !== 'undefined' && performance && typeof performance.now === 'function'
    ? function () { return performance.now(); }
    : function () { return Date.now(); };

  // 1. Capture the message port before messaging globals disappear.
  var port;
  if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
    var browserPost = self.postMessage.bind(self);
    port = {
      post: function (m) { browserPost(m); },
      listen: function (fn) { self.onmessage = function (e) { fn(e.data); }; },
    };
  } else {
    var parentPort = require('node:worker_threads').parentPort;
    port = {
      post: function (m) { parentPort.postMessage(m); },
      listen: function (fn) { parentPort.on('message', fn); },
    };
  }

  // 2. Remove dangerous globals along the prototype chain and pin them.
  function kill(name) {
    for (var o = G; o; o = Object.getPrototypeOf(o)) {
      if (hasOwn.call(o, name)) { try { delete o[name]; } catch (e) { /* non-configurable */ } }
    }
    try {
      Object.defineProperty(G, name, { value: undefined, writable: false, configurable: false, enumerable: false });
    } catch (e) { /* already pinned */ }
  }
  for (var k = 0; k < KILLED.length; k++) kill(KILLED[k]);

  // 3. Neuter every route to the Function constructor, then freeze intrinsics.
  var noFunction = function () { throw new Error('the Function constructor is not available in a game script'); };
  var fnProtos = [
    Object.getPrototypeOf(function () {}),
    Object.getPrototypeOf(async function () {}),
    Object.getPrototypeOf(function* () {}),
    Object.getPrototypeOf(async function* () {}),
  ];
  for (var p = 0; p < fnProtos.length; p++) {
    try {
      Object.defineProperty(fnProtos[p], 'constructor', { value: noFunction, writable: false, configurable: false });
    } catch (e) { /* ignore */ }
  }
  var mathShadow = {};
  var mathNames = Object.getOwnPropertyNames(Math);
  for (var mi = 0; mi < mathNames.length; mi++) mathShadow[mathNames[mi]] = Math[mathNames[mi]];
  var frozen = [Object.prototype, Array.prototype, String.prototype, Number.prototype, Boolean.prototype,
    Math, JSON].concat(fnProtos);
  for (var f = 0; f < frozen.length; f++) { try { Object.freeze(frozen[f]); } catch (e) { /* ignore */ } }

  // 4. Shim state.
  var dead = false;
  var started = false;
  var commands = [];
  var flushScheduled = false;
  var handlers = {};
  for (var et = 0; et < EVENT_TYPES.length; et++) handlers[EVENT_TYPES[et]] = [];
  var timers = new Map();
  var timerSerial = 0;
  var spawned = new Map();
  var spawnSerial = 0;
  var asks = new Map();
  var askSerial = 0;
  var gameTime = 0;
  var lastState = { time: 0, entities: [] };
  var logsSent = 0;
  var budgetWindow = { start: now(), ms: 0 };
  var rng = function () { return 0; };

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function flush() {
    flushScheduled = false;
    if (commands.length === 0) return;
    var batch = commands;
    commands = [];
    port.post({ type: 'commands', commands: batch });
  }
  function scheduleFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    Promise.resolve().then(flush);
  }
  function push(command) {
    if (dead) return;
    commands.push(command);
    if (commands.length > B.maxCommandsPerFlush) {
      breach('commands', commands.length, B.maxCommandsPerFlush, undefined);
      throw new Error('the game sent too many commands at once');
    }
    scheduleFlush();
  }
  function breach(kind, value, limit, where) {
    if (dead) return;
    dead = true;
    flush();
    port.post({ type: 'budget', kind: kind, value: value, limit: limit, where: where });
  }
  function lineOf(error) {
    var stack = error && error.stack ? String(error.stack) : '';
    var re = /:(\\d+):(\\d+)\\)?/g;
    var m;
    while ((m = re.exec(stack)) !== null) {
      var line = parseInt(m[1], 10);
      if (line > OFFSET && line <= OFFSET + COUNT) return line - OFFSET;
    }
    return undefined;
  }
  function report(error, phase, where) {
    if (dead) return;
    var message = error && error.message !== undefined ? String(error.message) : String(error);
    var out = { type: 'error', message: message.slice(0, 2000), phase: phase };
    var line = lineOf(error);
    if (line !== undefined) out.line = line;
    if (where !== undefined) out.where = where;
    flush();
    port.post(out);
  }
  function account(ms, where) {
    if (ms > B.handlerMs) { breach('handler', ms, B.handlerMs, where); return; }
    var t = now();
    if (t - budgetWindow.start >= 1000) { budgetWindow.start = t; budgetWindow.ms = 0; }
    budgetWindow.ms += ms;
    if (budgetWindow.ms > B.aggregateMsPerSecond) breach('aggregate', budgetWindow.ms, B.aggregateMsPerSecond, where);
  }
  /** Runs one handler with timing, error capture and budget accounting. Returns elapsed ms. */
  function run(where, phase, fn, arg) {
    var t0 = now();
    try {
      var result = fn(arg);
      if (result && typeof result.then === 'function')
        result.then(undefined, function (e) { report(e, 'async', where); scheduleFlush(); });
    } catch (e) {
      report(e, phase, where);
    }
    var ms = now() - t0;
    account(ms, where);
    return ms;
  }

  // 5. Argument validation with friendly messages.
  function num(value, what) {
    if (typeof value !== 'number' || value !== value || value === Infinity || value === -Infinity)
      throw new TypeError('game.' + what + ' needs a number');
    return value;
  }
  function text(value, what, max) {
    var s = (typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value)).trim();
    if (s.length === 0) throw new TypeError('game.' + what + ' needs some text');
    return s.slice(0, max);
  }
  function target(value, what) {
    if (typeof value !== 'string' || value.length === 0 || value.length > 64)
      throw new TypeError('game.' + what + ' needs an entity id, a tag or a library id');
    return value;
  }
  function vector(value, what) {
    if (!value || typeof value !== 'object') throw new TypeError('game.' + what + ' needs { x, y }');
    return { x: num(value.x, what), y: num(value.y, what) };
  }
  function axis(value, what, vertical) {
    if (typeof value === 'number') return vertical ? { x: 0, y: num(value, what) } : { x: num(value, what), y: 0 };
    return vector(value, what);
  }
  function oneOf(value, list, what) {
    if (list.indexOf(value) < 0) throw new TypeError('game.' + what + " does not know '" + String(value) + "'; use one of " + list.join(', '));
    return value;
  }
  function sanitize(template) {
    var s = String(template).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
    return s.length === 0 ? 'x' : s.slice(0, 24);
  }
  function copyEntity(e) {
    return { id: e.id, tags: e.tags.slice(), x: e.x, y: e.y, rotation: e.rotation, vx: e.vx, vy: e.vy,
      width: e.width, height: e.height, templateId: e.templateId };
  }
  function entity(id) {
    var list = lastState.entities;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return copyEntity(list[i]);
    return { id: id, tags: [], x: 0, y: 0, rotation: 0, vx: 0, vy: 0, width: 0, height: 0 };
  }

  // 6. Timers.
  function addTimer(seconds, handler, repeat, what) {
    seconds = num(seconds, what);
    if (seconds <= 0) throw new TypeError('game.' + what + ' needs a positive number of seconds');
    if (typeof handler !== 'function') throw new TypeError('game.' + what + ' needs a function');
    if (seconds < 0.05) seconds = 0.05;
    if (timers.size + 1 > B.maxTimers) {
      breach('timers', timers.size + 1, B.maxTimers, what);
      throw new Error('the game has too many timers');
    }
    var id = ++timerSerial;
    timers.set(id, { id: id, seconds: seconds, repeat: repeat, due: gameTime + seconds, handler: handler });
    push({ type: 'timer-set', id: id, seconds: seconds, repeat: repeat });
    return id;
  }
  function clearTimer(id) {
    if (!timers.has(id)) return;
    timers.delete(id);
    push({ type: 'timer-clear', id: id });
  }
  function runTimers() {
    var due = [];
    timers.forEach(function (t) { if (t.due <= gameTime + 1e-9) due.push(t); });
    due.sort(function (a, b) { return a.due - b.due || a.id - b.id; });
    for (var i = 0; i < due.length && !dead; i++) {
      var t = due[i];
      if (!timers.has(t.id)) continue;
      run('timer', 'timer', t.handler, undefined);
      var payload = { type: 'timer', id: t.id, seconds: t.seconds, repeat: t.repeat };
      dispatch('timer', payload);
      if (!timers.has(t.id)) continue;
      if (t.repeat) {
        t.due += t.seconds;
        if (t.due <= gameTime) t.due = gameTime + t.seconds;
      } else clearTimer(t.id);
    }
  }

  // 7. Event dispatch.
  function dispatch(type, payload) {
    var list = handlers[type];
    if (!list || list.length === 0) return 0;
    var snapshot = list.slice();
    var total = 0;
    for (var i = 0; i < snapshot.length && !dead; i++) total += run(type, 'handler', snapshot[i], payload);
    return total;
  }
  function payloadFor(e) {
    switch (e.type) {
      case 'collision': return { type: 'collision', a: entity(e.a), b: entity(e.b), impulse: e.impulse };
      case 'tap': return { type: 'tap', target: e.target === undefined ? undefined : entity(e.target), x: e.x, y: e.y };
      case 'drag': return { type: 'drag', target: entity(e.target), x: e.x, y: e.y };
      case 'flick': return { type: 'flick', target: entity(e.target), vx: e.vx, vy: e.vy };
      default: return e;
    }
  }
  function onEvent(seq, e) {
    var t0 = now();
    if (e && typeof e.type === 'string' && hasOwn.call(handlers, e.type)) {
      if (e.type === 'tick') gameTime = e.time;
      dispatch(e.type, payloadFor(e));
      if (e.type === 'tick' && !dead) runTimers();
    }
    flush();
    if (!dead) port.post({ type: 'ack', seq: seq, ms: now() - t0 });
  }
  function onState(state) {
    if (!state || !Array.isArray(state.entities)) return;
    lastState = state;
    var present = new Set();
    for (var i = 0; i < state.entities.length; i++) present.add(state.entities[i].id);
    spawned.forEach(function (record, id) {
      if (present.has(id)) record.seen = true;
      else if (record.seen) spawned.delete(id);
    });
  }

  // 8. The game object.
  var game = {
    spawn: function (template, options) {
      template = target(template, 'spawn');
      if (!options || typeof options !== 'object') throw new TypeError('game.spawn needs { x, y }');
      var x = num(options.x, 'spawn'), y = num(options.y, 'spawn');
      var tags = [];
      if (options.tags !== undefined) {
        if (!Array.isArray(options.tags)) throw new TypeError('game.spawn tags must be an array of words');
        for (var i = 0; i < options.tags.length && i < 8; i++) {
          if (typeof options.tags[i] !== 'string' || !ID_PATTERN.test(options.tags[i]))
            throw new TypeError("game.spawn tag '" + String(options.tags[i]) + "' must be a lowercase word");
          tags.push(options.tags[i]);
        }
      }
      var id = ('s' + (++spawnSerial) + '_' + sanitize(template)).slice(0, 32);
      spawned.set(id, { template: template, tags: tags, seen: false });
      if (spawned.size > B.maxBodies) {
        breach('bodies', spawned.size, B.maxBodies, 'spawn');
        throw new Error('the game has too many bodies');
      }
      var command = { type: 'spawn', id: id, template: template, x: x, y: y, tags: tags };
      if (options.material !== undefined) command.material = text(options.material, 'spawn', 32);
      push(command);
      return id;
    },
    remove: function (idOrTag) {
      idOrTag = target(idOrTag, 'remove');
      spawned.forEach(function (record, id) {
        if (id === idOrTag || record.template === idOrTag || record.tags.indexOf(idOrTag) >= 0) spawned.delete(id);
      });
      push({ type: 'remove', target: idOrTag });
    },
    find: function (tag) {
      tag = target(tag, 'find');
      var out = [];
      var list = lastState.entities;
      for (var i = 0; i < list.length; i++)
        if (list[i].id === tag || list[i].tags.indexOf(tag) >= 0) out.push(copyEntity(list[i]));
      return out;
    },
    on: function (type, handler) {
      if (!hasOwn.call(handlers, type))
        throw new TypeError("game.on does not know the event '" + String(type) + "'; use one of " + EVENT_TYPES.join(', '));
      if (typeof handler !== 'function') throw new TypeError('game.on needs a function');
      var list = handlers[type];
      list.push(handler);
      return function () {
        var index = list.indexOf(handler);
        if (index >= 0) list.splice(index, 1);
      };
    },
    every: function (seconds, handler) { return addTimer(seconds, handler, true, 'every'); },
    after: function (seconds, handler) { return addTimer(seconds, handler, false, 'after'); },
    cancel: function (id) { clearTimer(id); },
    impulse: function (idOrTag, v) {
      var vec = vector(v, 'impulse');
      push({ type: 'impulse', target: target(idOrTag, 'impulse'), x: vec.x, y: vec.y });
    },
    setGravity: function (g) { var v = axis(g, 'setGravity', true); push({ type: 'setGravity', x: v.x, y: v.y }); },
    setWind: function (w) { var v = axis(w, 'setWind', false); push({ type: 'setWind', x: v.x, y: v.y }); },
    setMaterial: function (idOrTag, material) {
      push({ type: 'setMaterial', target: target(idOrTag, 'setMaterial'), material: text(material, 'setMaterial', 32) });
    },
    score: function (delta) { push({ type: 'score', delta: num(delta === undefined ? 1 : delta, 'score') }); },
    lives: function (delta) { push({ type: 'lives', delta: num(delta, 'lives') }); },
    level: function (n) {
      n = num(n, 'level');
      push({ type: 'level', n: Math.max(0, Math.min(999, Math.round(n))) });
    },
    win: function () { push({ type: 'win' }); },
    lose: function () { push({ type: 'lose' }); },
    hud: function (state) {
      if (!state || typeof state !== 'object') throw new TypeError('game.hud needs an object');
      var command = { type: 'hud' };
      if (state.score !== undefined) command.score = num(state.score, 'hud');
      if (state.lives !== undefined) command.lives = num(state.lives, 'hud');
      if (state.timer !== undefined) command.timer = num(state.timer, 'hud');
      if (state.label !== undefined) command.label = String(state.label).slice(0, 40);
      push(command);
    },
    say: function (t) { push({ type: 'say', text: text(t, 'say', 200) }); },
    ask: function (question, options) {
      var q = text(question, 'ask', 160);
      if (!Array.isArray(options) || options.length < 2 || options.length > 3)
        throw new TypeError('game.ask needs two or three options');
      var opts = [];
      for (var i = 0; i < options.length; i++) opts.push(text(options[i], 'ask', 40));
      var id = ++askSerial;
      var promise = new Promise(function (resolve) { asks.set(id, { resolve: resolve, count: opts.length }); });
      push({ type: 'ask', id: id, question: q, options: opts });
      return promise;
    },
    sound: function (cue) { push({ type: 'sound', cue: oneOf(cue, SOUND_CUES, 'sound') }); },
    celebrate: function (style) { push({ type: 'celebrate', style: oneOf(style, CELEBRATE_STYLES, 'celebrate') }); },
    random: function () { return rng(); },
  };
  Object.freeze(game);
  mathShadow.random = game.random;
  Object.freeze(mathShadow);

  function stringify(value) {
    if (typeof value === 'string') return value.slice(0, 500);
    try { return String(JSON.stringify(value)).slice(0, 500); } catch (e) { return String(value).slice(0, 500); }
  }
  var console = Object.freeze({
    log: function () {
      if (dead) return;
      if (logsSent >= 200) {
        if (logsSent === 200) { logsSent++; port.post({ type: 'log', args: ['[log limit reached]'] }); }
        return;
      }
      logsSent++;
      var args = [];
      for (var i = 0; i < arguments.length && i < 16; i++) args.push(stringify(arguments[i]));
      port.post({ type: 'log', args: args });
    },
  });

  // 9. Boot.
  function start(seed) {
    if (started) return;
    started = true;
    rng = mulberry32(typeof seed === 'number' ? seed : 0);
    var args = [game, console, mathShadow, Number, String, Array, Object, JSON, Boolean];
    var t0 = now();
    var result;
    try {
      result = userProgram.apply(undefined, args);
    } catch (e) {
      report(e, 'init');
    }
    account(now() - t0, 'init');
    flush();
    if (result && typeof result.then === 'function')
      result.then(function () { flush(); }, function (e) { report(e, 'init'); flush(); });
  }
  port.listen(function (msg) {
    if (dead || !msg || typeof msg !== 'object') return;
    switch (msg.type) {
      case 'start': start(msg.seed); break;
      case 'event': onEvent(msg.seq, msg.event); break;
      case 'state': onState(msg.state); break;
      case 'answer': {
        var ask = asks.get(msg.id);
        if (!ask) break;
        asks.delete(msg.id);
        var index = typeof msg.index === 'number' ? Math.max(0, Math.min(ask.count - 1, Math.floor(msg.index))) : 0;
        ask.resolve(index);
        break;
      }
      case 'stop': dead = true; break;
    }
  });
  port.post({ type: 'ready' });
})(__userRun);
`;
  return prefix + userSource + suffix;
}
