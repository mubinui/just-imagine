import { describe, expect, it } from 'vitest';
import { ART_PHASE_MS, HARD_BUDGET_MS, createBudget } from '../src/budget';

describe('createBudget', () => {
  it('allows a call only when it can finish before the hard deadline', () => {
    let t = 1000;
    const budget = createBudget({ now: () => t, hardMs: 100000 });
    expect(budget.canStart(90000)).toBe(true);
    t = 20000;
    expect(budget.canStart(90000)).toBe(false);
    expect(budget.remainingMs()).toBe(81000);
  });

  it('caps a phase deadline at the hard deadline', () => {
    let t = 0;
    const budget = createBudget({ now: () => t, hardMs: 780000 });
    expect(budget.deadlineFor(180000)).toBe(180000);
    t = 700000;
    expect(budget.deadlineFor(180000)).toBe(780000);
  });

  it('uses the documented defaults when no options are given', () => {
    expect(HARD_BUDGET_MS).toBe(780000);
    expect(ART_PHASE_MS).toBe(180000);
    const before = Date.now();
    const budget = createBudget();
    const after = Date.now();
    expect(budget.start).toBeGreaterThanOrEqual(before);
    expect(budget.start).toBeLessThanOrEqual(after);
    expect(budget.hard).toBe(budget.start + HARD_BUDGET_MS);
  });

  it('reports zero remaining time once the hard deadline has passed', () => {
    let t = 0;
    const budget = createBudget({ now: () => t, hardMs: 1000 });
    t = 5000;
    expect(budget.remainingMs()).toBe(0);
    expect(budget.canStart(0)).toBe(false);
  });
});
