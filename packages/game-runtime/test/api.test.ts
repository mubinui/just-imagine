import { describe, it, expect } from 'vitest';
import { GAME_API_VERSION, ALLOWED_GLOBALS, GAME_EVENT_TYPES } from '../src/api';
import { BUDGETS } from '../src/budgets';

describe('Game API constants', () => {
  it('is version 1', () => {
    expect(GAME_API_VERSION).toBe(1);
  });
  it('allows exactly the plain JavaScript globals plus game', () => {
    expect([...ALLOWED_GLOBALS].sort()).toEqual(
      ['Array', 'Boolean', 'JSON', 'Math', 'Number', 'Object', 'String', 'console', 'game'].sort(),
    );
  });
  it('lists the eight event kinds the script can subscribe to', () => {
    expect([...GAME_EVENT_TYPES]).toEqual([
      'tick',
      'collision',
      'tap',
      'drag',
      'flick',
      'dial',
      'variable',
      'timer',
    ]);
  });
});

describe('budgets', () => {
  it('match the spec numbers', () => {
    expect(BUDGETS.maxBodies).toBe(200);
    expect(BUDGETS.maxTimers).toBe(50);
    expect(BUDGETS.handlerMs).toBe(8);
    expect(BUDGETS.aggregateMsPerSecond).toBe(50);
    expect(BUDGETS.maxSourceBytes).toBe(20 * 1024);
  });
});
